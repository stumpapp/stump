use std::{
	fmt::{Display, Formatter},
	path::PathBuf,
	sync::Arc,
	time::Instant,
};

use criterion::{criterion_group, BenchmarkId, Criterion};
use stump_core::{
	config::StumpConfig,
	db::{
		create_client_with_url,
		entity::{Library, LibraryOptions},
	},
	filesystem::scanner::_LibraryScanJob,
	job_::{Executor, Job, WorkerCtx},
	prisma::{library, library_options, PrismaClient},
};
use tempfile::{Builder as TempDirBuilder, TempDir};
use tokio::runtime::Builder;
use uuid::Uuid;

#[derive(Debug)]
struct BenchmarkSize {
	series_count: usize,
	media_per_series: usize,
}

impl Display for BenchmarkSize {
	fn fmt(&self, f: &mut Formatter) -> std::fmt::Result {
		write!(
			f,
			"{} series with {} media each",
			self.series_count, self.media_per_series
		)
	}
}

fn full_scan(c: &mut Criterion) {
	static SIZES: [BenchmarkSize; 4] = [
		BenchmarkSize {
			series_count: 10,
			media_per_series: 10,
		},
		BenchmarkSize {
			series_count: 100,
			media_per_series: 10,
		},
		BenchmarkSize {
			series_count: 100,
			media_per_series: 100,
		},
		BenchmarkSize {
			series_count: 100,
			media_per_series: 1000,
		},
	];

	let mut group = c.benchmark_group("full_scan");
	for size in SIZES.iter() {
		group.bench_with_input(BenchmarkId::from_parameter(size), size, |b, size| {
			let rt = Builder::new_multi_thread().enable_all().build().unwrap();
			b.to_async(rt).iter_custom(|_| async {
				let Setup {
					library,
					tempdirs,
					test_ctx,
				} = setup_test(size.series_count, size.media_per_series)
					.await
					.expect("Failed to set up test");

				let client = test_ctx.worker_ctx.db.clone();

				println!("Starting benchmark for {}", size);
				let start = Instant::now();
				scan_new_library(test_ctx).await;
				let elapsed = start.elapsed();

				let _ = safe_validate_counts(
					&client,
					size.series_count,
					size.media_per_series,
				)
				.await;

				clean_up(&client, library, tempdirs).await;

				elapsed
			});
		});
	}
}

criterion_group!(benches, full_scan);

struct TestCtx {
	job: Job<_LibraryScanJob>,
	worker_ctx: WorkerCtx,
}

struct Setup {
	test_ctx: TestCtx,
	library: Library,
	tempdirs: Vec<TempDir>,
}

async fn create_test_library(
	series_count: usize,
	books_per_series: usize,
) -> Result<(PrismaClient, Library, Vec<TempDir>), Box<dyn std::error::Error>> {
	let client = create_client_with_url(&format!(
		"file:{}/prisma/dev.db",
		env!("CARGO_MANIFEST_DIR")
	))
	.await;

	let deleted_libraries = client
		.library()
		.delete_many(vec![])
		.exec()
		.await
		.expect("Failed to delete libraries before bench");
	tracing::debug!(?deleted_libraries, "Deleted libraries");

	let library_temp_dir = TempDirBuilder::new().prefix("ROOT").tempdir()?;
	let library_temp_dir_path = library_temp_dir.path().to_str().unwrap().to_string();

	let library_options = client.library_options().create(vec![]).exec().await?;

	let id = Uuid::new_v4().to_string();
	let library = client
		.library()
		.create(
			id.clone(),
			library_temp_dir_path.clone(),
			library_options::id::equals(library_options.id.clone()),
			vec![library::id::set(id.clone())],
		)
		.exec()
		.await?;

	let library_options = client
		.library_options()
		.update(
			library_options::id::equals(library_options.id),
			vec![
				library_options::library::connect(library::id::equals(
					library.id.clone(),
				)),
				library_options::library_id::set(Some(library.id.clone())),
			],
		)
		.exec()
		.await?;

	let data_dir = PathBuf::from(format!("{}/benches/data", env!("CARGO_MANIFEST_DIR")));

	let zip_path = data_dir.join("book.zip");
	let epub_path = data_dir.join("book.epub");
	let rar_path = data_dir.join("book.rar");

	let mut temp_dirs = vec![library_temp_dir];
	for series_idx in 0..series_count {
		let series_temp_dir = TempDirBuilder::new()
			.prefix(&format!("series_{}", series_idx))
			.tempdir_in(&library_temp_dir_path)?;

		for book_idx in 0..books_per_series {
			let book_path = match book_idx % 3 {
				0 => zip_path.as_path(),
				1 => epub_path.as_path(),
				_ => rar_path.as_path(),
			};
			let book_file_name_with_ext = format!(
				"{}_{}",
				book_idx,
				book_path.file_name().unwrap().to_str().unwrap(),
			);
			let book_temp_file_expected_path =
				series_temp_dir.path().join(book_file_name_with_ext);

			std::fs::copy(book_path, &book_temp_file_expected_path)?;
		}

		temp_dirs.push(series_temp_dir);
	}

	tracing::info!("Library created!");

	let library = Library {
		library_options: LibraryOptions::from(library_options),
		..Library::from(library)
	};

	Ok((client, library, temp_dirs))
}

async fn setup_test(
	series_count: usize,
	books_per_series: usize,
) -> Result<Setup, Box<dyn std::error::Error>> {
	let (client, library, tempdirs) =
		create_test_library(series_count, books_per_series).await?;
	let job = Job::new(_LibraryScanJob {
		id: library.id.clone(),
		path: library.path.clone(),
		options: Some(library.library_options.clone()),
	});

	let job_id = Uuid::new_v4().to_string();
	let _db_job = client
		.job()
		.create(job_id.clone(), job.name().to_string(), vec![])
		.exec()
		.await?;

	let config_dir = format!("{}/benches/config", env!("CARGO_MANIFEST_DIR"));
	let config = StumpConfig::new(config_dir);
	let worker_ctx = WorkerCtx {
		db: Arc::new(client),
		config: Arc::new(config),
		job_id,
		event_sender: async_channel::unbounded().0,
		command_receiver: async_channel::unbounded().1,
	};
	Ok(Setup {
		test_ctx: TestCtx {
			job: *job,
			worker_ctx,
		},
		library,
		tempdirs,
	})
}

async fn safe_validate_counts(
	client: &PrismaClient,
	series_count: usize,
	books_per_series: usize,
) -> bool {
	let mut passed = true;

	let actual_series_count = client
		.series()
		.count(vec![])
		.exec()
		.await
		.expect("Failed to count series");

	if actual_series_count != series_count as i64 {
		println!(
			"Series count mismatch (actual vs expected): {} != {}",
			actual_series_count, series_count
		);
		passed = false;
	}

	let actual_media_count = client
		.media()
		.count(vec![])
		.exec()
		.await
		.expect("Failed to count media");

	if actual_media_count != (series_count * books_per_series) as i64 {
		println!(
			"Media count mismatch (actual vs expected): {} != {}",
			actual_media_count,
			series_count * books_per_series
		);
		passed = false;
	}

	passed
}

async fn clean_up(client: &PrismaClient, library: Library, tempdirs: Vec<TempDir>) {
	let deleted_library = client
		.library()
		.delete(library::id::equals(library.id))
		.exec()
		.await
		.expect("Failed to delete library");

	tracing::debug!(?deleted_library, "Deleted library");

	for tempdir in tempdirs {
		let _ = tempdir.close();
	}
}

async fn scan_new_library(test_ctx: TestCtx) {
	let TestCtx {
		mut job,
		worker_ctx,
	} = test_ctx;

	let result = job.run(worker_ctx).await;
	println!("Job result: {:?}", result);
}

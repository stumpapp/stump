use std::{
	fmt::{Display, Formatter},
	path::PathBuf,
	sync::Arc,
	time::Instant,
};

use criterion::{criterion_group, BenchmarkId, Criterion};
use models::{
	entity::{job, library, library_config, media, series},
	shared::enums::{
		FileStatus, LibraryPattern, ReadingDirection, ReadingImageScaleFit, ReadingMode,
	},
};
use sea_orm::prelude::*;
use sea_orm::{ActiveValue::Set, DatabaseConnection};
use stump_core::{
	config::StumpConfig,
	database::connect_at,
	filesystem::scanner::LibraryScanJob,
	job::{Executor, WorkerCtx, WrappedJob},
};
use tempfile::{Builder as TempDirBuilder, TempDir};
use tokio::{
	runtime::Builder,
	sync::{broadcast, mpsc},
};
use uuid::Uuid;

#[derive(Debug)]
struct BenchmarkSize {
	series_count: usize,
	media_per_series: usize,
	sample_count: usize,
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
			sample_count: 100,
		},
		BenchmarkSize {
			series_count: 100,
			media_per_series: 10,
			sample_count: 100,
		},
		BenchmarkSize {
			series_count: 100,
			media_per_series: 100,
			sample_count: 10,
		},
		BenchmarkSize {
			series_count: 100,
			media_per_series: 1000,
			sample_count: 10,
		},
	];

	let mut group = c.benchmark_group("full_scan");
	for size in SIZES.iter() {
		group.sample_size(size.sample_count);
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

				let conn = test_ctx.worker_ctx.conn.clone();

				println!("Starting benchmark for {}", size);
				let start = Instant::now();
				scan_new_library(test_ctx).await;
				let elapsed = start.elapsed();

				let _ =
					safe_validate_counts(&conn, size.series_count, size.media_per_series)
						.await;

				clean_up(&conn, library.0, tempdirs).await;

				elapsed
			});
		});
	}
}

criterion_group!(benches, full_scan);

type LibraryWithConfig = (library::Model, library_config::Model);

struct TestCtx {
	job: WrappedJob<LibraryScanJob>,
	worker_ctx: WorkerCtx,
}

struct Setup {
	test_ctx: TestCtx,
	library: LibraryWithConfig,
	tempdirs: Vec<TempDir>,
}

async fn create_test_library(
	series_count: usize,
	books_per_series: usize,
) -> Result<
	(DatabaseConnection, LibraryWithConfig, Vec<TempDir>),
	Box<dyn std::error::Error>,
> {
	let conn = connect_at(&format!(
		"sqlite://{}/benchmark.db?mode=rwc",
		env!("CARGO_MANIFEST_DIR")
	))
	.await?;

	let deleted_libraries = library::Entity::delete_many()
		.exec(&conn)
		.await?
		.rows_affected;
	tracing::debug!(?deleted_libraries, "Deleted libraries");

	let library_temp_dir = TempDirBuilder::new().prefix("ROOT").tempdir()?;
	let library_temp_dir_path = library_temp_dir.path().to_str().unwrap().to_string();

	let id = Uuid::new_v4().to_string();

	let library_config = library_config::ActiveModel {
		convert_rar_to_zip: Set(false),
		default_reading_dir: Set(ReadingDirection::Ltr),
		default_reading_image_scale_fit: Set(ReadingImageScaleFit::Height),
		default_reading_mode: Set(ReadingMode::Paged),
		generate_file_hashes: Set(true),
		generate_koreader_hashes: Set(true),
		hard_delete_conversions: Set(false),
		library_id: Set(Some(id.to_string())),
		library_pattern: Set(LibraryPattern::SeriesBased),
		watch: Set(false),
		process_metadata: Set(true),
		..Default::default()
	}
	.insert(&conn)
	.await?;

	let library = library::ActiveModel {
		id: Set(id.clone()),
		name: Set("Benchmark Library".to_string()),
		path: Set(library_temp_dir_path.clone()),
		status: Set(FileStatus::Ready),
		config_id: Set(library_config.id),
		..Default::default()
	}
	.insert(&conn)
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

	Ok((conn, (library, library_config), temp_dirs))
}

async fn setup_test(
	series_count: usize,
	books_per_series: usize,
) -> Result<Setup, Box<dyn std::error::Error>> {
	let (conn, library, tempdirs) =
		create_test_library(series_count, books_per_series).await?;

	let job = WrappedJob::new(LibraryScanJob {
		id: library.0.id.clone(),
		path: library.0.path.clone(),
		config: Some(library.1.clone()),
		options: Default::default(),
	});

	let job_id = Uuid::new_v4().to_string();
	let _db_job = job::ActiveModel {
		id: Set(job_id.clone()),
		name: Set(job.name().to_string()),
		..Default::default()
	}
	.insert(&conn)
	.await?;

	let config_dir = format!("{}/benches/config", env!("CARGO_MANIFEST_DIR"));
	let config = StumpConfig::new(config_dir);
	let worker_ctx = WorkerCtx {
		conn: Arc::new(conn),
		config: Arc::new(config),
		job_id,
		job_controller_tx: mpsc::unbounded_channel().0,
		core_event_tx: broadcast::channel(1024).0,
		commands_rx: async_channel::unbounded().1,
		status_tx: async_channel::unbounded().0,
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
	conn: &DatabaseConnection,
	series_count: usize,
	books_per_series: usize,
) -> bool {
	let mut passed = true;

	let actual_series_count = series::Entity::find()
		.count(conn)
		.await
		.expect("Failed to count series");

	if actual_series_count != series_count as u64 {
		println!(
			"Series count mismatch (actual vs expected): {} != {}",
			actual_series_count, series_count
		);
		passed = false;
	}

	let actual_media_count = media::Entity::find()
		.count(conn)
		.await
		.expect("Failed to count media");

	if actual_media_count != (series_count * books_per_series) as u64 {
		println!(
			"Media count mismatch (actual vs expected): {} != {}. You probably introduced a bug :)",
			actual_media_count,
			series_count * books_per_series
		);
		passed = false;
	}

	passed
}

async fn clean_up(
	conn: &DatabaseConnection,
	library: library::Model,
	tempdirs: Vec<TempDir>,
) {
	let delete_result = library::Entity::delete_by_id(library.id)
		.exec(conn)
		.await
		.expect("Failed to delete library");

	tracing::debug!(?delete_result, "Deleted library");

	for tempdir in tempdirs {
		let _ = tempdir.close();
	}
}

async fn scan_new_library(test_ctx: TestCtx) {
	let TestCtx {
		mut job,
		worker_ctx,
	} = test_ctx;

	let result = job.execute(worker_ctx).await;
	println!("Job result: {:?}", result);
}

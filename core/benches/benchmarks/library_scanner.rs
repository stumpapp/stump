use std::{
	fmt::{Display, Formatter},
	path::PathBuf,
	sync::Arc,
	time::Instant,
};

use apalis::prelude::MemoryStorage;
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
	job::{
		stump_job::StumpJob, ApalisWorkerState, JobContext, JobLifecycle, JobOutputExt,
	},
};
use tempfile::{Builder as TempDirBuilder, TempDir};
use tokio::{runtime::Builder, sync::broadcast};
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
			"{} series x {} books per series ({} books)",
			self.series_count,
			self.media_per_series,
			self.series_count * self.media_per_series
		)
	}
}

fn full_scan(c: &mut Criterion) {
	static SIZES: [BenchmarkSize; 5] = [
		// 10 series x 10 books per series (100 books)
		BenchmarkSize {
			series_count: 10,
			media_per_series: 10,
			sample_count: 100,
		},
		// 100 series x 10 books per series (1000 books)
		BenchmarkSize {
			series_count: 100,
			media_per_series: 10,
			sample_count: 100,
		},
		// 100 series x 100 books per series (10000 books)
		BenchmarkSize {
			series_count: 100,
			media_per_series: 100,
			sample_count: 10,
		},
		// 100 series x 1,000 books per series (100000 books)
		BenchmarkSize {
			series_count: 100,
			media_per_series: 1000,
			sample_count: 10,
		},
		// 150 series x 1,000 books per series (150000 books)
		BenchmarkSize {
			series_count: 150,
			media_per_series: 1000,
			sample_count: 10,
		},
	];

	// static SIZES: [BenchmarkSize; 3] = [
	// 	// 10 series x 10 books per series (100 books)
	// 	BenchmarkSize {
	// 		series_count: 10,
	// 		media_per_series: 10,
	// 		sample_count: 100,
	// 	},
	// 	// 100 series x 100 books per series (10000 books)
	// 	BenchmarkSize {
	// 		series_count: 100,
	// 		media_per_series: 100,
	// 		sample_count: 10,
	// 	},
	// 	// 100 series x 1,000 books per series (100000 books)
	// 	BenchmarkSize {
	// 		series_count: 100,
	// 		media_per_series: 1000,
	// 		sample_count: 10,
	// 	},
	// ];

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

				let conn = test_ctx.job_ctx.conn.clone();

				println!("Starting benchmark: {}", size);
				let start = Instant::now();
				scan_new_library(test_ctx).await;
				let elapsed = start.elapsed();

				validate_counts(&conn, size.series_count, size.media_per_series)
					.await
					.expect("Failed to validate counts");

				clean_up(&conn, library.0, tempdirs).await;

				elapsed
			});
		});
	}
}

criterion_group!(benches, full_scan);

type LibraryWithConfig = (library::Model, library_config::Model);

struct TestCtx {
	job: LibraryScanJob,
	job_ctx: Arc<ApalisWorkerState>,
	job_id: String,
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
	let db_path = PathBuf::from(format!("{}/benchmark.db", env!("CARGO_MANIFEST_DIR")));
	let _ = std::fs::remove_file(&db_path);
	let _ = std::fs::remove_file(format!("{}.wal", db_path.to_string_lossy()));
	let _ = std::fs::remove_file(format!("{}.shm", db_path.to_string_lossy()));

	let conn =
		connect_at(&format!("sqlite://{}?mode=rwc", db_path.to_string_lossy())).await?;

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

	let fixture_paths = [
		data_dir.join("book.zip"),
		data_dir.join("book.epub"),
		data_dir.join("book.rar"),
	];

	let mut temp_dirs = vec![library_temp_dir];
	for series_idx in 0..series_count {
		let series_temp_dir = TempDirBuilder::new()
			.prefix(&format!("series_{}", series_idx))
			.tempdir_in(&library_temp_dir_path)?;

		for book_idx in 0..books_per_series {
			let book_path = &fixture_paths[book_idx % fixture_paths.len()];
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

	Ok((conn, (library, library_config), temp_dirs))
}

async fn setup_test(
	series_count: usize,
	books_per_series: usize,
) -> Result<Setup, Box<dyn std::error::Error>> {
	let (conn, library, tempdirs) =
		create_test_library(series_count, books_per_series).await?;

	let mut job = LibraryScanJob::new(library.0.id.clone(), library.0.path.clone(), None);
	job.config = Some(library.1.clone());

	let job_id = Uuid::new_v4().to_string();
	let _db_job = job::ActiveModel {
		id: Set(job_id.clone()),
		name: Set(LibraryScanJob::NAME.to_string()),
		..Default::default()
	}
	.insert(&conn)
	.await?;

	let config_dir = format!("{}/benches/config", env!("CARGO_MANIFEST_DIR"));
	let config = StumpConfig::new(config_dir);
	let job_storage = MemoryStorage::new();
	let job_ctx = Arc::new(ApalisWorkerState::new(
		Arc::new(conn),
		Arc::new(config),
		broadcast::channel(1024).0,
		job_storage,
	));
	Ok(Setup {
		test_ctx: TestCtx {
			job,
			job_ctx,
			job_id,
		},
		library,
		tempdirs,
	})
}

// i return errors so that the benchmark fails hard, so it doesn't fuck with
// the trend data from previous runs e.g. in the scenario where a bug is introduced
// and no books are inserted and things "improve" by a significant margin. def did not
// happen nuh uh
async fn validate_counts(
	conn: &DatabaseConnection,
	series_count: usize,
	books_per_series: usize,
) -> Result<(), String> {
	let actual_series_count = series::Entity::find()
		.count(conn)
		.await
		.expect("Failed to count series");

	if actual_series_count != series_count as u64 {
		return Err(format!(
			"Series count mismatch (actual vs expected): {} != {}",
			actual_series_count, series_count
		));
	}

	let actual_media_count = media::Entity::find()
		.count(conn)
		.await
		.expect("Failed to count media");

	if actual_media_count != (series_count * books_per_series) as u64 {
		return Err(format!(
			"Media count mismatch (actual vs expected): {} != {}. You probably introduced a bug :)",
			actual_media_count,
			series_count * books_per_series
		)	);
	}

	Ok(())
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
		job_ctx,
		job_id,
	} = test_ctx;

	let handle = JobContext::new(
		job_ctx,
		job_id,
		&StumpJob::LibraryScan {
			id: job.id.clone(),
			path: job.path.clone(),
			options: Some(job.options),
		},
	)
	.await
	.expect("Failed to start job context");

	let working_state = job.init(&handle).await.expect("Failed to init job");

	let stump_core::job::WorkingState {
		output: initial_output,
		mut tasks,
		..
	} = working_state;

	let mut output = initial_output.unwrap_or_default();

	while let Some(task) = tasks.pop_front() {
		match job.execute_task(&handle, task).await {
			Ok(task_output) => {
				output.update(task_output.output);
				for subtask in task_output.subtasks.into_iter().rev() {
					tasks.push_front(subtask);
				}
			},
			Err(e) => {
				println!("Task failed: {:?}", e);
				return;
			},
		}
	}

	// println!("Job result: {:?}", output);
}

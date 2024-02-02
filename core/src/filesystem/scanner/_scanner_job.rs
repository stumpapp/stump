use rayon::iter::{IntoParallelRefIterator, ParallelIterator};
use std::{collections::VecDeque, path::PathBuf};

use serde::{Deserialize, Serialize};

use crate::{
	db::{
		entity::{LibraryOptions, Media, Series},
		FileStatus, SeriesDAO, DAO,
	},
	filesystem::{scanner::utils::create_media, MediaBuilder, SeriesBuilder},
	job_::{
		error::JobError, DynJob, JobTaskOutput, WorkerCtx, WorkingState, WritableData,
	},
	prisma::{library, library_options, media, series, PrismaClient},
};

use super::{
	utils::generate_rule_set, walk_library, walk_series, WalkedLibrary, WalkedSeries,
	WalkerCtx,
};

// TODO: there has to be some sort of nesting of task counts here in order to properly report on the UI.
// For example, I might be on the 3rd task of 5, and within the 3rd task (series scan) I have:
// - 400 files total to index on init
// - 20 new media to create
// - 1 missing media
// I think, logically, the progression on the UI would be something like:
// - Handling task (3/5) - x/400 files indexed
// - Handling task (3/5) - x/20 new media created
// - Handling task (3/5) - x/1 missing media handled
// Or some iteration of that kind of thing. Otherwise, the progression will be SUPER unclear to the user
// with just 3/5, 4/5, 5/5, etc. I think this is a good idea, but I'm not sure how to implement it (yet).

#[derive(Serialize, Deserialize)]
pub enum LibraryScanTask {
	Init(InitTaskInput),
	WalkSeries(PathBuf),
}

#[derive(Serialize, Deserialize)]
pub struct InitTaskInput {
	series_to_create: Vec<PathBuf>,
	missing_series: Vec<PathBuf>,
}

pub struct LibraryScanJob {
	pub id: String,
	pub path: String,
	pub options: Option<LibraryOptions>,
}

#[derive(Serialize, Deserialize, Default, Debug)]
pub struct LibraryScanData {
	/// The number of files to scan relative to the library root
	total_files: u64,

	created_media: u64,
	updated_media: u64,

	created_series: u64,
	updated_series: u64,
}

impl WritableData for LibraryScanData {
	fn store(&mut self, updated: Self) {
		self.total_files += updated.total_files;
		self.created_media += updated.created_media;
		self.updated_media += updated.updated_media;
		self.created_series += updated.created_series;
		self.updated_series += updated.updated_series;
	}
}

#[derive(Serialize, Deserialize)]
struct LibraryScanJobOutput {}

#[async_trait::async_trait]
impl DynJob for LibraryScanJob {
	const NAME: &'static str = "library_scan";

	type Data = LibraryScanData;
	type Task = LibraryScanTask;

	async fn init(
		&mut self,
		ctx: &WorkerCtx,
	) -> Result<WorkingState<Self::Data, Self::Task>, JobError> {
		if let Some(restore_point) = self.attempt_restore(ctx).await? {
			// TODO: consider more logging here
			tracing::debug!("Restoring library scan job from save state");
			return Ok(restore_point);
		}

		let mut data = Self::Data::default();
		let library_options = ctx
			.db
			.library_options()
			.find_first(vec![library_options::library::is(vec![
				library::id::equals(self.id.clone()),
				library::path::equals(self.path.clone()),
			])])
			.exec()
			.await?
			.map(LibraryOptions::from)
			.ok_or(JobError::InitFailed("Library not found".to_string()))?;
		let is_collection_based = library_options.is_collection_based();
		let ignore_rules = generate_rule_set(&[PathBuf::from(self.path.clone())]);

		self.options = Some(library_options);

		let WalkedLibrary {
			series_to_create,
			series_to_visit,
			missing_series,
			library_is_missing,
			ignored_directories,
			seen_directories,
		} = walk_library(
			&self.path,
			WalkerCtx {
				db: ctx.db.clone(),
				ignore_rules,
				max_depth: is_collection_based.then(|| 1),
			},
		)
		.await?;
		tracing::debug!(
			series_to_create = series_to_create.len(),
			series_to_visit = series_to_visit.len(),
			missing_series = missing_series.len(),
			library_is_missing,
			"Walked library"
		);
		data.total_files = seen_directories + ignored_directories;

		if library_is_missing {
			// TODO: mark library as missing in DB
			return Err(JobError::InitFailed(
				"Library could not be found on disk".to_string(),
			));
		}

		let init_task_input = InitTaskInput {
			series_to_create: series_to_create.clone(),
			missing_series: missing_series,
		};

		let series_to_visit = series_to_visit
			.into_iter()
			.map(LibraryScanTask::WalkSeries)
			.chain(
				series_to_create
					.into_iter()
					.map(LibraryScanTask::WalkSeries),
			)
			.collect::<Vec<LibraryScanTask>>();

		let tasks = VecDeque::from(
			[LibraryScanTask::Init(init_task_input)]
				.into_iter()
				.chain(series_to_visit)
				.collect::<Vec<LibraryScanTask>>(),
		);

		Ok(WorkingState {
			data: Some(data),
			tasks,
			current_task_index: 0,
			errors: vec![],
		})
	}

	async fn execute_task(
		&self,
		ctx: &WorkerCtx,
		task: Self::Task,
	) -> Result<JobTaskOutput<Self>, JobError> {
		let mut data = Self::Data::default();
		let mut errors = vec![];

		match task {
			LibraryScanTask::Init(input) => {
				tracing::info!("Executing the init task for library scan");
				let InitTaskInput {
					series_to_create,
					missing_series,
				} = input;

				if !missing_series.is_empty() {
					let missing_series_str = missing_series
						.iter()
						.map(|e| e.to_string_lossy().to_string())
						.collect::<Vec<String>>();
					let _affected_rows = ctx
						.db
						.series()
						.update_many(
							vec![series::path::in_vec(missing_series_str)],
							vec![series::status::set(FileStatus::Missing.to_string())],
						)
						.exec()
						.await
						.map_or_else(
							|error| {
								tracing::error!(error = ?error, "Failed to update missing series");
								errors.push(format!(
									"Failed to update missing series: {:?}",
									error.to_string()
								));
								0
							},
							|count| {
								data.updated_series = count as u64;
								tracing::debug!(count, "Updated missing series");
								count
							},
						);
				}

				if !series_to_create.is_empty() {
					// TODO: remove this DAO!!
					let series_dao = SeriesDAO::new(ctx.db.clone());

					let built_series = series_to_create
						.par_iter()
						.map(|e| SeriesBuilder::new(e.as_path(), &self.id).build())
						.filter_map(|res| {
							if let Err(e) = res {
								tracing::error!(error = ?e, "Failed to create series from entry");
								None
							} else {
								res.ok()
							}
						})
						.collect::<Vec<Series>>();

					let chunks = built_series.chunks(1000);
					tracing::debug!(
						chunk_count = chunks.len(),
						"Batch inserting new series"
					);
					for chunk in chunks {
						let result = series_dao.create_many(chunk.to_vec()).await;
						match result {
							Ok(created_series) => {
								// TODO: emit event
								data.created_series += created_series.len() as u64;
							},
							Err(e) => {
								tracing::error!(error = ?e, "Failed to batch insert series");
								errors.push(format!(
									"Failed to batch insert series: {:?}",
									e.to_string()
								));
							},
						}
					}
				}
			},
			LibraryScanTask::WalkSeries(path_buf) => {
				tracing::info!("Executing the walk series task for library scan");

				let ignore_rules = generate_rule_set(&[
					path_buf.clone(),
					PathBuf::from(self.path.clone()),
				]);

				let walk_result = walk_series(
					path_buf.as_path(),
					WalkerCtx {
						db: ctx.db.clone(),
						ignore_rules,
						max_depth: None,
					},
				)
				.await;

				if let Err(core_error) = walk_result {
					tracing::error!(error = ?core_error, "Critical error during attempt to walk series!");
					// NOTE: I don't error here in order to collect and report on the error later on.
					// This can perhaps be refactored later on so that the parent (Job struct) properly
					// handles this instead, however for now this is fine.
					return Ok(JobTaskOutput {
						data,
						errors: vec![core_error.to_string()],
					});
				}

				let WalkedSeries {
					series_is_missing,
					media_to_create,
					// media_to_update,
					missing_media,
					seen_files,
					ignored_files,
					..
				} = walk_result?;
				data.total_files += seen_files + ignored_files;

				if series_is_missing {
					return handle_missing_series(
						&ctx.db,
						path_buf.to_str().unwrap(),
						data,
						errors,
					)
					.await;
				}

				let series = ctx
					.db
					.series()
					.find_first(vec![series::path::equals(
						path_buf.to_str().unwrap().to_string(),
					)])
					.exec()
					.await?
					.ok_or(JobError::TaskFailed("Series not found".to_string()))?;

				let JobTaskOutput {
					data: new_data,
					errors: new_errors,
				} = hande_missing_media(&ctx.db, &series.id, missing_media, data, errors)
					.await?;
				data = new_data;
				errors = new_errors;

				let JobTaskOutput {
					data: new_data,
					errors: new_errors,
				} = handle_create_series_media(
					media_to_create,
					SeriesCtx {
						id: series.id,
						path: series.path,
						library_options: self.options.clone().unwrap_or_default(),
					},
					&ctx,
					data,
					errors,
				)
				.await?;
				data = new_data;
				errors = new_errors;
			},
		}

		Ok(JobTaskOutput { data, errors })
	}
}

async fn handle_missing_series(
	client: &PrismaClient,
	path: &str,
	mut data: LibraryScanData,
	mut errors: Vec<String>,
) -> Result<JobTaskOutput<LibraryScanJob>, JobError> {
	let affected_rows = client
		.series()
		.update_many(
			vec![series::path::equals(path.to_string())],
			vec![series::status::set(FileStatus::Missing.to_string())],
		)
		.exec()
		.await
		.map_or_else(
			|error| {
				tracing::error!(error = ?error, "Failed to update missing series");
				errors.push(format!(
					"Failed to update missing series: {:?}",
					error.to_string()
				));
				0
			},
			|count| {
				data.updated_series += count as u64;
				tracing::debug!(count, "Updated missing series");
				count
			},
		);

	if affected_rows > 1 {
		tracing::warn!(
			affected_rows,
			"Updated more than one series with path: {}",
			path
		);
	}

	let _affected_media = client
		.media()
		.update_many(
			vec![media::series::is(vec![series::path::equals(
				path.to_string(),
			)])],
			vec![media::status::set(FileStatus::Missing.to_string())],
		)
		.exec()
		.await
		.map_or_else(
			|error| {
				tracing::error!(error = ?error, "Failed to update missing media");
				errors.push(format!(
					"Failed to update missing media: {:?}",
					error.to_string()
				));
				0
			},
			|count| {
				data.updated_media += count as u64;
				tracing::debug!(count, "Updated missing media");
				count
			},
		);

	Ok(JobTaskOutput { data, errors })
}

async fn hande_missing_media(
	client: &PrismaClient,
	series_id: &str,
	media_paths: Vec<PathBuf>,
	mut data: LibraryScanData,
	mut errors: Vec<String>,
) -> Result<JobTaskOutput<LibraryScanJob>, JobError> {
	if media_paths.is_empty() {
		tracing::debug!("No missing media to handle");
		return Ok(JobTaskOutput { data, errors });
	}

	let _affected_rows = client
		.media()
		.update_many(
			vec![
				media::series::is(vec![series::id::equals(series_id.to_string())]),
				media::path::in_vec(
					media_paths
						.iter()
						.map(|e| e.to_string_lossy().to_string())
						.collect::<Vec<String>>(),
				),
			],
			vec![media::status::set(FileStatus::Missing.to_string())],
		)
		.exec()
		.await
		.map_or_else(
			|error| {
				tracing::error!(error = ?error, "Failed to update missing media");
				errors.push(format!(
					"Failed to update missing media: {:?}",
					error.to_string()
				));
				0
			},
			|count| {
				data.updated_media += count as u64;
				tracing::debug!(count, "Updated missing media");
				count
			},
		);

	Ok(JobTaskOutput { data, errors })
}

struct SeriesCtx {
	id: String,
	path: String,
	library_options: LibraryOptions,
}

async fn handle_create_series_media(
	paths: Vec<PathBuf>,
	series_ctx: SeriesCtx,
	ctx: &WorkerCtx,
	mut data: LibraryScanData,
	mut errors: Vec<String>,
) -> Result<JobTaskOutput<LibraryScanJob>, JobError> {
	if paths.is_empty() {
		tracing::debug!("No media to create for series");
		return Ok(JobTaskOutput { data, errors });
	}

	let SeriesCtx {
		id,
		path,
		library_options,
	} = series_ctx;
	tracing::debug!(?path, "Creating media for series");

	// TODO: support config for chunk size, systems with more memory can take advantage of larger chunks
	// while systems with less memory can take advantage of smaller chunks (if desired)
	let path_chunks = paths.chunks(300);
	for (idx, chunk) in path_chunks.enumerate() {
		tracing::trace!(chunk_idx = idx, chunk_len = chunk.len(), "Processing chunk");
		let mut built_media = chunk
			.par_iter()
			.map(|path_buf| {
				(
					path_buf.to_owned(),
					MediaBuilder::new(
						path_buf,
						&id,
						library_options.clone(),
						&ctx.config,
					)
					.build(),
				)
			})
			.collect::<VecDeque<(PathBuf, Result<Media, _>)>>();

		while let Some((media_path, build_result)) = built_media.pop_front() {
			match build_result {
				Ok(generated) => {
					// TODO: convert to a transaction!
					match create_media(&ctx.db, generated).await {
						Ok(_created_media) => {
							// TODO: emit event
							data.created_media += 1;
						},
						Err(e) => {
							tracing::error!(error = ?e, ?media_path, "Failed to create media");
							errors.push(format!(
								"Failed to create media: {:?}",
								e.to_string()
							));
						},
					}
				},
				Err(e) => {
					tracing::error!(error = ?e, ?media_path, "Failed to build media");
					errors.push(format!("Failed to build media: {:?}", e.to_string()));
				},
			}
		}
	}

	Ok(JobTaskOutput { data, errors })
}

#[cfg(test)]
mod tests {
	use std::sync::Arc;

	use tempfile::{Builder as TempDirBuilder, TempDir};
	use uuid::Uuid;

	use super::*;
	use crate::{
		config::StumpConfig,
		db::{create_client_with_url, entity::Library},
		job_::{Job, JobExecutor},
		prisma::{library, library_options},
	};

	struct TestCtx {
		job: Job<LibraryScanJob>,
		worker_ctx: WorkerCtx,
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

		let library_temp_dir = TempDirBuilder::new().prefix("ROOT").tempdir()?;
		let library_temp_dir_path = library_temp_dir.path().to_str().unwrap().to_string();

		tracing::info!("Creating bench library...");

		let library_options = client.library_options().create(vec![]).exec().await?;

		let library = client
			.library()
			.create(
				"Bench".to_string(),
				library_temp_dir_path.clone(),
				library_options::id::equals(library_options.id.clone()),
				vec![],
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

		tracing::info!("Library created in DB! Creating FS structure...");

		let data_dir = PathBuf::from(format!(
			"{}/integration-tests/data",
			env!("CARGO_MANIFEST_DIR")
		));

		let zip_path = data_dir.join("book.zip");
		let epub_path = data_dir.join("book.epub");
		let rar_path = data_dir.join("book.rar");

		let mut temp_dirs = vec![library_temp_dir];
		for series_idx in 0..series_count {
			tracing::debug!("Creating series {}", series_idx + 1);
			let series_temp_dir = TempDirBuilder::new()
				.prefix(&format!("series_{}", series_idx))
				.tempdir_in(&library_temp_dir_path)?;

			for book_idx in 0..books_per_series {
				tracing::debug!("Creating book {}", book_idx + 1);
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
	) -> Result<TestCtx, Box<dyn std::error::Error>> {
		tracing_subscriber::fmt()
			.with_max_level(tracing::Level::TRACE)
			.with_env_filter("stump_core=trace")
			.init();

		let (client, library, tempdirs) =
			create_test_library(series_count, books_per_series).await?;
		let job = Job::new(LibraryScanJob {
			id: library.id.clone(),
			path: library.path.clone(),
			options: Some(library.library_options.clone()),
		});
		let config_dir =
			format!("{}/integration-tests/config", env!("CARGO_MANIFEST_DIR"));
		let config = StumpConfig::new(config_dir);
		let worker_ctx = WorkerCtx {
			db: Arc::new(client),
			config: Arc::new(config),
			job_id: Uuid::new_v4().to_string(),
			event_sender: async_channel::unbounded().0,
			command_receiver: async_channel::unbounded().1,
		};
		Ok(TestCtx {
			job: *job,
			worker_ctx,
			library,
			tempdirs,
		})
	}

	async fn safe_validate_counts(
		client: &PrismaClient,
		series_count: usize,
		books_per_series: usize,
	) {
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
		}
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

	#[tokio::test]
	async fn bench_library_scan() {
		// let series_count = 1000;
		// let books_per_series = 100;
		let series_count = 10;
		let books_per_series = 10;

		let TestCtx {
			mut job,
			worker_ctx,
			library,
			tempdirs,
		} = setup_test(series_count, books_per_series)
			.await
			.expect("Failed to setup test job");

		let client = worker_ctx.db.clone();
		let commands_rx = worker_ctx.command_receiver.clone();

		println!("Setup complete! Running bench after 5 seconds...");
		for i in 0..5 {
			tokio::time::sleep(tokio::time::Duration::from_secs(1)).await;
			println!("{}...", 5 - i);
		}

		let start = tokio::time::Instant::now();
		let result = job.run(worker_ctx, commands_rx).await;
		let elapsed = start.elapsed();

		tracing::info!("Elapsed: {:?}", elapsed);
		tracing::debug!("Result: {:?}", result);

		safe_validate_counts(&client, series_count, books_per_series).await;
		tracing::info!("Cleaning up...");
		clean_up(&client, library, tempdirs).await;
	}
}

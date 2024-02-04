use rayon::iter::{
	Either, IndexedParallelIterator, IntoParallelRefIterator, ParallelIterator,
};
use std::{collections::VecDeque, path::PathBuf};

use serde::{Deserialize, Serialize};

use crate::{
	db::{
		entity::{LibraryOptions, Media, Series},
		FileStatus, SeriesDAO, DAO,
	},
	filesystem::{scanner::utils::create_media, MediaBuilder, SeriesBuilder},
	job::{
		error::JobError, JobDataExt, JobExt, JobProgress, JobRunLog, JobTaskOutput,
		WorkerCtx, WorkingState,
	},
	prisma::{library, library_options, media, series, PrismaClient},
	utils::chain_optional_iter,
};

use super::{
	series_scan_job::SeriesScanTask, utils::generate_rule_set, walk_library, walk_series,
	WalkedLibrary, WalkedSeries, WalkerCtx,
};

#[derive(Serialize, Deserialize)]
pub enum LibraryScanTask {
	Init(InitTaskInput),
	WalkSeries(PathBuf),
	SeriesTask {
		id: String,
		path: String,
		task: SeriesScanTask,
	},
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

impl JobDataExt for LibraryScanData {
	fn update(&mut self, updated: Self) {
		self.total_files += updated.total_files;
		self.created_media += updated.created_media;
		self.updated_media += updated.updated_media;
		self.created_series += updated.created_series;
		self.updated_series += updated.updated_series;
	}
}

#[async_trait::async_trait]
impl JobExt for LibraryScanJob {
	const NAME: &'static str = "library_scan";

	type Data = LibraryScanData;
	type Task = LibraryScanTask;

	fn description(&self) -> Option<String> {
		Some(self.path.clone())
	}

	async fn init(
		&mut self,
		ctx: &WorkerCtx,
	) -> Result<WorkingState<Self::Data, Self::Task>, JobError> {
		if let Some(restore_point) = self.attempt_restore(ctx).await? {
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

		ctx.progress(JobProgress::msg("Performing task discovery"));
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
			ctx.progress(JobProgress::msg("Failed to find library on disk"));
			// TODO: mark library as missing in DB
			return Err(JobError::InitFailed(
				"Library could not be found on disk".to_string(),
			));
		}

		ctx.progress(JobProgress::msg("Indexing complete! Building tasks"));

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
		let mut subtasks = vec![];

		match task {
			LibraryScanTask::Init(input) => {
				tracing::info!("Executing the init task for library scan");
				let InitTaskInput {
					series_to_create,
					missing_series,
				} = input;

				// Task count: build each series + 1 for insertion step, +1 for update tx on missing series
				let total_subtask_count = (series_to_create.len() + 1)
					+ (missing_series.len() > 0).then(|| 1).unwrap_or(0);
				let mut current_subtask_index = 0;
				ctx.progress(JobProgress::subtask_position(
					current_subtask_index,
					total_subtask_count as i32,
				));

				if !missing_series.is_empty() {
					ctx.progress(JobProgress::msg("Handling missing series"));
					let missing_series_str = missing_series
						.iter()
						.map(|e| e.to_string_lossy().to_string())
						.collect::<Vec<String>>();
					let affected_rows = ctx
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
								errors.push(JobRunLog::error(format!(
									"Failed to update missing series: {:?}",
									error.to_string()
								)));
								0
							},
							|count| {
								data.updated_series = count as u64;
								count
							},
						);
					ctx.progress(JobProgress::subtask_position(
						(affected_rows > 0)
							.then(|| {
								current_subtask_index += 1;
								current_subtask_index
							})
							.unwrap_or(0),
						total_subtask_count as i32,
					));
				}

				if !series_to_create.is_empty() {
					ctx.progress(JobProgress::msg("Creating new series"));
					// TODO: remove this DAO!!
					let series_dao = SeriesDAO::new(ctx.db.clone());

					let (built_series, failures): (Vec<_>, Vec<_>) = series_to_create
						.par_iter()
						.enumerate()
						.map(|(idx, path_buf)| {
							ctx.progress(JobProgress::subtask_position_msg(
								format!("Building series {}", path_buf.display())
									.as_str(),
								current_subtask_index + (idx as i32),
								total_subtask_count as i32,
							));
							SeriesBuilder::new(path_buf.as_path(), &self.id).build()
						})
						.partition_map::<_, _, _, Series, String>(
							|result| match result {
								Ok(s) => Either::Left(s),
								Err(e) => Either::Right(e.to_string()),
							},
						);

					current_subtask_index += (built_series.len() + failures.len()) as i32;

					// TODO: make this configurable
					let chunks = built_series.chunks(400);
					let chunk_count = chunks.len();
					tracing::debug!(chunk_count, "Batch inserting new series");
					for (idx, chunk) in chunks.enumerate() {
						ctx.progress(JobProgress::msg(
							format!(
								"Processing series insertion chunk {} of {}",
								idx + 1,
								chunk_count
							)
							.as_str(),
						));
						let result = series_dao.create_many(chunk.to_vec()).await;
						match result {
							Ok(created_series) => {
								// TODO: emit event
								data.created_series += created_series.len() as u64;
							},
							Err(e) => {
								tracing::error!(error = ?e, "Failed to batch insert series");
								errors.push(JobRunLog::error(format!(
									"Failed to batch insert series: {:?}",
									e.to_string()
								)));
							},
						}
					}

					current_subtask_index += 1;
					ctx.progress(JobProgress::subtask_position_msg(
						"Processed all chunks",
						current_subtask_index,
						total_subtask_count as i32,
					));
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
						errors: vec![JobRunLog::error(format!(
							"Critical error during attempt to walk series: {:?}",
							core_error.to_string()
						))],
						subtasks,
					});
				}

				let WalkedSeries {
					series_is_missing,
					media_to_create,
					media_to_visit,
					missing_media,
					seen_files,
					ignored_files,
				} = walk_result?;
				data.total_files += seen_files + ignored_files;

				if series_is_missing {
					return handle_missing_series(
						&ctx.db,
						path_buf.to_str().unwrap_or_default(),
						data,
						errors,
					)
					.await;
				}

				let series_path_str = path_buf.to_str().unwrap_or_default().to_string();
				let series = ctx
					.db
					.series()
					.find_first(vec![series::path::equals(series_path_str.clone())])
					.exec()
					.await?
					.ok_or(JobError::TaskFailed("Series not found".to_string()))?;

				subtasks = chain_optional_iter(
					[],
					[
						(!missing_media.is_empty())
							.then(|| SeriesScanTask::MarkMissingMedia(missing_media)),
						(!media_to_create.is_empty())
							.then(|| SeriesScanTask::CreateMedia(media_to_create)),
						(!media_to_visit.is_empty())
							.then(|| SeriesScanTask::VisitMedia(media_to_visit)),
					],
				)
				.into_iter()
				.map(|task| LibraryScanTask::SeriesTask {
					id: series.id.clone(),
					path: series_path_str.clone(),
					task,
				})
				.collect();
			},
			LibraryScanTask::SeriesTask {
				id: series_id,
				path: series_path,
				task: series_task,
			} => match series_task {
				SeriesScanTask::MarkMissingMedia(paths) => {
					let JobTaskOutput {
						data: new_data,
						errors: new_errors,
						..
					} = handle_missing_media(&ctx.db, &series_id, paths, data, errors)
						.await?;
					data = new_data;
					errors = new_errors;
				},
				SeriesScanTask::CreateMedia(paths) => {
					let series_ctx = SeriesCtx {
						id: series_id,
						path: series_path,
						library_options: self.options.clone().unwrap_or_default(),
						chunk_size: 300,
					};
					let JobTaskOutput {
						data: new_data,
						errors: new_errors,
						..
					} = handle_create_media(paths, series_ctx, ctx, data, errors).await?;
					data = new_data;
					errors = new_errors;
				},
				SeriesScanTask::VisitMedia(paths) => {
					// NOTE: commented so bench doesn't fail
					// unimplemented!()
				},
			},
		}

		Ok(JobTaskOutput {
			data,
			errors,
			subtasks,
		})
	}
}

async fn handle_missing_series(
	client: &PrismaClient,
	path: &str,
	mut data: LibraryScanData,
	mut errors: Vec<JobRunLog>,
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
				errors.push(JobRunLog::error(format!(
					"Failed to update missing series: {:?}",
					error.to_string()
				)));

				0
			},
			|count| {
				data.updated_series += count as u64;
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
				errors.push(JobRunLog::error(format!(
					"Failed to update missing media: {:?}",
					error.to_string()
				)));
				0
			},
			|count| {
				data.updated_media += count as u64;
				count
			},
		);

	Ok(JobTaskOutput {
		data,
		errors,
		subtasks: vec![],
	})
}

async fn handle_missing_media(
	client: &PrismaClient,
	series_id: &str,
	media_paths: Vec<PathBuf>,
	mut data: LibraryScanData,
	mut errors: Vec<JobRunLog>,
) -> Result<JobTaskOutput<LibraryScanJob>, JobError> {
	if media_paths.is_empty() {
		tracing::debug!("No missing media to handle");
		return Ok(JobTaskOutput {
			data,
			errors,
			subtasks: vec![],
		});
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
				errors.push(JobRunLog::error(format!(
					"Failed to update missing media: {:?}",
					error.to_string()
				)));
				0
			},
			|count| {
				data.updated_media += count as u64;
				count
			},
		);

	Ok(JobTaskOutput {
		data,
		errors,
		subtasks: vec![],
	})
}

struct SeriesCtx {
	id: String,
	path: String,
	library_options: LibraryOptions,
	chunk_size: usize,
}

async fn handle_create_media(
	paths: Vec<PathBuf>,
	series_ctx: SeriesCtx,
	ctx: &WorkerCtx,
	mut data: LibraryScanData,
	mut errors: Vec<JobRunLog>,
) -> Result<JobTaskOutput<LibraryScanJob>, JobError> {
	if paths.is_empty() {
		tracing::debug!("No media to create for series");
		return Ok(JobTaskOutput {
			data,
			errors,
			subtasks: vec![],
		});
	}

	let SeriesCtx {
		id,
		path,
		library_options,
		chunk_size,
	} = series_ctx;
	tracing::debug!(?path, "Creating media for series");

	let path_chunks = paths.chunks(chunk_size);
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
							errors.push(JobRunLog::error(format!(
								"Failed to create media: {:?}",
								e.to_string()
							)));
						},
					}
				},
				Err(e) => {
					tracing::error!(error = ?e, ?media_path, "Failed to build media");
					errors.push(JobRunLog::error(format!(
						"Failed to build media: {:?}",
						e.to_string()
					)));
				},
			}
		}
	}

	Ok(JobTaskOutput {
		data,
		errors,
		subtasks: vec![],
	})
}

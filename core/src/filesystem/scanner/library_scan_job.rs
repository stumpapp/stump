use rayon::iter::{
	Either, IndexedParallelIterator, IntoParallelRefIterator, ParallelIterator,
};
use std::{collections::VecDeque, path::PathBuf};

use serde::{Deserialize, Serialize};
use specta::Type;

// TODO: hone the progress messages, they are a little noisy and unhelpful (e.g. 'Starting task')
// TODO: Refactor rayon usage to use tokio instead. I am trying to learn more about IO-bound operations in an
// async context, and I believe tokio might be more appropriate for this use case (highly concurrent IO-bound tasks).
// Also perhaps experiment with https://docs.rs/tokio-uring/latest/tokio_uring/index.html

use crate::{
	db::{
		entity::{CoreJobOutput, LibraryOptions, Series},
		FileStatus, SeriesDAO, DAO,
	},
	filesystem::{
		image::{ThumbnailGenerationJob, ThumbnailGenerationJobParams},
		SeriesBuilder,
	},
	job::{
		error::JobError, Executor, JobExecuteLog, JobExt, JobOutputExt, JobProgress,
		JobTaskOutput, WorkerCtx, WorkerSendExt, WorkingState, WrappedJob,
	},
	prisma::{library, library_options, media, series, PrismaClient},
	utils::chain_optional_iter,
	CoreEvent,
};

use super::{
	series_scan_job::SeriesScanTask,
	utils::{
		handle_create_media, handle_missing_media, handle_missing_series,
		handle_visit_media, MediaBuildOperationCtx, MediaOperationOutput,
		MissingSeriesOutput,
	},
	walk_library, walk_series, WalkedLibrary, WalkedSeries, WalkerCtx,
};

/// The task variants that are used to scan a library
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

/// The input data for the init task of a library scan job
#[derive(Serialize, Deserialize)]
pub struct InitTaskInput {
	series_to_create: Vec<PathBuf>,
	missing_series: Vec<PathBuf>,
}

/// A job that scans a library and updates the database with the results
#[derive(Clone)]
pub struct LibraryScanJob {
	pub id: String,
	pub path: String,
	pub options: Option<LibraryOptions>,
}

impl LibraryScanJob {
	pub fn new(id: String, path: String) -> Box<WrappedJob<LibraryScanJob>> {
		WrappedJob::new(Self {
			id,
			path,
			options: None,
		})
	}
}

/// The data that is collected and updated during the execution of a library scan job
#[derive(Clone, Serialize, Deserialize, Default, Debug, Type)]
pub struct LibraryScanOutput {
	/// The number of files visited during the scan
	total_files: u64,
	/// The number of directories visited during the scan
	total_directories: u64,
	/// The number of files that were ignored during the scan
	ignored_files: u64,
	/// The number of files that were deemed to be skipped during the scan, e.g. it
	/// exists in the database but has not been modified since the last scan
	skipped_files: u64,
	/// The number of ignored directories during the scan
	ignored_directories: u64,
	/// The number of media entities created
	created_media: u64,
	/// The number of media entities updated
	updated_media: u64,
	/// The number of series entities created
	created_series: u64,
	/// The number of series entities updated
	updated_series: u64,
}

impl JobOutputExt for LibraryScanOutput {
	fn update(&mut self, updated: Self) {
		self.total_files += updated.total_files;
		self.total_directories += updated.total_directories;
		self.ignored_files += updated.ignored_files;
		self.skipped_files += updated.skipped_files;
		self.ignored_directories += updated.ignored_directories;
		self.created_media += updated.created_media;
		self.updated_media += updated.updated_media;
		self.created_series += updated.created_series;
		self.updated_series += updated.updated_series;
	}
}

#[async_trait::async_trait]
impl JobExt for LibraryScanJob {
	const NAME: &'static str = "library_scan";

	type Output = LibraryScanOutput;
	type Task = LibraryScanTask;

	fn description(&self) -> Option<String> {
		Some(self.path.clone())
	}

	async fn init(
		&mut self,
		ctx: &WorkerCtx,
	) -> Result<WorkingState<Self::Output, Self::Task>, JobError> {
		let mut output = Self::Output::default();
		// Note: We ignore the potential self.options here in the event that it was
		// updated since being queued. This is perhaps a bit overly cautious, but it's
		// just one additional query.
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
		let ignore_rules = library_options.ignore_rules.build()?;

		self.options = Some(library_options);

		ctx.report_progress(JobProgress::msg("Performing task discovery"));
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
				max_depth: is_collection_based.then_some(1),
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
		output.total_directories = seen_directories + ignored_directories;
		output.ignored_directories = ignored_directories;

		if library_is_missing {
			handle_missing_library(&ctx.db, self.id.as_str()).await?;
			ctx.send_batch(vec![
				JobProgress::msg("Failed to find library on disk").into_worker_send(),
				CoreEvent::DiscoveredMissingLibrary(self.id.clone()).into_worker_send(),
			]);
			return Err(JobError::InitFailed(
				"Library could not be found on disk".to_string(),
			));
		}

		ctx.report_progress(JobProgress::msg("Building tasks"));

		let init_task_input = InitTaskInput {
			series_to_create: series_to_create.clone(),
			missing_series,
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

		ctx.report_progress(JobProgress::msg("Init complete!"));

		Ok(WorkingState {
			output: Some(output),
			tasks,
			completed_tasks: 0,
			logs: vec![],
		})
	}

	async fn cleanup(
		&self,
		ctx: &WorkerCtx,
		output: &Self::Output,
	) -> Result<Option<Box<dyn Executor>>, JobError> {
		ctx.send_core_event(CoreEvent::JobOutput {
			id: ctx.job_id.clone(),
			output: CoreJobOutput::LibraryScan(output.clone()),
		});

		let did_create = output.created_series > 0 || output.created_media > 0;
		let did_update = output.updated_series > 0 || output.updated_media > 0;
		let image_options = self
			.options
			.as_ref()
			.and_then(|o| o.thumbnail_config.clone());

		match image_options {
			Some(options) if did_create | did_update => {
				tracing::trace!("Thumbnail generation job should be enqueued");
				Ok(Some(WrappedJob::new(ThumbnailGenerationJob {
					options,
					params: ThumbnailGenerationJobParams::single_library(
						self.id.clone(),
						false,
					),
				})))
			},
			_ => {
				tracing::debug!("No cleanup required for library scan job");
				Ok(None)
			},
		}
	}

	async fn execute_task(
		&self,
		ctx: &WorkerCtx,
		task: Self::Task,
	) -> Result<JobTaskOutput<Self>, JobError> {
		let mut output = Self::Output::default();
		let mut logs = vec![];
		let mut subtasks = vec![];

		let chunk_size = ctx.config.scanner_chunk_size;

		match task {
			LibraryScanTask::Init(input) => {
				tracing::debug!("Executing the init task for library scan");
				ctx.report_progress(JobProgress::msg("Handling library scan init"));
				let InitTaskInput {
					series_to_create,
					missing_series,
				} = input;

				// Task count: build each series + 1 for insertion step, +1 for update tx on missing series
				let total_subtask_count = (series_to_create.len() + 1)
					+ if !missing_series.is_empty() { 1 } else { 0 };
				let mut current_subtask_index = 0;
				ctx.report_progress(JobProgress::subtask_position(
					current_subtask_index,
					total_subtask_count as i32,
				));

				if !missing_series.is_empty() {
					ctx.report_progress(JobProgress::msg("Handling missing series"));
					let missing_series_str = missing_series
						.iter()
						.map(|e| e.to_string_lossy().to_string())
						.collect::<Vec<String>>();
					let affected_rows = ctx
						.db
						.series()
						.update_many(
							vec![series::path::in_vec(missing_series_str.clone())],
							vec![series::status::set(FileStatus::Missing.to_string())],
						)
						.exec()
						.await
						.map_or_else(
							|error| {
								tracing::error!(error = ?error, "Failed to update missing series");
								logs.push(JobExecuteLog::error(format!(
									"Failed to update missing series: {:?}",
									error.to_string()
								)));
								0
							},
							|count| {
								output.updated_series = count as u64;
								count
							},
						);

					ctx.report_progress(JobProgress::subtask_position(
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
					ctx.report_progress(JobProgress::msg(&format!(
						"Building {} series entities",
						series_to_create.len()
					)));
					// TODO: remove this DAO!!
					let series_dao = SeriesDAO::new(ctx.db.clone());

					let (built_series, failure_logs): (Vec<_>, Vec<_>) = series_to_create
						.par_iter()
						.enumerate()
						.map(|(idx, path_buf)| {
							ctx.report_progress(JobProgress::subtask_position_msg(
								format!("Building series {}", path_buf.display())
									.as_str(),
								current_subtask_index + (idx as i32),
								total_subtask_count as i32,
							));
							(
								path_buf,
								SeriesBuilder::new(path_buf.as_path(), &self.id).build(),
							)
						})
						.partition_map::<_, _, _, Series, JobExecuteLog>(
							|(path_buf, result)| match result {
								Ok(s) => Either::Left(s),
								Err(e) => Either::Right(
									JobExecuteLog::error(e.to_string())
										.with_ctx(path_buf.to_string_lossy().to_string()),
								),
							},
						);
					current_subtask_index +=
						(built_series.len() + failure_logs.len()) as i32;
					logs.extend(failure_logs);

					// TODO: make this configurable
					let chunks = built_series.chunks(400);
					let chunk_count = chunks.len();
					tracing::debug!(chunk_count, "Batch inserting new series");
					for (idx, chunk) in chunks.enumerate() {
						ctx.report_progress(JobProgress::msg(
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
								output.created_series += created_series.len() as u64;
								ctx.send_core_event(CoreEvent::CreatedManySeries {
									count: created_series.len() as u64,
									library_id: self.id.clone(),
								});
							},
							Err(e) => {
								tracing::error!(error = ?e, "Failed to batch insert series");
								logs.push(JobExecuteLog::error(format!(
									"Failed to batch insert series: {:?}",
									e.to_string()
								)));
							},
						}
					}

					current_subtask_index += 1;
					ctx.report_progress(JobProgress::subtask_position_msg(
						"Processed all chunks",
						current_subtask_index,
						total_subtask_count as i32,
					));
				} else {
					tracing::trace!("No series to create");
				}

				ctx.report_progress(JobProgress::msg("Init task complete!"));
			},
			LibraryScanTask::WalkSeries(path_buf) => {
				tracing::debug!("Executing the walk series task for library scan");
				ctx.report_progress(JobProgress::msg(
					format!("Scanning series at {}", path_buf.display()).as_str(),
				));

				// If the library is collection-priority, any child directories are 'ignored' and their
				// files are part of / folded into the top-most folder (series).
				// If the library is not collection-priority, each subdirectory is its own series.
				// Therefore, we only scan one level deep when walking a series whose library is not
				// collection-priority to avoid scanning duplicates which are part of other series
				let max_depth = self
					.options
					.as_ref()
					.and_then(|o| (!o.is_collection_based()).then_some(1));

				let Some(Ok(ignore_rules)) =
					self.options.as_ref().map(|o| o.ignore_rules.build())
				else {
					// Note: This failure will likely affect ALL other tasks, so we are halting the job here
					return Err(JobError::TaskFailed(
						"Failed to build ignore rules. Check that the rules are valid."
							.to_string(),
					));
				};

				let walk_result = walk_series(
					path_buf.as_path(),
					WalkerCtx {
						db: ctx.db.clone(),
						ignore_rules,
						max_depth,
					},
				)
				.await;

				let WalkedSeries {
					series_is_missing,
					media_to_create,
					media_to_visit,
					missing_media,
					seen_files,
					ignored_files,
					skipped_files,
				} = match walk_result {
					Ok(walked_series) => walked_series,
					Err(core_error) => {
						tracing::error!(error = ?core_error, "Critical error during attempt to walk series!");
						// NOTE: I don't error here in order to collect and report on the error later on.
						// This can perhaps be refactored later on so that the parent (Job struct) properly
						// handles this instead, however for now this is fine.
						return Ok(JobTaskOutput {
							output,
							logs: vec![JobExecuteLog::error(format!(
								"Critical error during attempt to walk series: {:?}",
								core_error.to_string()
							))],
							subtasks,
						});
					},
				};
				output.total_files += seen_files + ignored_files;
				output.ignored_files += ignored_files;
				output.skipped_files += skipped_files;

				if series_is_missing {
					ctx.report_progress(JobProgress::msg("Series not found on disk!"));
					logs.push(
						JobExecuteLog::warn("Series could not be found on disk")
							.with_ctx(path_buf.to_string_lossy().to_string()),
					);
					let MissingSeriesOutput {
						updated_series,
						updated_media,
						logs: new_logs,
					} = handle_missing_series(
						&ctx.db,
						path_buf.to_str().unwrap_or_default(),
					)
					.await?;
					output.updated_series += updated_series;
					output.updated_media += updated_media;
					logs.extend(new_logs);
					return Ok(JobTaskOutput {
						output,
						logs,
						subtasks,
					});
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
							.then_some(SeriesScanTask::MarkMissingMedia(missing_media)),
						(!media_to_create.is_empty())
							.then_some(SeriesScanTask::CreateMedia(media_to_create)),
						(!media_to_visit.is_empty())
							.then_some(SeriesScanTask::VisitMedia(media_to_visit)),
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
				path: _series_path,
				task: series_task,
			} => match series_task {
				SeriesScanTask::MarkMissingMedia(paths) => {
					ctx.report_progress(JobProgress::msg("Handling missing media"));
					let MediaOperationOutput {
						updated_media,
						logs: new_logs,
						..
					} = handle_missing_media(ctx, &series_id, paths).await;
					ctx.send_batch(vec![
						JobProgress::msg("Handled missing media").into_worker_send(),
						CoreEvent::CreatedOrUpdatedManyMedia {
							count: updated_media,
							series_id,
						}
						.into_worker_send(),
					]);
					output.updated_media += updated_media;
					logs.extend(new_logs);
				},
				SeriesScanTask::CreateMedia(paths) => {
					ctx.report_progress(JobProgress::msg(
						format!("Creating {} media entities", paths.len()).as_str(),
					));
					let MediaOperationOutput {
						created_media,
						logs: new_logs,
						..
					} = handle_create_media(
						MediaBuildOperationCtx {
							series_id: series_id.clone(),
							library_options: self.options.clone().unwrap_or_default(),
							chunk_size,
						},
						ctx,
						paths,
					)
					.await?;
					ctx.send_batch(vec![
						JobProgress::msg("Created new media").into_worker_send(),
						CoreEvent::CreatedOrUpdatedManyMedia {
							count: created_media,
							series_id,
						}
						.into_worker_send(),
					]);
					output.created_media += created_media;
					logs.extend(new_logs);
				},
				SeriesScanTask::VisitMedia(paths) => {
					ctx.report_progress(JobProgress::msg(
						format!("Visiting {} media entities on disk", paths.len())
							.as_str(),
					));
					let MediaOperationOutput {
						updated_media,
						logs: new_logs,
						..
					} = handle_visit_media(
						MediaBuildOperationCtx {
							series_id: series_id.clone(),
							library_options: self.options.clone().unwrap_or_default(),
							chunk_size,
						},
						ctx,
						paths,
					)
					.await?;
					ctx.send_batch(vec![
						JobProgress::msg("Visited all media").into_worker_send(),
						CoreEvent::CreatedOrUpdatedManyMedia {
							count: updated_media,
							series_id,
						}
						.into_worker_send(),
					]);
					output.updated_media += updated_media;
					logs.extend(new_logs);
				},
			},
		}

		Ok(JobTaskOutput {
			output,
			logs,
			subtasks,
		})
	}
}

pub async fn handle_missing_library(
	db: &PrismaClient,
	library_id: &str,
) -> Result<(), JobError> {
	let (updated_library, affected_series, affected_media) = db
		._transaction()
		.run(|client| async move {
			let updated_library = client
				.library()
				.update(
					library::id::equals(library_id.to_string()),
					vec![library::status::set(FileStatus::Missing.to_string())],
				)
				.exec()
				.await?;

			let affected_series = client
				.series()
				.update_many(
					vec![series::library_id::equals(Some(library_id.to_string()))],
					vec![series::status::set(FileStatus::Missing.to_string())],
				)
				.exec()
				.await?;

			client
				.media()
				.update_many(
					vec![media::series::is(vec![series::library_id::equals(Some(
						library_id.to_string(),
					))])],
					vec![media::status::set(FileStatus::Missing.to_string())],
				)
				.exec()
				.await
				.map(|affected_media| (updated_library, affected_series, affected_media))
		})
		.await
		.map_err(|e| {
			JobError::InitFailed(format!(
				"A critical error occurred while handling missing library: {}",
				e
			))
		})?;
	tracing::trace!(
		?updated_library,
		affected_series,
		affected_media,
		"Marked library as missing"
	);

	Ok(())
}

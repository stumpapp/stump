use std::{collections::VecDeque, path::PathBuf};

use async_graphql::SimpleObject;
use models::{
	entity::{library, library_config, library_scan_record, media, series},
	shared::enums::FileStatus,
};
use sea_orm::{prelude::*, sea_query::Query, Set, TransactionTrait};
use serde::{Deserialize, Serialize};

// TODO: hone the progress messages, they are a little noisy and unhelpful (e.g. 'Starting task')
// TODO: Refactor rayon usage to use tokio instead. I am trying to learn more about IO-bound operations in an
// async context, and I believe tokio might be more appropriate for this use case (highly concurrent IO-bound tasks).
// Also perhaps experiment with https://docs.rs/tokio-uring/latest/tokio_uring/index.html

use crate::{
	event,
	filesystem::{
		image::{ThumbnailGenerationJob, ThumbnailGenerationJobParams},
		scanner::utils::safely_insert_series,
	},
	job::{
		error::JobError, CoreJobOutput, Executor, JobExecuteLog, JobExt, JobOutputExt,
		JobProgress, JobTaskOutput, WorkerCtx, WorkerSendExt, WorkingState, WrappedJob,
	},
	utils::chain_optional_iter,
	CoreEvent,
};

use super::{
	series_scan_job::SeriesScanTask,
	utils::{
		handle_missing_media, handle_missing_series, handle_restored_media,
		safely_build_and_insert_media, safely_build_series, visit_and_update_media,
		MediaBuildOperation, MediaOperationOutput, MissingSeriesOutput,
	},
	walk_library, walk_series, ScanOptions, WalkedLibrary, WalkedSeries, WalkerCtx,
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
	recovered_series: Vec<String>,
}

/// A job that scans a library and updates the database with the results
#[derive(Clone)]
pub struct LibraryScanJob {
	/// The ID of the library to scan
	pub id: String,
	/// The path to the library to scan
	pub path: String,
	/// The library configuration to use
	pub config: Option<library_config::Model>,
	/// The scan options to use, if any
	pub options: ScanOptions,
}

impl LibraryScanJob {
	pub fn new(
		id: String,
		path: String,
		options: Option<ScanOptions>,
	) -> Box<WrappedJob<LibraryScanJob>> {
		WrappedJob::new(Self {
			id,
			path,
			config: None,
			options: options.unwrap_or_default(),
		})
	}
}

/// The data that is collected and updated during the execution of a library scan job
#[derive(Clone, Serialize, Deserialize, Default, Debug, SimpleObject)]
#[serde(rename_all = "camelCase")]
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
		// Note: We ignore the potential self.config here in the event that it was
		// updated since being queued. This is perhaps a bit overly cautious, but it's
		// just one additional query.
		let config = library_config::Entity::find()
			.filter(library_config::Column::LibraryId.eq(self.id.clone()))
			.one(ctx.conn.as_ref())
			.await?
			.ok_or(JobError::InitFailed(
				"Library is missing configuration".to_string(),
			))?;
		let is_collection_based = config.is_collection_based();
		let ignore_rules = config.ignore_rules().build()?;

		self.config = Some(config);

		ctx.report_progress(JobProgress::msg("Performing task discovery"));
		let WalkedLibrary {
			series_to_create,
			recovered_series,
			series_to_visit,
			missing_series,
			library_is_missing,
			ignored_directories,
			seen_directories,
		} = walk_library(
			&self.path,
			WalkerCtx {
				db: ctx.conn.clone(),
				ignore_rules,
				max_depth: is_collection_based.then_some(1),
				options: self.options,
			},
		)
		.await?;
		tracing::debug!(
			series_to_create = series_to_create.len(),
			series_to_visit = series_to_visit.len(),
			missing_series = missing_series.len(),
			recovered_series = recovered_series.len(),
			library_is_missing,
			"Walked library"
		);
		output.total_directories = seen_directories + ignored_directories;
		output.ignored_directories = ignored_directories;

		if library_is_missing {
			handle_missing_library(&ctx.conn, self.id.as_str()).await?;
			ctx.send_batch(vec![
				JobProgress::msg("Failed to find library on disk").into_worker_send(),
				CoreEvent::DiscoveredMissingLibrary(event::DiscoveredMissingLibrary {
					id: self.id.clone(),
				})
				.into_worker_send(),
			]);
			return Err(JobError::InitFailed(
				"Library could not be found on disk".to_string(),
			));
		}

		ctx.report_progress(JobProgress::msg("Building tasks"));

		let init_task_input = InitTaskInput {
			series_to_create: series_to_create.clone(),
			missing_series,
			recovered_series,
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
		ctx.send_core_event(CoreEvent::JobOutput(event::JobOutput {
			id: ctx.job_id.clone(),
			output: CoreJobOutput::LibraryScan(output.clone()),
		}));

		let did_create = output.created_series > 0 || output.created_media > 0;
		let did_update = output.updated_series > 0 || output.updated_media > 0;
		let image_options = self
			.config
			.as_ref()
			.and_then(|o| o.thumbnail_config.clone());

		if let Err(error) = handle_scan_complete(self, ctx, &self.options).await {
			tracing::error!(error = ?error, "Failed to handle scan completion");
		}

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

		let max_concurrency = ctx.config.max_scanner_concurrency;

		match task {
			LibraryScanTask::Init(input) => {
				tracing::debug!("Executing the init task for library scan");
				ctx.report_progress(JobProgress::msg("Handling library scan init"));
				let InitTaskInput {
					series_to_create,
					missing_series,
					recovered_series,
				} = input;

				let recovered_series_step_count =
					if !recovered_series.is_empty() { 1 } else { 0 };

				// Task count: build each series + 1 for insertion step, +1 for update tx on missing series
				let total_subtask_count = (series_to_create.len() + 1)
					+ usize::from(!missing_series.is_empty())
					+ recovered_series_step_count;
				let mut current_subtask_index = 0;
				ctx.report_progress(JobProgress::subtask_position(
					current_subtask_index,
					total_subtask_count as i32,
				));

				if !recovered_series.is_empty() {
					ctx.report_progress(JobProgress::msg("Recovering series"));

					let affected_rows = series::Entity::update_many()
						.col_expr(
							series::Column::Status,
							Expr::value(FileStatus::Ready.to_string()),
						)
						.filter(series::Column::Id.is_in(recovered_series))
						.exec(ctx.conn.as_ref())
						.await
						.map_or_else(
							|error| {
								tracing::error!(error = ?error, "Failed to recover series");
								logs.push(JobExecuteLog::error(format!(
									"Failed to recover series: {:?}",
									error.to_string()
								)));
								0
							},
							|result| {
								output.updated_series = result.rows_affected;
								result.rows_affected
							},
						);

					ctx.report_progress(JobProgress::subtask_position(
						if affected_rows > 0 {
							current_subtask_index += 1;
							current_subtask_index
						} else {
							0
						},
						total_subtask_count as i32,
					));
				}

				if !missing_series.is_empty() {
					ctx.report_progress(JobProgress::msg("Handling missing series"));
					let missing_series_str = missing_series
						.iter()
						.map(|e| e.to_string_lossy().to_string())
						.collect::<Vec<String>>();

					let affected_rows = series::Entity::update_many()
						.col_expr(
							series::Column::Status,
							Expr::value(FileStatus::Missing.to_string()),
						)
						.filter(series::Column::Path.is_in(missing_series_str))
						.exec(ctx.conn.as_ref())
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
							|result| {
								output.updated_series = result.rows_affected;
								result.rows_affected
							},
						);

					ctx.report_progress(JobProgress::subtask_position(
						if affected_rows > 0 {
							{
								current_subtask_index += 1;
								current_subtask_index
							}
						} else {
							0
						},
						total_subtask_count as i32,
					));
				}

				if !series_to_create.is_empty() {
					ctx.report_progress(JobProgress::msg("Building new series"));

					let task_count = series_to_create.len() as i32;
					let (built_series, failure_logs) = safely_build_series(
						&self.id,
						series_to_create,
						ctx.config.as_ref(),
						|position| {
							ctx.report_progress(JobProgress::subtask_position(
								position as i32,
								task_count,
							))
						},
					)
					.await;

					current_subtask_index +=
						(built_series.len() + failure_logs.len()) as i32;
					logs.extend(failure_logs);

					let chunks = built_series.chunks(200);
					let chunk_count = chunks.len();
					tracing::trace!(chunk_count, "Batch inserting new series");

					for (idx, chunk) in chunks.enumerate() {
						ctx.report_progress(JobProgress::subtask_position_msg(
							"Inserting built series in batches",
							(idx + 1) as i32,
							chunk_count as i32,
						));
						match safely_insert_series(chunk.to_vec(), ctx.conn.as_ref())
							.await
						{
							Ok(created_series) => {
								output.created_series += created_series.len() as u64;
								ctx.send_core_event(CoreEvent::CreatedManySeries(
									event::CreatedManySeries {
										count: created_series.len() as u64,
										library_id: self.id.clone(),
									},
								));
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
				ctx.report_progress(JobProgress::msg(&format!(
					"Scanning series at {}",
					path_buf.display()
				)));

				// If the library is collection-priority, any child directories are 'ignored' and their
				// files are part of / folded into the top-most folder (series).
				// If the library is not collection-priority, each subdirectory is its own series.
				// Therefore, we only scan one level deep when walking a series whose library is not
				// collection-priority to avoid scanning duplicates which are part of other series
				let mut max_depth = self
					.config
					.as_ref()
					.and_then(|o| (!o.is_collection_based()).then_some(1));
				if path_buf == PathBuf::from(&self.path) {
					// The exception is when the series "is" the libray (i.e. the root of the library contains
					// books). This is kind of an anti-pattern wrt collection-priority, but it needs to be handled
					// in order to avoid the scanner re-scanning the entire library...
					max_depth = Some(1);
				}

				let ignore_rules =
					match self.config.as_ref().map(|c| c.ignore_rules().build()) {
						Some(Ok(rules)) => rules,
						Some(Err(err)) => {
							tracing::error!(error = ?err, "Failed to build ignore rules");
							return Err(JobError::TaskFailed(
							"Failed to build ignore rules. Check that the rules are valid."
								.to_string(),
						));
						},
						_ => {
							tracing::error!(?self.config, "Library config is missing?");
							return Err(JobError::TaskFailed(
							"A critical error occurred while attempting to scan the library"
								.to_string(),
						));
						},
					};

				let walk_result = walk_series(
					path_buf.as_path(),
					WalkerCtx {
						db: ctx.conn.clone(),
						ignore_rules,
						max_depth,
						options: self.options,
					},
				)
				.await;

				let WalkedSeries {
					series_is_missing,
					media_to_create,
					media_to_visit,
					recovered_media,
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
						&ctx.conn,
						path_buf.to_str().unwrap_or_default(),
					)
					.await?;
					output.updated_series += updated_series;
					output.updated_media += updated_media;
					logs.extend(new_logs);
					return Ok(JobTaskOutput {
						output,
						subtasks,
						logs,
					});
				}

				let series_path_str = path_buf.to_str().unwrap_or_default().to_string();

				let series = series::Entity::find()
					.filter(series::Column::Path.eq(series_path_str.clone()))
					.into_model::<series::SeriesIdentSelect>()
					.one(ctx.conn.as_ref())
					.await?
					.ok_or(JobError::TaskFailed("Series not found".to_string()))?;

				subtasks = chain_optional_iter(
					[],
					[
						(!missing_media.is_empty())
							.then_some(SeriesScanTask::MarkMissingMedia(missing_media)),
						(!recovered_media.is_empty())
							.then_some(SeriesScanTask::RestoreMedia(recovered_media)),
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
				SeriesScanTask::RestoreMedia(ids) => {
					ctx.report_progress(JobProgress::msg("Restoring media entities"));
					let MediaOperationOutput {
						updated_media,
						logs: new_logs,
						..
					} = handle_restored_media(ctx, &series_id, ids).await;
					ctx.send_batch(vec![
						JobProgress::msg("Restored media entities").into_worker_send(),
						CoreEvent::CreatedOrUpdatedManyMedia(
							event::CreatedOrUpdatedManyMedia {
								count: updated_media,
								series_id,
							},
						)
						.into_worker_send(),
					]);
					output.updated_media += updated_media;
					logs.extend(new_logs);
				},
				SeriesScanTask::MarkMissingMedia(paths) => {
					ctx.report_progress(JobProgress::msg("Handling missing media"));
					let MediaOperationOutput {
						updated_media,
						logs: new_logs,
						..
					} = handle_missing_media(ctx, &series_id, paths).await;
					ctx.send_batch(vec![
						JobProgress::msg("Handled missing media").into_worker_send(),
						CoreEvent::CreatedOrUpdatedManyMedia(
							event::CreatedOrUpdatedManyMedia {
								count: updated_media,
								series_id,
							},
						)
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
					} = safely_build_and_insert_media(
						MediaBuildOperation {
							series_id: series_id.clone(),
							library_config: self.config.clone().ok_or(
								JobError::TaskFailed(
									"Library configuration is missing".to_string(),
								),
							)?,
							max_concurrency,
						},
						ctx,
						paths,
					)
					.await?;
					ctx.send_batch(vec![
						JobProgress::msg("Created new media").into_worker_send(),
						CoreEvent::CreatedOrUpdatedManyMedia(
							event::CreatedOrUpdatedManyMedia {
								count: created_media,
								series_id,
							},
						)
						.into_worker_send(),
					]);
					output.created_media += created_media;
					logs.extend(new_logs);
				},
				SeriesScanTask::VisitMedia(params) => {
					ctx.report_progress(JobProgress::msg(
						format!("Visiting {} media entities on disk", params.len())
							.as_str(),
					));
					let MediaOperationOutput {
						updated_media,
						logs: new_logs,
						..
					} = visit_and_update_media(
						MediaBuildOperation {
							series_id: series_id.clone(),
							library_config: self.config.clone().ok_or(
								JobError::TaskFailed(
									"Library configuration is missing".to_string(),
								),
							)?,
							max_concurrency,
						},
						ctx,
						params,
					)
					.await?;
					ctx.send_batch(vec![
						JobProgress::msg("Visited all media").into_worker_send(),
						CoreEvent::CreatedOrUpdatedManyMedia(
							event::CreatedOrUpdatedManyMedia {
								count: updated_media,
								series_id,
							},
						)
						.into_worker_send(),
					]);
					output.updated_media += updated_media;
					logs.extend(new_logs);
				},
			},
		}

		Ok(JobTaskOutput {
			output,
			subtasks,
			logs,
		})
	}
}

pub async fn handle_missing_library(
	conn: &DatabaseConnection,
	library_id: &str,
) -> Result<(), JobError> {
	let txn = conn.begin().await?;

	let _affected_libraries = library::Entity::update_many()
		.col_expr(
			library::Column::Status,
			Expr::value(FileStatus::Missing.to_string()),
		)
		.filter(library::Column::Id.eq(library_id))
		.exec(&txn)
		.await?
		.rows_affected;

	let affected_series = series::Entity::update_many()
		.col_expr(
			series::Column::Status,
			Expr::value(FileStatus::Missing.to_string()),
		)
		.filter(series::Column::LibraryId.eq(library_id))
		.exec(&txn)
		.await?
		.rows_affected;

	let affected_books = media::Entity::update_many()
		.col_expr(
			media::Column::Status,
			Expr::value(FileStatus::Missing.to_string()),
		)
		.filter(
			media::Column::SeriesId.in_subquery(
				Query::select()
					.column(series::Column::Id)
					.from(series::Entity)
					.and_where(series::Column::LibraryId.eq(library_id))
					.to_owned(),
			),
		)
		.exec(&txn)
		.await?
		.rows_affected;

	txn.commit().await?;

	tracing::info!(affected_series, affected_books, "Marked library as missing");

	Ok(())
}

async fn handle_scan_complete(
	job: &LibraryScanJob,
	ctx: &WorkerCtx,
	options: &ScanOptions,
) -> Result<(), JobError> {
	let conn = ctx.conn.as_ref();
	let now = chrono::Utc::now();

	let update_result = library::Entity::update_many()
		.col_expr(
			library::Column::LastScannedAt,
			Expr::value(now.to_rfc3339()),
		)
		.filter(library::Column::Id.eq(job.id.clone()))
		.exec(conn)
		.await;

	if let Err(error) = update_result {
		tracing::error!(?error, "Failed to update library last scanned at");
	}

	let persisted_options = if options.is_default() {
		None
	} else {
		match serde_json::to_vec(&options) {
			Ok(data) => Some(data),
			Err(e) => {
				tracing::error!(error = ?e, "Failed to serialize scan options");
				None
			},
		}
	};

	let insert_result =
		library_scan_record::Entity::insert(library_scan_record::ActiveModel {
			options: Set(persisted_options),
			timestamp: Set(now.into()),
			job_id: Set(Some(ctx.job_id.clone())),
			library_id: Set(job.id.clone()),
			..Default::default()
		})
		.exec(conn)
		.await;

	if let Err(error) = insert_result {
		tracing::error!(?error, "Failed to insert library scan record");
	}

	Ok(())
}

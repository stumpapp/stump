use std::{collections::VecDeque, path::PathBuf};

use async_graphql::SimpleObject;
use models::{
	entity::{library, library_config, media, series},
	shared::enums::FileStatus,
};
use sea_orm::{prelude::*, sea_query::Query, Condition, UpdateResult};
use serde::{Deserialize, Serialize};

use crate::{
	event,
	filesystem::image::{ThumbnailGenerationJob, ThumbnailGenerationJobParams},
	job::{
		error::JobError, CoreJobOutput, Executor, JobExt, JobOutputExt, JobProgress,
		JobTaskOutput, WorkerCtx, WorkerSendExt, WorkingState, WrappedJob,
	},
	utils::chain_optional_iter,
	CoreEvent,
};

use super::{
	options::BookVisitOperation,
	utils::{
		handle_missing_media, handle_restored_media, safely_build_and_insert_media,
		visit_and_update_media, MediaBuildOperation, MediaOperationOutput,
	},
	walk_series, ScanOptions, WalkedSeries, WalkerCtx,
};

#[allow(clippy::enum_variant_names)]
#[derive(Serialize, Deserialize)]
pub enum SeriesScanTask {
	MarkMissingMedia(Vec<PathBuf>),
	RestoreMedia(Vec<String>),
	CreateMedia(Vec<PathBuf>),
	VisitMedia(Vec<(PathBuf, BookVisitOperation)>),
}

#[derive(Clone)]
pub struct SeriesScanJob {
	pub id: String,
	pub path: String,
	pub config: Option<library_config::Model>,
	pub options: ScanOptions,
}

impl SeriesScanJob {
	pub fn new(
		id: String,
		path: String,
		options: Option<ScanOptions>,
	) -> Box<WrappedJob<SeriesScanJob>> {
		WrappedJob::new(Self {
			id,
			path,
			config: None,
			options: options.unwrap_or_default(),
		})
	}
}

// TODO: emit progress events. This job isn't exposed in the UI yet, so it's not a big deal for now

#[derive(Clone, Serialize, Deserialize, Default, Debug, SimpleObject)]
#[serde(rename_all = "camelCase")]
pub struct SeriesScanOutput {
	/// The number of files to scan relative to the series root
	total_files: u64,
	/// The number of files that were ignored during the scan
	ignored_files: u64,
	/// The number of files that were deemed to be skipped during the scan, e.g. it
	/// exists in the database but has not been modified since the last scan
	skipped_files: u64,
	/// The number of media entities that were created
	created_media: u64,
	/// The number of media entities that were updated
	updated_media: u64,
}

impl JobOutputExt for SeriesScanOutput {
	fn update(&mut self, updated: Self) {
		self.total_files += updated.total_files;
		self.ignored_files += updated.ignored_files;
		self.skipped_files += updated.skipped_files;
		self.created_media += updated.created_media;
		self.updated_media += updated.updated_media;
	}
}

#[async_trait::async_trait]
impl JobExt for SeriesScanJob {
	const NAME: &'static str = "series_scan";

	type Output = SeriesScanOutput;
	type Task = SeriesScanTask;

	fn description(&self) -> Option<String> {
		Some(self.path.clone())
	}

	async fn init(
		&mut self,
		ctx: &WorkerCtx,
	) -> Result<WorkingState<Self::Output, Self::Task>, JobError> {
		let mut output = Self::Output::default();
		let path_buf = PathBuf::from(self.path.clone());

		let (library, config) = library::Entity::find()
			.filter(
				Condition::all().add(
					library::Column::Id.in_subquery(
						Query::select()
							.column(series::Column::LibraryId)
							.from(series::Entity)
							.and_where(series::Column::Id.eq(self.id.clone()))
							.and_where(series::Column::Path.eq(self.path.clone()))
							.to_owned(),
					),
				),
			)
			.find_also_related(library_config::Entity)
			.one(ctx.conn.as_ref())
			.await?
			.ok_or(JobError::InitFailed("Library not found".to_string()))?;

		let config = config.ok_or(JobError::InitFailed(
			"Library is missing a configuration".to_string(),
		))?;

		let ignore_rules = config.ignore_rules().build()?;

		// If the library is collection-priority, any child directories are 'ignored' and their
		// files are part of / folded into the top-most folder (series).
		// If the library is not collection-priority, each subdirectory is its own series.
		// Therefore, we only scan one level deep when walking a series whose library is not
		// collection-priority to avoid scanning duplicates which are part of other series
		let mut max_depth = (!config.is_collection_based()).then_some(1);
		if path_buf == PathBuf::from(&library.path) {
			// The exception is when the series "is" the libray (i.e. the root of the library contains
			// books). This is kind of an anti-pattern wrt collection-priority, but it needs to be handled
			// in order to avoid the scanner re-scanning the entire library...
			max_depth = Some(1);
		}

		self.config = Some(config);

		let WalkedSeries {
			series_is_missing,
			media_to_create,
			media_to_visit,
			recovered_media,
			missing_media,
			seen_files,
			ignored_files,
			skipped_files,
		} = walk_series(
			PathBuf::from(self.path.clone()).as_path(),
			WalkerCtx {
				db: ctx.conn.clone(),
				ignore_rules,
				max_depth,
				options: self.options,
			},
		)
		.await?;

		if series_is_missing {
			let _ = handle_missing_series(&ctx.conn, self.path.as_str()).await;
			return Err(JobError::InitFailed(
				"Series could not be found on disk".to_string(),
			));
		}

		tracing::debug!(
			media_to_create = media_to_create.len(),
			media_to_visit = media_to_visit.len(),
			"Walked series"
		);
		output.total_files = seen_files + ignored_files;
		output.ignored_files = ignored_files;
		output.skipped_files = skipped_files;

		let tasks = VecDeque::from(chain_optional_iter(
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
		));

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
			output: CoreJobOutput::SeriesScan(output.clone()),
		}));
		let did_create = output.created_media > 0;
		let did_update = output.updated_media > 0;
		let image_options = self
			.config
			.as_ref()
			.and_then(|o| o.thumbnail_config.clone());

		match image_options {
			Some(options) if did_create | did_update => {
				tracing::trace!("Thumbnail generation job should be enqueued");
				Ok(Some(WrappedJob::new(ThumbnailGenerationJob {
					options,
					params: ThumbnailGenerationJobParams::single_series(
						self.id.clone(),
						false,
					),
				})))
			},
			_ => {
				tracing::trace!("No cleanup required for series scan job");
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

		let max_concurrency = ctx.config.max_scanner_concurrency;

		match task {
			SeriesScanTask::RestoreMedia(ids) => {
				ctx.report_progress(JobProgress::msg("Restoring media entities"));
				let MediaOperationOutput {
					updated_media,
					logs: new_logs,
					..
				} = handle_restored_media(ctx, &self.id, ids).await;
				ctx.send_batch(vec![
					JobProgress::msg("Restored media entities").into_worker_send(),
					CoreEvent::CreatedOrUpdatedManyMedia(
						event::CreatedOrUpdatedManyMedia {
							count: updated_media,
							series_id: self.id.clone(),
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
				} = handle_missing_media(ctx, &self.id, paths).await;
				ctx.send_batch(vec![
					JobProgress::msg("Handled missing media").into_worker_send(),
					CoreEvent::CreatedOrUpdatedManyMedia(
						event::CreatedOrUpdatedManyMedia {
							count: updated_media,
							series_id: self.id.clone(),
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
						series_id: self.id.clone(),
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
							series_id: self.id.clone(),
						},
					)
					.into_worker_send(),
				]);
				output.created_media += created_media;
				logs.extend(new_logs);
			},
			SeriesScanTask::VisitMedia(params) => {
				ctx.report_progress(JobProgress::msg(
					format!("Visiting {} media entities on disk", params.len()).as_str(),
				));
				let MediaOperationOutput {
					updated_media,
					logs: new_logs,
					..
				} = visit_and_update_media(
					MediaBuildOperation {
						series_id: self.id.clone(),
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
							series_id: self.id.clone(),
						},
					)
					.into_worker_send(),
				]);
				output.updated_media += updated_media;
				logs.extend(new_logs);
			},
		}

		Ok(JobTaskOutput {
			output,
			logs,
			subtasks: vec![],
		})
	}
}

async fn handle_missing_series(
	conn: &DatabaseConnection,
	path: &str,
) -> Result<(), JobError> {
	let affected_rows = series::Entity::update_many()
		.filter(series::Column::Path.eq(path))
		.col_expr(
			series::Column::Status,
			Expr::value(FileStatus::Missing.to_string()),
		)
		.exec(conn)
		.await
		.unwrap_or_else(|error| {
			tracing::error!(error = ?error, "Failed to update missing series");
			UpdateResult::default()
		})
		.rows_affected;
	tracing::trace!(affected_rows, "Marked series as missing");

	if affected_rows > 1 {
		tracing::warn!(?path, "Updated more than expected");
	}

	let affected_media = media::Entity::update_many()
		.filter(media::Column::SeriesId.eq(path))
		.col_expr(
			media::Column::Status,
			Expr::value(FileStatus::Missing.to_string()),
		)
		.exec(conn)
		.await
		.unwrap_or_else(|error| {
			tracing::error!(error = ?error, "Failed to update missing media");
			UpdateResult::default()
		})
		.rows_affected;
	tracing::trace!(?affected_media, "Marked media as missing");

	Ok(())
}

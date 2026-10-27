use std::str::FromStr;
use std::sync::Arc;

use chrono::Utc;
use croner::Cron;
use models::entity::{
	library, llm_library_tag_draft, llm_tag_suggestion, metadata_fetch_record,
	scheduled_job,
};
use models::shared::enums::{
	LlmLibraryTagDraftStatus, LlmTagSuggestionStatus, MetadataFetchStatus,
	ScheduledJobKind,
};
use sea_orm::{prelude::*, EntityTrait, QueryFilter, QueryOrder, QuerySelect};

use crate::database::SQLITE_BIND_LIMIT;
use crate::job::StumpJob;
use crate::llm_tagging::{LlmLibraryTagJobParams, LlmTagJobParams};
use crate::metadata::provider::MetadataFetchJobParams;
use crate::{CoreError, CoreResult, Ctx};

/// A scheduler that loads cron-based jobs and spawns them accordingly
#[must_use = "dropping the JobScheduler aborts all scheduled job loops"]
pub struct JobScheduler {
	handles: Vec<tokio::task::JoinHandle<()>>,
}

impl JobScheduler {
	pub async fn init(ctx: Arc<Ctx>) -> CoreResult<Self> {
		let jobs = scheduled_job::Entity::find()
			.filter(scheduled_job::Column::Enabled.eq(true))
			.all(ctx.conn.as_ref())
			.await?;

		let mut scheduler = Self {
			handles: Vec::with_capacity(jobs.len()),
		};

		for job in jobs {
			match Cron::from_str(&job.schedule) {
				Ok(cron) => {
					tracing::info!(
						id = job.id,
						name = %job.name,
						kind = ?job.kind,
						schedule = %job.schedule,
						"Starting scheduled job"
					);
					let ctx = Arc::clone(&ctx);
					let handle = tokio::spawn(cron_loop(job, cron, ctx));
					scheduler.handles.push(handle);
				},
				Err(error) => {
					// TODO: Persisted log for UI to see
					tracing::error!(
						id = job.id,
						name = %job.name,
						schedule = %job.schedule,
						?error,
						"Invalid cron expression, skipping scheduled job"
					);
				},
			}
		}

		tracing::info!(job_count = scheduler.handles.len(), "Scheduler initialized");

		Ok(scheduler)
	}

	pub fn job_count(&self) -> usize {
		self.handles.len()
	}
}

impl Drop for JobScheduler {
	fn drop(&mut self) {
		for handle in &self.handles {
			handle.abort();
		}
	}
}

/// The main loop for a single scheduled job based on its cron expression
#[tracing::instrument(fields(job_id = %job.id, job_name = %job.name), skip(ctx))]
async fn cron_loop(job: scheduled_job::Model, cron: Cron, ctx: Arc<Ctx>) {
	loop {
		let now = Utc::now();
		let next = match cron.find_next_occurrence(&now, false) {
			Ok(t) => t,
			Err(e) => {
				tracing::warn!(?e, "No upcoming fire time for cron schedule, stopping");
				return;
			},
		};

		let duration = (next - now).to_std().unwrap_or_default();
		tracing::debug!(
			next = %next,
			secs_until = duration.as_secs(),
			"Sleeping until next fire"
		);

		tokio::time::sleep(duration).await;

		tracing::info!("Firing scheduled job");

		if let Err(error) = dispatch(&job, &ctx).await {
			tracing::error!(
				id = job.id,
				name = %job.name,
				?error,
				"Scheduled job dispatch failed"
			);
		}

		if let Err(error) = scheduled_job::Entity::update_many()
			.col_expr(
				scheduled_job::Column::LastRunAt,
				sea_orm::sea_query::Expr::value(Utc::now()),
			)
			.filter(scheduled_job::Column::Id.eq(job.id))
			.exec(ctx.conn.as_ref())
			.await
		{
			tracing::error!(
				id = job.id,
				name = %job.name,
				?error,
				"Failed to update last_run_at"
			);
		}
	}
}

/// Dispatch a scheduled job based on its kind
async fn dispatch(job: &scheduled_job::Model, ctx: &Ctx) -> CoreResult<()> {
	match job.kind {
		ScheduledJobKind::LibraryScan => dispatch_library_scan(job, ctx).await,
		ScheduledJobKind::MetadataRetry => dispatch_metadata_retry(job, ctx).await,
		ScheduledJobKind::LlmTagRetry => dispatch_llm_tag_retry(job, ctx).await,
	}
}

async fn dispatch_library_scan(job: &scheduled_job::Model, ctx: &Ctx) -> CoreResult<()> {
	let config = job.library_scan_config().ok_or(CoreError::InternalError(
		"Invalid scheduled scan config".to_string(),
	))?;

	let libraries = if config.library_ids.is_empty() {
		library::Entity::find().all(ctx.conn.as_ref()).await?
	} else {
		library::Entity::find()
			.filter(library::Column::Id.is_in(config.library_ids.clone()))
			.all(ctx.conn.as_ref())
			.await?
	};

	if libraries.is_empty() {
		tracing::warn!("No libraries found for scheduled scan");
		return Ok(());
	}

	for lib in libraries {
		tracing::info!(
			library_name = %lib.name,
			"Enqueuing library scan from scheduler"
		);
		ctx.enqueue(StumpJob::library_scan(
			lib.id.clone(),
			lib.path.clone(),
			None,
		))
		.await
		.map_err(|e| CoreError::InternalError(e.to_string()))?;
	}

	Ok(())
}

async fn dispatch_metadata_retry(
	job: &scheduled_job::Model,
	ctx: &Ctx,
) -> CoreResult<()> {
	let config = job.metadata_retry_config();

	let statuses = config
		.as_ref()
		.map(|c| c.statuses.clone())
		.unwrap_or_else(|| vec![MetadataFetchStatus::RateLimited]);

	let records = metadata_fetch_record::Entity::find()
		.filter(metadata_fetch_record::Column::Status.is_in(statuses))
		.all(ctx.conn.as_ref())
		.await?;

	if records.is_empty() {
		tracing::debug!(
			id = job.id,
			name = %job.name,
			"No records to retry"
		);
		return Ok(());
	}

	let series_ids: Vec<String> =
		records.iter().filter_map(|r| r.series_id.clone()).collect();
	let media_ids: Vec<String> =
		records.iter().filter_map(|r| r.media_id.clone()).collect();

	if !series_ids.is_empty() {
		tracing::info!(
			count = series_ids.len(),
			"Enqueuing metadata retry for series"
		);
		let params = MetadataFetchJobParams::series(series_ids);
		ctx.enqueue(StumpJob::metadata_fetch(params))
			.await
			.map_err(|e| CoreError::InternalError(e.to_string()))?;
	}

	if !media_ids.is_empty() {
		tracing::info!(
			count = media_ids.len(),
			"Enqueuing metadata retry for media"
		);
		let params = MetadataFetchJobParams::media(media_ids);
		ctx.enqueue(StumpJob::metadata_fetch(params))
			.await
			.map_err(|e| CoreError::InternalError(e.to_string()))?;
	}

	Ok(())
}

/// Retries LLM tagging work that was rate-limited: per-book suggestions and
/// library-wide analysis drafts. Drafts are resumed in place via their
/// `completed_batches` cursor.
async fn dispatch_llm_tag_retry(job: &scheduled_job::Model, ctx: &Ctx) -> CoreResult<()> {
	let config = job.llm_tag_retry_config();

	let rate_limited_media: Vec<String> = llm_tag_suggestion::Entity::find()
		.select_only()
		.column(llm_tag_suggestion::Column::MediaId)
		.filter(
			llm_tag_suggestion::Column::Status.eq(LlmTagSuggestionStatus::RateLimited),
		)
		.into_tuple()
		.all(ctx.conn.as_ref())
		.await?;

	for chunk in rate_limited_media.chunks(SQLITE_BIND_LIMIT) {
		if chunk.is_empty() {
			continue;
		}
		tracing::info!(count = chunk.len(), "Enqueuing LLM tag retry for media");
		let params = LlmTagJobParams::media(chunk.to_vec());
		ctx.enqueue(StumpJob::llm_tag(params))
			.await
			.map_err(|e| CoreError::InternalError(e.to_string()))?;
	}

	let mut draft_query = llm_library_tag_draft::Entity::find()
		.filter(
			llm_library_tag_draft::Column::Status
				.eq(LlmLibraryTagDraftStatus::RateLimited),
		)
		.order_by_desc(llm_library_tag_draft::Column::Id);

	if let Some(config) = config {
		if !config.library_ids.is_empty() {
			draft_query = draft_query.filter(
				llm_library_tag_draft::Column::LibraryId.is_in(config.library_ids),
			);
		}
	}

	let drafts = draft_query.all(ctx.conn.as_ref()).await?;

	for draft in drafts {
		tracing::info!(
			draft_id = draft.id,
			library_id = %draft.library_id,
			completed_batches = draft.completed_batches,
			"Enqueuing LLM library tag analysis retry"
		);
		let params = LlmLibraryTagJobParams::new(draft.library_id, false);
		ctx.enqueue(StumpJob::llm_library_tag(params))
			.await
			.map_err(|e| CoreError::InternalError(e.to_string()))?;
	}

	Ok(())
}

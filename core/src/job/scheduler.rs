use std::str::FromStr;
use std::sync::Arc;

use chrono::Utc;
use cron::Schedule;
use models::entity::{library, metadata_fetch_record, scheduled_job};
use models::shared::enums::{MetadataFetchStatus, ScheduledJobKind};
use sea_orm::{prelude::*, EntityTrait, QueryFilter};

use crate::filesystem::metadata::MetadataFetchJobParams;
use crate::job::stump_job::StumpJob;
use crate::{CoreError, CoreResult, Ctx};

/// A scheduler that loads cron-based jobs and spawns them accordingly
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
			match Schedule::from_str(&job.schedule) {
				Ok(schedule) => {
					tracing::info!(
						id = job.id,
						name = %job.name,
						kind = ?job.kind,
						schedule = %job.schedule,
						"Starting scheduled job"
					);
					let ctx = Arc::clone(&ctx);
					let handle = tokio::spawn(cron_loop(job, schedule, ctx));
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
async fn cron_loop(job: scheduled_job::Model, schedule: Schedule, ctx: Arc<Ctx>) {
	loop {
		let now = Utc::now();
		let next = match schedule.upcoming(Utc).next() {
			Some(t) => t,
			None => {
				tracing::warn!("No upcoming fire time for cron schedule, stopping");
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

use std::{sync::Arc, time::Instant};

use crate::{
	config::StumpConfig,
	event::{CoreEvent, JobOutput},
	job::JobUpdate,
	CoreError,
};
use dashmap::DashMap;
use models::entity::{job, log, server_config};
use sea_orm::{
	prelude::*, sea_query::OnConflict, sqlx::types::chrono::Utc, ActiveValue::Set,
	DatabaseConnection, SelectColumns,
};
use serde::Serialize;
use tokio::sync::broadcast;
use tokio_util::sync::CancellationToken;

use apalis::prelude::{MemoryStorage, MessageQueue};

use super::{
	error::JobError, stump_job::StumpJob, CoreJobOutput, JobExecuteLog, JobOutputExt,
	JobProgress, JobStatus,
};

#[derive(Clone)]
pub struct ApalisWorkerState {
	pub conn: Arc<DatabaseConnection>,
	pub config: Arc<StumpConfig>,
	pub core_event_tx: broadcast::Sender<CoreEvent>,
	pub cancellation_tokens: Arc<DashMap<String, CancellationToken>>,
	pub job_storage: MemoryStorage<StumpJob>,
}

impl ApalisWorkerState {
	pub fn new(
		conn: Arc<DatabaseConnection>,
		config: Arc<StumpConfig>,
		core_event_tx: broadcast::Sender<CoreEvent>,
		job_storage: MemoryStorage<StumpJob>,
	) -> Self {
		Self {
			conn,
			config,
			core_event_tx,
			cancellation_tokens: Arc::new(DashMap::new()),
			job_storage,
		}
	}

	/// Cancel a running job by ID, returning true if a cancellation token was found and cancelled
	pub fn cancel_job(&self, job_id: &str) -> bool {
		if let Some(entry) = self.cancellation_tokens.get(job_id) {
			entry.value().cancel();
			true
		} else {
			false
		}
	}

	/// Cancel all jobs still marked as Running in the DB
	pub async fn cancel_islanded_jobs(&self) -> Result<(), JobError> {
		let affected_rows = job::Entity::update_many()
			.filter(job::Column::Status.eq(JobStatus::Running.to_string()))
			.col_expr(
				job::Column::Status,
				Expr::value(JobStatus::Cancelled.to_string()),
			)
			.col_expr(
				job::Column::CompletedAt,
				Expr::value(Some(Utc::now().fixed_offset())),
			)
			.exec(self.conn.as_ref())
			.await?
			.rows_affected;

		tracing::debug!(affected_rows, "Cancelled islanded jobs");
		Ok(())
	}
}

/// Per-execution context for a specific running job
pub struct JobContext {
	pub job_id: String,
	pub apalis_state: Arc<ApalisWorkerState>,
	pub cancel_token: CancellationToken,
	start: Instant,
}

impl JobContext {
	pub async fn new(
		apalis_state: Arc<ApalisWorkerState>,
		job_id: String,
		job: &StumpJob,
	) -> Result<JobContext, JobError> {
		let active_model = job::ActiveModel {
			id: Set(job_id.clone()),
			name: Set(job.name().to_string()),
			description: Set(job.description()),
			status: Set(JobStatus::Running),
			created_at: Set(Utc::now().into()),
			ms_elapsed: Set(0),
			..Default::default()
		};

		job::Entity::insert(active_model)
			.on_conflict(
				OnConflict::column(job::Column::Id)
					.update_column(job::Column::Status)
					.to_owned(),
			)
			.exec_without_returning(apalis_state.conn.as_ref())
			.await?;

		let cancel_token = CancellationToken::new();

		apalis_state
			.cancellation_tokens
			.insert(job_id.clone(), cancel_token.clone());

		Ok(JobContext {
			job_id,
			apalis_state,
			cancel_token,
			start: Instant::now(),
		})
	}

	/// Check if this job has been canceled by looking up its cancellation token
	pub fn is_canceled(&self) -> bool {
		self.cancel_token.is_cancelled()
	}

	/// Sends an event to the core event channel
	pub fn emit_event(&self, event: CoreEvent) {
		if let Err(e) = self.apalis_state.core_event_tx.send(event) {
			tracing::error!(error = ?e, "Failed to emit core event");
		}
	}

	/// Sends a [`JobProgress`] update event to the core event channel
	pub fn report_progress(&self, progress: JobProgress) {
		self.emit_event(CoreEvent::JobUpdate(JobUpdate {
			id: self.job_id.clone(),
			payload: progress,
		}));
	}

	/// Get a reference to the database connection from the worker state
	pub fn conn(&self) -> &DatabaseConnection {
		self.apalis_state.conn.as_ref()
	}

	/// Get a reference to the config from the worker state
	pub fn config(&self) -> &StumpConfig {
		self.apalis_state.config.as_ref()
	}

	/// A convenience method to fetch the encryption key from the server config
	pub async fn get_encryption_key(&self) -> Result<String, CoreError> {
		let record = server_config::Entity::find()
			.select_column(server_config::Column::EncryptionKey)
			.one(self.apalis_state.conn.as_ref())
			.await?;

		let encryption_key = record
			.and_then(|config| config.encryption_key)
			.ok_or(CoreError::EncryptionKeyNotSet)?;

		Ok(encryption_key)
	}

	/// Send a [`JobOutput`] event to the core event channel with the given output data
	pub fn report_output(&self, output: CoreJobOutput) {
		let event = CoreEvent::JobOutput(JobOutput {
			id: self.job_id.clone(),
			output,
		});
		self.emit_event(event);
	}

	/// A convenience method to take the outputs and logs of a job and persist them into the database
	pub async fn complete<O: Serialize + JobOutputExt + std::fmt::Debug>(
		&self,
		output: &O,
		logs: Vec<JobExecuteLog>,
	) -> Result<(), JobError> {
		let elapsed = self.start.elapsed();
		self.report_progress(JobProgress::finished());

		if !logs.is_empty() {
			let models = logs.into_iter().map(|l| log::ActiveModel {
				job_id: Set(Some(self.job_id.clone())),
				message: Set(l.msg),
				level: Set(l.level),
				timestamp: Set(l.timestamp.into()),
				context: Set(l.context),
				..Default::default()
			});
			log::Entity::insert_many(models).exec(self.conn()).await?;
		}

		let output_data = serde_json::to_vec(output).ok();

		job::Entity::update_many()
			.filter(job::Column::Id.eq(&self.job_id))
			.col_expr(job::Column::OutputData, Expr::value(output_data))
			.col_expr(
				job::Column::Status,
				Expr::value(JobStatus::Completed.to_string()),
			)
			.col_expr(
				job::Column::MsElapsed,
				Expr::value(elapsed.as_millis() as i64),
			)
			.col_expr(
				job::Column::CompletedAt,
				Expr::value(Some(Utc::now().fixed_offset())),
			)
			.exec(self.conn())
			.await?;

		self.apalis_state.cancellation_tokens.remove(&self.job_id);

		Ok(())
	}

	/// A convenience method to mark a job as failed with a given status and message
	pub async fn fail(&self, status: JobStatus, message: &str) -> Result<(), JobError> {
		let elapsed = self.start.elapsed();
		self.report_progress(JobProgress::status_msg(status, message));

		job::Entity::update_many()
			.filter(job::Column::Id.eq(&self.job_id))
			.col_expr(job::Column::Status, Expr::value(status.to_string()))
			.col_expr(
				job::Column::MsElapsed,
				Expr::value(elapsed.as_millis() as i64),
			)
			.col_expr(
				job::Column::CompletedAt,
				Expr::value(Some(Utc::now().fixed_offset())),
			)
			.exec(self.conn())
			.await?;

		self.apalis_state.cancellation_tokens.remove(&self.job_id);

		Ok(())
	}

	/// A convenience method to mark a job as cancelled
	pub async fn cancel(&self) -> Result<(), JobError> {
		self.fail(JobStatus::Cancelled, "Job was cancelled").await
	}

	/// A convenience method to enqueue a follow-up job from this job's execution
	pub async fn enqueue(&self, job: StumpJob) -> Result<(), JobError> {
		let mut storage = self.apalis_state.job_storage.clone();
		storage.enqueue(job).await.map_err(|error| {
			tracing::error!(?error, "Failed to enqueue follow-up job!");
			JobError::Unknown(format!("Failed to enqueue follow-up job! {error:?}"))
		})?;
		Ok(())
	}
}

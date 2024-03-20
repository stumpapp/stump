use std::sync::Arc;

use prisma_client_rust::chrono::{DateTime, Duration, FixedOffset, Utc};
use stump_core::{
	config::StumpConfig,
	db::entity::User,
	prisma::{session, user, PrismaClient},
	Ctx,
};
use time::OffsetDateTime;
use tokio::time::MissedTickBehavior;
use tower_sessions::{session::SessionId, Session, SessionRecord, SessionStore};

use super::{SessionCleanupJob, SESSION_USER_KEY};

#[derive(Debug, thiserror::Error)]
pub enum SessionError {
	#[error("Session not found")]
	NotFound,
	#[error("An error occurred while converting a timestamp to an OffsetDateTime: {0}")]
	DateTimeError(#[from] time::error::ComponentRange),
	#[error("{0}")]
	QueryError(#[from] prisma_client_rust::queries::QueryError),
	#[error("An error occurred while serializing or deserializing session data: {0}")]
	SerdeError(#[from] serde_json::Error),
}

#[derive(Clone)]
pub struct PrismaSessionStore {
	client: Arc<PrismaClient>,
	config: Arc<StumpConfig>,
}

impl PrismaSessionStore {
	pub fn new(client: Arc<PrismaClient>, config: Arc<StumpConfig>) -> Self {
		Self { client, config }
	}

	pub async fn continuously_delete_expired(
		self,
		period: tokio::time::Duration,
		ctx: Arc<Ctx>,
	) {
		let mut interval = tokio::time::interval(period);
		interval.set_missed_tick_behavior(MissedTickBehavior::Delay);
		loop {
			interval.tick().await; // The first tick completes immediately
			if let Err(error) = ctx.enqueue_job(SessionCleanupJob::new()) {
				tracing::error!(error = ?error, "Failed to dispatch session cleanup job");
			} else {
				tracing::trace!("Dispatched session cleanup job");
			}
			tracing::trace!("Waiting for next session cleanup interval...");
		}
	}
}

#[async_trait::async_trait]
impl SessionStore for PrismaSessionStore {
	type Error = SessionError;

	async fn save(&self, session_record: &SessionRecord) -> Result<(), Self::Error> {
		let expires_at: DateTime<FixedOffset> =
			(Utc::now() + Duration::seconds(self.config.session_ttl)).into();

		let session_user = session_record
			.data()
			.get(SESSION_USER_KEY)
			.cloned()
			.ok_or(SessionError::NotFound)?;
		let user = serde_json::from_value::<User>(session_user.clone())?;
		let session_id = session_record.id().to_string();
		let session_data = serde_json::to_vec(&session_record.data())?;

		tracing::trace!(session_id, ?user, "Saving session");

		let result = self
			.client
			.session()
			.upsert(
				session::id::equals(session_id.clone()),
				(
					expires_at,
					session_data.clone(),
					user::id::equals(user.id.clone()),
					vec![session::id::set(session_id)],
				),
				vec![
					session::user::connect(user::id::equals(user.id)),
					session::expires_at::set(expires_at),
					session::data::set(session_data),
				],
			)
			.exec()
			.await?;

		tracing::trace!(session_id = result.id, "Upserted session");

		Ok(())
	}

	async fn load(&self, session_id: &SessionId) -> Result<Option<Session>, Self::Error> {
		tracing::trace!(?session_id, "Loading session");

		let record = self
			.client
			.session()
			.find_first(vec![
				session::id::equals(session_id.to_string()),
				session::expires_at::gt(Utc::now().into()),
			])
			.exec()
			.await?;

		if let Some(result) = record {
			tracing::trace!("Found session");
			let timestamp = result.expires_at.timestamp();
			let expiration_time = OffsetDateTime::from_unix_timestamp(timestamp)?;
			let session_record = SessionRecord::new(
				session_id.to_owned(),
				Some(expiration_time),
				serde_json::from_slice(&result.data)?,
			);
			Ok(Some(session_record.into()))
		} else {
			tracing::trace!(?session_id, "No session found");
			Ok(None)
		}
	}

	async fn delete(&self, session_id: &SessionId) -> Result<(), Self::Error> {
		tracing::trace!(session_id = ?session_id, "Deleting session");

		let removed_session = self
			.client
			.session()
			.delete(session::id::equals(session_id.to_string()))
			.exec()
			.await?;

		tracing::trace!(removed_session = ?removed_session, "Removed session");

		Ok(())
	}
}

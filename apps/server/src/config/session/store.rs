use std::sync::Arc;

use async_trait::async_trait;
use prisma_client_rust::chrono::{DateTime, Duration, FixedOffset, Utc};
use stump_core::{
	config::StumpConfig,
	db::entity::User,
	prisma::{session, user, PrismaClient},
	Ctx,
};
use tokio::time::MissedTickBehavior;
use tower_sessions::{
	session::{Id, Record},
	session_store::{self, ExpiredDeletion},
	SessionStore,
};

use super::{SessionCleanupJob, SESSION_USER_KEY};

// TODO(axum-upgrade): Refactor this store. See https://github.com/maxcountryman/tower-sessions-stores/blob/main/sqlx-store/src/sqlite_store.rs
// TODO(axum-upgrade): refactor error variants
#[derive(Debug, thiserror::Error)]
pub enum SessionError {
	#[error("Session not found")]
	NotFound,
	#[error("{0}")]
	QueryError(#[from] prisma_client_rust::queries::QueryError),
	#[error("An error occurred while serializing or deserializing session data: {0}")]
	SerdeError(#[from] serde_json::Error),
}

impl From<SessionError> for session_store::Error {
	fn from(error: SessionError) -> Self {
		match error {
			SessionError::NotFound => {
				session_store::Error::Backend("Session not found".to_string())
			},
			SessionError::QueryError(e) => session_store::Error::Backend(e.to_string()),
			SessionError::SerdeError(e) => session_store::Error::Decode(e.to_string()),
		}
	}
}

#[derive(Clone, Debug)]
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

#[async_trait]
impl ExpiredDeletion for PrismaSessionStore {
	#[tracing::instrument(skip(self))]
	async fn delete_expired(&self) -> session_store::Result<()> {
		let expired_sessions = self
			.client
			.session()
			.delete_many(vec![session::expiry_time::lt(Utc::now().into())])
			.exec()
			.await
			.map_err(SessionError::QueryError)?;

		tracing::trace!(expired_sessions = ?expired_sessions, "Deleted expired sessions");

		Ok(())
	}
}

#[async_trait]
impl SessionStore for PrismaSessionStore {
	#[tracing::instrument(skip(self))]
	async fn save(&self, record: &Record) -> session_store::Result<()> {
		let expiry_time: DateTime<FixedOffset> =
			(Utc::now() + Duration::seconds(self.config.session_ttl)).into();

		let session_user = record
			.data
			.get(SESSION_USER_KEY)
			.cloned()
			.ok_or(SessionError::NotFound)?;
		let session_data =
			serde_json::to_vec(&record).map_err(SessionError::SerdeError)?;
		let user = serde_json::from_value::<User>(session_user.clone())
			.map_err(SessionError::SerdeError)?;
		let session_id = record.id.to_string();

		tracing::trace!(session_id, ?user, "Saving session");

		let result = self
			.client
			.session()
			.upsert(
				session::id::equals(session_id.clone()),
				(
					expiry_time,
					session_data.clone(),
					user::id::equals(user.id.clone()),
					vec![session::id::set(session_id)],
				),
				vec![
					session::user::connect(user::id::equals(user.id)),
					session::expiry_time::set(expiry_time),
					session::data::set(session_data),
				],
			)
			.exec()
			.await
			.map_err(SessionError::QueryError)?;

		tracing::trace!(session_id = result.id, "Upserted session");

		Ok(())
	}

	#[tracing::instrument(skip(self))]
	async fn load(&self, session_id: &Id) -> session_store::Result<Option<Record>> {
		tracing::trace!(?session_id, "Loading session");

		let record = self
			.client
			.session()
			.find_first(vec![
				session::id::equals(session_id.to_string()),
				session::expiry_time::gt(Utc::now().into()),
			])
			.exec()
			.await
			.map_err(SessionError::QueryError)?;

		if let Some(result) = record {
			tracing::trace!("Found session record");
			Ok(Some(
				serde_json::from_slice(&result.data).map_err(SessionError::SerdeError)?,
			))
		} else {
			tracing::trace!(?session_id, "No session found");
			Ok(None)
		}
	}

	#[tracing::instrument(skip(self))]
	async fn delete(&self, session_id: &Id) -> session_store::Result<()> {
		tracing::trace!(session_id = ?session_id, "Deleting session");

		let removed_session = self
			.client
			.session()
			.delete(session::id::equals(session_id.to_string()))
			.exec()
			.await
			.map_err(SessionError::QueryError)?;

		tracing::trace!(removed_session = ?removed_session, "Removed session");

		Ok(())
	}
}

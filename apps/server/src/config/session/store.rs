use std::{collections::HashMap, str::FromStr, sync::Arc};

use async_trait::async_trait;
use chrono::{DateTime, Duration, FixedOffset, Utc};
use models::entity::session;
use sea_orm::{prelude::*, DatabaseConnection, Set};
use stump_core::{config::StumpConfig, Ctx};
use time::OffsetDateTime;
use tokio::time::MissedTickBehavior;
use tower_sessions::{
	session::{Id, Record},
	session_store::{self, ExpiredDeletion},
	SessionStore,
};

use super::{SessionCleanupJob, SESSION_USER_KEY};

#[derive(Debug, thiserror::Error)]
pub enum SessionError {
	#[error("{0}")]
	DbError(#[from] sea_orm::error::DbErr),
	#[error("Session not found")]
	NotFound,
	#[error("An error occurred while serializing or deserializing session data: {0}")]
	SerdeError(#[from] serde_json::Error),
	#[error("Failed to decode session data")]
	DecodeFailed,
}

impl From<SessionError> for session_store::Error {
	fn from(error: SessionError) -> Self {
		match error {
			SessionError::NotFound => {
				session_store::Error::Backend("Session not found".to_string())
			},
			SessionError::DbError(e) => session_store::Error::Backend(e.to_string()),
			SessionError::SerdeError(e) => session_store::Error::Decode(e.to_string()),
			SessionError::DecodeFailed => {
				session_store::Error::Decode("Failed to decode session data".to_string())
			},
		}
	}
}

#[derive(Clone, Debug)]
pub struct StumpSessionStore {
	conn: Arc<DatabaseConnection>,
	config: Arc<StumpConfig>,
}

impl StumpSessionStore {
	pub fn new(conn: Arc<DatabaseConnection>, config: Arc<StumpConfig>) -> Self {
		Self { conn, config }
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
impl ExpiredDeletion for StumpSessionStore {
	#[tracing::instrument(skip(self))]
	async fn delete_expired(&self) -> session_store::Result<()> {
		let affected_rows = session::Entity::delete_many()
			.filter(
				session::Column::ExpiryTime.lt::<DateTimeWithTimeZone>(Utc::now().into()),
			)
			.exec(self.conn.as_ref())
			.await
			.map_err(SessionError::DbError)?
			.rows_affected;

		tracing::trace!(?affected_rows, "Deleted expired sessions");

		Ok(())
	}
}

#[async_trait]
impl SessionStore for StumpSessionStore {
	#[tracing::instrument(skip(self))]
	async fn save(&self, record: &Record) -> session_store::Result<()> {
		let expiry_time: DateTime<FixedOffset> =
			(Utc::now() + Duration::seconds(self.config.session_ttl)).into();

		let user_id = record
			.data
			.get(SESSION_USER_KEY)
			.and_then(|v| v.as_str())
			.ok_or(SessionError::NotFound)?;
		let session_id = record.id.to_string();
		tracing::trace!(session_id, ?user_id, "Saving session");

		let active_model = session::ActiveModel {
			session_id: Set(session_id.clone()),
			user_id: Set(user_id.to_string()),
			expiry_time: Set(expiry_time),
			created_at: Set(DateTimeWithTimeZone::from(Utc::now())),
			..Default::default()
		};
		let _session = active_model
			.insert(self.conn.as_ref())
			.await
			.map_err(SessionError::DbError)?;

		Ok(())
	}

	#[tracing::instrument(skip(self))]
	async fn load(&self, session_id: &Id) -> session_store::Result<Option<Record>> {
		tracing::trace!(?session_id, "Loading session");

		let record = session::Entity::find()
			.filter(session::Column::SessionId.eq(session_id.to_string()).and(
				session::Column::ExpiryTime.gt::<DateTimeWithTimeZone>(Utc::now().into()),
			))
			.one(self.conn.as_ref())
			.await
			.map_err(SessionError::DbError)?;

		if let Some(result) = record {
			tracing::trace!("Found session record");
			Ok(Some(Record {
				id: Id::from_str(&result.session_id)
					.map_err(|_| SessionError::DecodeFailed)?,
				data: HashMap::from_iter([(
					SESSION_USER_KEY.to_string(),
					result.user_id.into(),
				)]),
				expiry_date: OffsetDateTime::from_unix_timestamp(
					result.expiry_time.timestamp(),
				)
				.map_err(|_| SessionError::DecodeFailed)?,
			}))
		} else {
			tracing::trace!(?session_id, "No session found");
			Ok(None)
		}
	}

	#[tracing::instrument(skip(self))]
	async fn delete(&self, session_id: &Id) -> session_store::Result<()> {
		tracing::trace!(session_id = ?session_id, "Deleting session");

		let affected_rows = session::Entity::delete_many()
			.filter(session::Column::SessionId.eq(session_id.to_string()))
			.exec(self.conn.as_ref())
			.await
			.map_err(SessionError::DbError)?
			.rows_affected;
		tracing::trace!(affected_rows, "Removed session");

		Ok(())
	}
}

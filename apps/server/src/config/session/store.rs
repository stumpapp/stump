use std::sync::Arc;

use async_trait::async_trait;
use chrono::{DateTime, Duration, FixedOffset, Utc};
use models::entity::{session, user::AuthUser};
use sea_orm::{prelude::*, sea_query::OnConflict, DatabaseConnection, Iterable, Set};
use stump_core::{config::StumpConfig, Ctx};
use tokio::time::MissedTickBehavior;
use tower_sessions::{
	session::{Id, Record},
	session_store::{self, ExpiredDeletion},
	SessionStore,
};

use super::{SessionCleanupJob, SESSION_USER_KEY};

// TODO(axum-upgrade): Refactor this store. See https://github.com/maxcountryman/tower-sessions-stores/blob/main/sqlx-store/src/sqlite_store.rs
// TODO(axum-upgrade): refactor error variants

// TODO(graphql): I think it would be more appropriate to reduce what is stored. I want to refactor this
// to just store a user ID, not the entire user object. This will result in 1-2 DB reads per-session, but
// removes the need to wrangle the session whenever preferences are mutated or the user is updated.

#[derive(Debug, thiserror::Error)]
pub enum SessionError {
	#[error("{0}")]
	DbError(#[from] sea_orm::error::DbErr),
	#[error("Session not found")]
	NotFound,
	#[error("An error occurred while serializing or deserializing session data: {0}")]
	SerdeError(#[from] serde_json::Error),
}

impl From<SessionError> for session_store::Error {
	fn from(error: SessionError) -> Self {
		match error {
			SessionError::NotFound => {
				session_store::Error::Backend("Session not found".to_string())
			},
			SessionError::DbError(e) => session_store::Error::Backend(e.to_string()),
			SessionError::SerdeError(e) => session_store::Error::Decode(e.to_string()),
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

		let session_user = record
			.data
			.get(SESSION_USER_KEY)
			.cloned()
			.ok_or(SessionError::NotFound)?;
		let session_data =
			serde_json::to_vec(&record).map_err(SessionError::SerdeError)?;
		let user = serde_json::from_value::<AuthUser>(session_user.clone())
			.map_err(SessionError::SerdeError)?;
		let session_id = record.id.to_string();

		tracing::trace!(session_id, ?user, "Saving session");

		let active_model = session::ActiveModel {
			id: Set(session_id.clone()),
			expiry_time: Set(expiry_time),
			data: Set(session_data),
			user_id: Set(user.id.clone()),
			..Default::default()
		};

		let on_conflict = OnConflict::new()
			.update_columns(
				session::Column::iter()
					.filter(|col| !matches!(col, session::Column::CreatedAt)),
			)
			.to_owned();

		let _result = session::Entity::insert(active_model)
			.on_conflict(on_conflict)
			.exec(self.conn.as_ref())
			.await
			.map_err(SessionError::DbError)?;

		tracing::trace!(session_id, "Upserted session");

		Ok(())
	}

	#[tracing::instrument(skip(self))]
	async fn load(&self, session_id: &Id) -> session_store::Result<Option<Record>> {
		tracing::trace!(?session_id, "Loading session");

		let record = session::Entity::find()
			.filter(session::Column::Id.eq(session_id.to_string()).and(
				session::Column::ExpiryTime.gt::<DateTimeWithTimeZone>(Utc::now().into()),
			))
			.one(self.conn.as_ref())
			.await
			.map_err(SessionError::DbError)?;

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

		let affected_rows = session::Entity::delete_many()
			.filter(session::Column::Id.eq(session_id.to_string()))
			.exec(self.conn.as_ref())
			.await
			.map_err(SessionError::DbError)?
			.rows_affected;

		tracing::trace!(affected_rows, "Removed session");

		Ok(())
	}
}

use std::sync::Arc;

use prisma_client_rust::{
	chrono::{DateTime, Duration, FixedOffset, Utc},
	QueryError,
};
use stump_core::{
	db::entity::User,
	prisma::{session, user, PrismaClient},
};
use time::OffsetDateTime;
use tower_sessions::{session::SessionId, Session, SessionRecord, SessionStore};

use super::session::{get_session_ttl, SESSION_USER_KEY};

#[derive(Clone)]
pub struct PrismaSessionStore {
	client: Arc<PrismaClient>,
}

impl PrismaSessionStore {
	pub fn new(client: Arc<PrismaClient>) -> Self {
		Self { client }
	}

	async fn delete_expired(&self) -> Result<(), QueryError> {
		tracing::trace!("Deleting expired sessions");

		let affected_rows = self
			.client
			.session()
			.delete_many(vec![session::expires_at::lt(Utc::now().into())])
			.exec()
			.await?;

		tracing::trace!(affected_rows = ?affected_rows, "Deleted expired sessions");

		Ok(())
	}

	pub async fn continuously_delete_expired(self, period: tokio::time::Duration) {
		let mut interval = tokio::time::interval(period);
		loop {
			if let Err(error) = self.delete_expired().await {
				tracing::error!(error = ?error, "Failed to delete expired sessions");
			}
			interval.tick().await;
		}
	}
}

// FIXME: There are a LOT of expectations here. Looking at the source code for other implementations,
// e.g. sqlx sqlite store, this was also the case. If possible, though, I'd like to more safely
// handle these cases.

#[async_trait::async_trait]
impl SessionStore for PrismaSessionStore {
	type Error = QueryError;

	async fn save(&self, session_record: &SessionRecord) -> Result<(), Self::Error> {
		let expires_at: DateTime<FixedOffset> =
			(Utc::now() + Duration::seconds(get_session_ttl())).into();
		let session_user = session_record
			.data()
			.get(SESSION_USER_KEY)
			.cloned()
			.expect("Failed to get user from session");
		let user = serde_json::from_value::<User>(session_user.clone())
			.expect("Failed to deserialize user");
		let session_id = session_record.id().to_string();
		let session_data = serde_json::to_vec(&session_record.data())
			.expect("Failed to serialize session data");

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
			let expiration_time = OffsetDateTime::from_unix_timestamp(timestamp)
				.expect("Failed to convert timestamp to OffsetDateTime");
			let session_record = SessionRecord::new(
				session_id.to_owned(),
				Some(expiration_time),
				serde_json::from_slice(&result.data)
					.expect("Failed to deserialize session data"),
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

use async_graphql::dataloader::Loader;
use models::entity::finished_reading_session;
use models::entity::reading_session;
use sea_orm::prelude::*;
use sea_orm::DatabaseConnection;
use std::{collections::HashMap, sync::Arc};

use crate::object::reading_session::ActiveReadingSession;
use crate::object::reading_session::FinishedReadingSession;

pub struct ReadingSessionLoader {
	conn: Arc<DatabaseConnection>,
}

/// A loader for optimizing the loading of both active and finished reading sessions
impl ReadingSessionLoader {
	pub fn new(conn: Arc<DatabaseConnection>) -> Self {
		Self { conn }
	}
}

#[derive(Clone, PartialEq, Eq, Hash)]
pub struct ActiveReadingSessionLoaderKey {
	pub user_id: String,
	pub media_id: String,
}

impl Loader<ActiveReadingSessionLoaderKey> for ReadingSessionLoader {
	type Value = ActiveReadingSession;
	type Error = Arc<sea_orm::error::DbErr>;

	async fn load(
		&self,
		keys: &[ActiveReadingSessionLoaderKey],
	) -> Result<HashMap<ActiveReadingSessionLoaderKey, Self::Value>, Self::Error> {
		let progresses = reading_session::Entity::find()
			.filter(
				reading_session::Column::MediaId
					.is_in(
						keys.iter()
							.map(|key| key.media_id.clone())
							.collect::<Vec<_>>(),
					)
					.and(
						reading_session::Column::UserId.is_in(
							keys.iter()
								.map(|key| key.user_id.clone())
								.collect::<Vec<_>>(),
						),
					),
			)
			.into_model::<reading_session::Model>()
			.all(self.conn.as_ref())
			.await?;

		let mut result = HashMap::new();

		for key in keys {
			let progress = progresses
				.iter()
				.find(|p| p.user_id == key.user_id && p.media_id == key.media_id)
				.cloned();

			if let Some(progress) = progress {
				result.insert(key.clone(), ActiveReadingSession::from(progress));
			}
		}

		Ok(result)
	}
}

// Note: The type is the same as ActiveReadingSessionLoaderKey, but the different struct def
// allows us to share a single ReadingSessionLoader between the models
#[derive(Clone, PartialEq, Eq, Hash)]
pub struct FinishedReadingSessionLoaderKey {
	pub user_id: String,
	pub media_id: String,
}

impl Loader<FinishedReadingSessionLoaderKey> for ReadingSessionLoader {
	// Note: It might seem counterintuitive to have the Value type be a Vec, but since a user
	// may have many reading sessions a `load_one` call really should return a Vec
	type Value = Vec<FinishedReadingSession>;
	type Error = Arc<sea_orm::error::DbErr>;

	async fn load(
		&self,
		keys: &[FinishedReadingSessionLoaderKey],
	) -> Result<HashMap<FinishedReadingSessionLoaderKey, Self::Value>, Self::Error> {
		let progresses = finished_reading_session::Entity::find()
			.filter(
				finished_reading_session::Column::MediaId
					.is_in(
						keys.iter()
							.map(|key| key.media_id.clone())
							.collect::<Vec<_>>(),
					)
					.and(
						finished_reading_session::Column::UserId.is_in(
							keys.iter()
								.map(|key| key.user_id.clone())
								.collect::<Vec<_>>(),
						),
					),
			)
			.into_model::<finished_reading_session::Model>()
			.all(self.conn.as_ref())
			.await?;

		let mut result = HashMap::new();

		for key in keys {
			let progress = progresses
				.iter()
				.filter(|p| p.user_id == key.user_id && p.media_id == key.media_id)
				.cloned()
				.collect::<Vec<_>>();

			if !progress.is_empty() {
				result.insert(
					key.clone(),
					progress
						.into_iter()
						.map(FinishedReadingSession::from)
						.collect(),
				);
			}
		}

		Ok(result)
	}
}

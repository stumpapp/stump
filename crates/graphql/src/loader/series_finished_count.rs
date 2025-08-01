use async_graphql::dataloader::Loader;
use models::entity::{finished_reading_session, media};
use sea_orm::{
	prelude::*, ColumnTrait, DatabaseConnection, FromQueryResult, QueryFilter,
	QuerySelect,
};
use std::{collections::HashMap, sync::Arc};

pub struct SeriesFinishedCountLoader {
	conn: Arc<DatabaseConnection>,
}

/// A loader for optimizing the loading of series FinishedCounts for media items.
impl SeriesFinishedCountLoader {
	pub fn new(conn: Arc<DatabaseConnection>) -> Self {
		Self { conn }
	}
}

/// A type alias for the key used in the SeriesLoader, which represents the series ID
#[derive(Clone, PartialEq, Eq, Hash)]
pub struct FinishedCountLoaderKey {
	pub user_id: String,
	pub series_id: String,
}

#[derive(Debug, FromQueryResult)]
pub struct UserIdSeriesIdCount {
	pub user_id: String,
	pub series_id: String,
	pub count: i64,
}

impl Loader<FinishedCountLoaderKey> for SeriesFinishedCountLoader {
	type Value = i64;
	type Error = Arc<sea_orm::error::DbErr>;

	async fn load(
		&self,
		keys: &[FinishedCountLoaderKey],
	) -> Result<HashMap<FinishedCountLoaderKey, Self::Value>, Self::Error> {
		let series_ids: Vec<String> =
			keys.iter().map(|key| key.series_id.clone()).collect();

		let finished_count = finished_reading_session::Entity::find()
			.inner_join(media::Entity)
			.filter(media::Column::SeriesId.is_in(series_ids))
			.select_only()
			.column(finished_reading_session::Column::UserId)
			.column(media::Column::SeriesId)
			.column_as(media::Column::Id.count(), "count")
			.group_by(finished_reading_session::Column::UserId)
			.group_by(media::Column::SeriesId)
			.into_model::<UserIdSeriesIdCount>()
			.all(self.conn.as_ref())
			.await?;

		let mut result = HashMap::new();

		for user_id_series_count in finished_count {
			// Insert the count into the result map
			result.insert(
				FinishedCountLoaderKey {
					user_id: user_id_series_count.user_id,
					series_id: user_id_series_count.series_id,
				},
				user_id_series_count.count,
			);
		}

		Ok(result)
	}
}

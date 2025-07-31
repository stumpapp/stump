use async_graphql::dataloader::Loader;
use models::entity::media;
use sea_orm::{prelude::*, ColumnTrait, DatabaseConnection, QueryFilter, QuerySelect};
use std::{collections::HashMap, sync::Arc};

pub struct SeriesCountLoader {
	conn: Arc<DatabaseConnection>,
}

/// A loader for optimizing the loading of series counts for media items.
impl SeriesCountLoader {
	pub fn new(conn: Arc<DatabaseConnection>) -> Self {
		Self { conn }
	}
}

/// A type alias for the key used in the SeriesLoader, which represents the series ID
pub type SeriesCountLoaderKey = String;

impl Loader<SeriesCountLoaderKey> for SeriesCountLoader {
	type Value = i64;
	type Error = Arc<sea_orm::error::DbErr>;

	async fn load(
		&self,
		keys: &[SeriesCountLoaderKey],
	) -> Result<HashMap<SeriesCountLoaderKey, Self::Value>, Self::Error> {
		let series_counts = media::Entity::find()
			.filter(media::Column::SeriesId.is_in(keys.to_vec()))
			.select_only()
			.column(media::Column::SeriesId)
			.column_as(media::Column::Id.count(), "count")
			.group_by(media::Column::SeriesId)
			.into_tuple::<(String, i64)>()
			.all(self.conn.as_ref())
			.await?;

		let mut result = HashMap::new();

		for series in series_counts {
			let series_id = series.0;
			let count = series.1;

			// Insert the count into the result map
			result.insert(series_id, count);
		}

		Ok(result)
	}
}

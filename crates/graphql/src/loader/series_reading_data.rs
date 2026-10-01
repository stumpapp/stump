use async_graphql::dataloader::Loader;
use models::entity::{media, reading_session};
use sea_orm::sea_query::Expr;
use sea_orm::{
	prelude::*, ColumnTrait, DatabaseConnection, EntityTrait, FromQueryResult,
	QueryFilter, QuerySelect,
};
use std::{collections::HashMap, sync::Arc};

pub struct SeriesReadingDataLoader {
	conn: Arc<DatabaseConnection>,
}

impl SeriesReadingDataLoader {
	pub fn new(conn: Arc<DatabaseConnection>) -> Self {
		Self { conn }
	}
}

#[derive(Clone, PartialEq, Eq, Hash)]
pub struct SeriesReadingDataLoaderKey {
	pub user_id: String,
	pub series_id: String,
}

#[derive(Debug, Clone)]
pub struct SeriesReadingData {
	pub last_read_at: Option<DateTimeWithTimeZone>,
	pub current_readthrough: Option<i32>,
}

#[derive(Debug, FromQueryResult)]
struct SeriesReadingDataRow {
	user_id: String,
	series_id: String,
	last_read_at: Option<DateTimeWithTimeZone>,
	current_readthrough: Option<i32>,
}

impl Loader<SeriesReadingDataLoaderKey> for SeriesReadingDataLoader {
	type Value = SeriesReadingData;
	type Error = Arc<sea_orm::error::DbErr>;

	async fn load(
		&self,
		keys: &[SeriesReadingDataLoaderKey],
	) -> Result<HashMap<SeriesReadingDataLoaderKey, Self::Value>, Self::Error> {
		if keys.is_empty() {
			return Ok(HashMap::new());
		}

		let user_ids: Vec<String> = keys.iter().map(|k| k.user_id.clone()).collect();
		let series_ids: Vec<String> = keys.iter().map(|k| k.series_id.clone()).collect();

		let rows = reading_session::Entity::find()
			.inner_join(media::Entity)
			.filter(reading_session::Column::UserId.is_in(user_ids).and(media::Column::SeriesId.is_in(series_ids)))
			.select_only()
			.column(reading_session::Column::UserId)
			.column(media::Column::SeriesId)
			.column_as(
				Expr::cust("MAX(COALESCE(reading_sessions.updated_at, reading_sessions.created_at))"),
				"last_read_at",
			)
			.column_as(
				Expr::cust("MAX(reading_sessions.readthrough_number)"),
				"current_readthrough",
			)
			.group_by(reading_session::Column::UserId)
			.group_by(media::Column::SeriesId)
			.into_model::<SeriesReadingDataRow>()
			.all(self.conn.as_ref())
			.await
			.map_err(Arc::new)?;

		let result = rows
			.into_iter()
			.map(|row| {
				(
					SeriesReadingDataLoaderKey {
						user_id: row.user_id,
						series_id: row.series_id,
					},
					SeriesReadingData {
						last_read_at: row.last_read_at,
						current_readthrough: row.current_readthrough,
					},
				)
			})
			.collect::<HashMap<_, _>>();

		Ok(result)
	}
}

use async_graphql::dataloader::Loader;
use models::entity::series;
use sea_orm::prelude::*;
use sea_orm::DatabaseConnection;
use std::{collections::HashMap, sync::Arc};

use crate::object::series::Series;

pub struct SeriesLoader {
	conn: Arc<DatabaseConnection>,
}

/// A loader for optimizing the loading of a series entity
impl SeriesLoader {
	pub fn new(conn: Arc<DatabaseConnection>) -> Self {
		Self { conn }
	}
}

/// A type alias for the key used in the SeriesLoader, which represents the series ID
pub type SeriesLoaderKey = String;

impl Loader<SeriesLoaderKey> for SeriesLoader {
	type Value = Series;
	type Error = Arc<sea_orm::error::DbErr>;

	async fn load(
		&self,
		keys: &[SeriesLoaderKey],
	) -> Result<HashMap<SeriesLoaderKey, Self::Value>, Self::Error> {
		let series_list = series::ModelWithMetadata::find()
			.filter(series::Column::Id.is_in(keys.to_vec()))
			.into_model::<series::ModelWithMetadata>()
			.all(self.conn.as_ref())
			.await?;

		let mut result = HashMap::new();

		for series in series_list {
			let series_id = series.series.id.clone();
			result.insert(series_id.clone(), Series::from(series));
		}

		Ok(result)
	}
}

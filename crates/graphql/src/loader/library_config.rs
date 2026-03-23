use async_graphql::dataloader::Loader;
use models::entity::{library_config, series};
use sea_orm::{prelude::*, DatabaseConnection, QuerySelect};
use std::{collections::HashMap, sync::Arc};

pub struct LibraryConfigLoader {
	conn: Arc<DatabaseConnection>,
}

impl LibraryConfigLoader {
	pub fn new(conn: Arc<DatabaseConnection>) -> Self {
		Self { conn }
	}
}

#[derive(Clone, PartialEq, Eq, Hash)]
pub struct LibraryConfigLoaderKey {
	pub series_id: String,
}

impl Loader<LibraryConfigLoaderKey> for LibraryConfigLoader {
	type Value = library_config::Model;
	type Error = Arc<sea_orm::error::DbErr>;

	async fn load(
		&self,
		keys: &[LibraryConfigLoaderKey],
	) -> Result<HashMap<LibraryConfigLoaderKey, Self::Value>, Self::Error> {
		let series_ids = keys
			.iter()
			.map(|key| key.series_id.clone())
			.collect::<Vec<_>>();

		let series_to_library = series::Entity::find()
			.select_only()
			.column(series::Column::Id)
			.column(series::Column::LibraryId)
			.filter(series::Column::Id.is_in(series_ids))
			.into_tuple::<(String, String)>()
			.all(self.conn.as_ref())
			.await?;

		let library_ids = series_to_library
			.iter()
			.map(|(_, library_id)| library_id.clone())
			.collect::<Vec<_>>();

		let configs = library_config::Entity::find()
			.filter(library_config::Column::LibraryId.is_in(library_ids))
			.all(self.conn.as_ref())
			.await?;

		let config_by_library = configs
			.into_iter()
			.filter_map(|model| {
				model
					.library_id
					.clone()
					.map(|library_id| (library_id, model))
			})
			.collect::<HashMap<_, _>>();

		let mut result = HashMap::new();

		for key in keys {
			let Some((_, library_id)) = series_to_library
				.iter()
				.find(|(series_id, _)| series_id == &key.series_id)
			else {
				continue;
			};

			if let Some(config) = config_by_library.get(library_id) {
				result.insert(key.clone(), config.clone());
			}
		}

		Ok(result)
	}
}

use async_graphql::dataloader::Loader;
use models::entity::library_config;
use sea_orm::{prelude::*, DatabaseConnection};
use std::{collections::HashMap, sync::Arc};

pub struct LibraryConfigLoader {
	conn: Arc<DatabaseConnection>,
}

impl LibraryConfigLoader {
	pub fn new(conn: Arc<DatabaseConnection>) -> Self {
		Self { conn }
	}
}

impl Loader<String> for LibraryConfigLoader {
	type Value = library_config::Model;
	type Error = Arc<sea_orm::error::DbErr>;

	async fn load(
		&self,
		keys: &[String],
	) -> Result<HashMap<String, Self::Value>, Self::Error> {
		let configs = library_config::Entity::find()
			.filter(library_config::Column::LibraryId.is_in(keys.to_vec()))
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

		Ok(config_by_library)
	}
}

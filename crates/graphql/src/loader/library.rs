use async_graphql::dataloader::Loader;
use models::entity::{library, series};
use sea_orm::prelude::*;
use sea_orm::sea_query::Query;
use sea_orm::DatabaseConnection;
use std::{collections::HashMap, sync::Arc};

use crate::object::library::Library;

pub struct LibraryLoader {
	conn: Arc<DatabaseConnection>,
}

/// A loader for optimizing the loading of a library entity
impl LibraryLoader {
	pub fn new(conn: Arc<DatabaseConnection>) -> Self {
		Self { conn }
	}
}

/// A type alias for the key used in the LibraryLoader, which represents the library ID
pub type LibraryLoaderKey = String;

impl Loader<LibraryLoaderKey> for LibraryLoader {
	type Value = Library;
	type Error = Arc<sea_orm::error::DbErr>;

	async fn load(
		&self,
		keys: &[LibraryLoaderKey],
	) -> Result<HashMap<LibraryLoaderKey, Self::Value>, Self::Error> {
		let library_list = library::Entity::find()
			.filter(library::Column::Id.is_in(keys.to_vec()))
			.all(self.conn.as_ref())
			.await?;

		let mut result = HashMap::new();

		for library in library_list {
			let library_id = library.id.clone();
			result.insert(library_id.clone(), Library::from(library));
		}

		Ok(result)
	}
}

/// A struct representing the key used to load a library entity from the ID of the series which
/// the media belongs to. This was created as an explicit field to avoid confusion, a series has a
/// direct relationship with a library, but a media does not.
#[derive(Clone, PartialEq, Eq, Hash)]
pub struct LibraryToMediaLoaderKey {
	pub series_id: String,
}

impl Loader<LibraryToMediaLoaderKey> for LibraryLoader {
	type Value = Library;
	type Error = Arc<sea_orm::error::DbErr>;

	async fn load(
		&self,
		keys: &[LibraryToMediaLoaderKey],
	) -> Result<HashMap<LibraryToMediaLoaderKey, Self::Value>, Self::Error> {
		let series_ids = keys
			.iter()
			.map(|key| key.series_id.clone())
			.collect::<Vec<_>>();

		// TODO: I think we will need a more custom query here, since we need to
		// map the libraries which are related to the series IDs... So this actually
		// won't work yet. It might just need to be a more complex join with a selection
		// to get them into the map correctly
		let _models = library::Entity::find()
			.filter(
				library::Column::Id.in_subquery(
					Query::select()
						.column(series::Column::LibraryId)
						.from(series::Entity)
						.and_where(series::Column::Id.is_in(series_ids))
						.to_owned(),
				),
			)
			.all(self.conn.as_ref())
			.await?;

		unimplemented!();
	}
}

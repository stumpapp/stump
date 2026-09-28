use async_graphql::dataloader::Loader;
use models::entity::media;
use sea_orm::prelude::*;
use sea_orm::DatabaseConnection;
use std::collections::HashSet;
use std::{collections::HashMap, sync::Arc};

use crate::object::media::Media;

pub struct MediaLoader {
	conn: Arc<DatabaseConnection>,
}

/// A loader for optimizing the loading of a media entity
impl MediaLoader {
	pub fn new(conn: Arc<DatabaseConnection>) -> Self {
		Self { conn }
	}
}

#[derive(Clone, PartialEq, Eq, Hash)]
pub struct MediaByPathLoaderKey {
	pub path: String,
}

impl Loader<MediaByPathLoaderKey> for MediaLoader {
	type Value = Media;
	type Error = Arc<sea_orm::error::DbErr>;

	async fn load(
		&self,
		keys: &[MediaByPathLoaderKey],
	) -> Result<HashMap<MediaByPathLoaderKey, Self::Value>, Self::Error> {
		let paths = keys.iter().map(|k| k.path.clone()).collect::<Vec<_>>();

		let media_list = media::ModelWithMetadata::find()
			.filter(media::Column::Path.is_in(paths.clone()))
			.into_model::<media::ModelWithMetadata>()
			.all(self.conn.as_ref())
			.await?;

		let paths: HashSet<_> = HashSet::from_iter(paths);
		let mut result = HashMap::new();

		for media in media_list {
			if let Some(key) = paths.get(&media.media.path) {
				result.insert(
					MediaByPathLoaderKey { path: key.clone() },
					Media::from(media),
				);
			}
		}

		Ok(result)
	}
}

#[derive(Clone, PartialEq, Eq, Hash)]
pub struct MediaByIdLoaderKey {
	pub id: String,
}

impl Loader<MediaByIdLoaderKey> for MediaLoader {
	type Value = Media;
	type Error = Arc<sea_orm::error::DbErr>;

	async fn load(
		&self,
		keys: &[MediaByIdLoaderKey],
	) -> Result<HashMap<MediaByIdLoaderKey, Self::Value>, Self::Error> {
		let ids = keys.iter().map(|k| k.id.clone()).collect::<Vec<_>>();

		let media_list = media::ModelWithMetadata::find()
			.filter(media::Column::Id.is_in(ids.clone()))
			.into_model::<media::ModelWithMetadata>()
			.all(self.conn.as_ref())
			.await?;

		let ids: HashSet<_> = HashSet::from_iter(ids);
		let mut result = HashMap::new();

		for media in media_list {
			if let Some(key) = ids.get(&media.media.id) {
				result.insert(MediaByIdLoaderKey { id: key.clone() }, Media::from(media));
			}
		}

		Ok(result)
	}
}

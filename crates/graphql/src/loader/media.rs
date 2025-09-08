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

pub type MediaByPathLoaderKey = String; // Path

impl Loader<MediaByPathLoaderKey> for MediaLoader {
	type Value = Media;
	type Error = Arc<sea_orm::error::DbErr>;

	async fn load(
		&self,
		keys: &[MediaByPathLoaderKey],
	) -> Result<HashMap<MediaByPathLoaderKey, Self::Value>, Self::Error> {
		let media_list = media::ModelWithMetadata::find()
			.filter(media::Column::Path.is_in(keys.to_vec()))
			.into_model::<media::ModelWithMetadata>()
			.all(self.conn.as_ref())
			.await?;

		let paths: HashSet<_> = HashSet::from_iter(keys.iter().cloned());
		let mut result = HashMap::new();

		for media in media_list {
			if let Some(key) = paths.get(&media.media.path) {
				result.insert(key.clone(), Media::from(media));
			}
		}

		Ok(result)
	}
}

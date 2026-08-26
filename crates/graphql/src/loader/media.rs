use async_graphql::dataloader::Loader;
use models::entity::{kobo_sync_media, media};
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

#[derive(Clone, PartialEq, Eq, Hash)]
pub struct KoboSyncMediaLoaderKey {
	pub user_id: String,
	pub media_id: String,
}

impl Loader<KoboSyncMediaLoaderKey> for MediaLoader {
	type Value = bool;
	type Error = Arc<sea_orm::error::DbErr>;

	async fn load(
		&self,
		keys: &[KoboSyncMediaLoaderKey],
	) -> Result<HashMap<KoboSyncMediaLoaderKey, Self::Value>, Self::Error> {
		let selections = kobo_sync_media::Entity::find()
			.filter(
				kobo_sync_media::Column::MediaId
					.is_in(
						keys.iter()
							.map(|key| key.media_id.clone())
							.collect::<Vec<_>>(),
					)
					.and(
						kobo_sync_media::Column::UserId.is_in(
							keys.iter()
								.map(|key| key.user_id.clone())
								.collect::<Vec<_>>(),
						),
					),
			)
			.all(self.conn.as_ref())
			.await?;

		Ok(selections
			.into_iter()
			.map(|selection| {
				(
					KoboSyncMediaLoaderKey {
						user_id: selection.user_id,
						media_id: selection.media_id,
					},
					selection.is_selected,
				)
			})
			.collect())
	}
}

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

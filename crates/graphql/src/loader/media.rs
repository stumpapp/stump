use async_graphql::dataloader::Loader;
use models::entity::media;
use models::entity::user;
use models::entity::user::AuthUser;
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

/// A loader key for loading many media records while enforcing access control
/// for a user
// realistically it would be quite infrequent that multiple users would be present in the
// loader, so while the loader reads a bit less effiicent than the loader above, it's fine
#[derive(Clone, PartialEq, Eq, Hash)]
pub struct MediaByIdForUserLoaderKey {
	pub id: String,
	pub user_id: String,
}

impl Loader<MediaByIdForUserLoaderKey> for MediaLoader {
	type Value = Media;
	type Error = Arc<sea_orm::error::DbErr>;

	async fn load(
		&self,
		keys: &[MediaByIdForUserLoaderKey],
	) -> Result<HashMap<MediaByIdForUserLoaderKey, Self::Value>, Self::Error> {
		let user_to_media_ids = keys.iter().fold(HashMap::new(), |mut acc, key| {
			acc.entry(key.user_id.clone())
				.or_insert_with(Vec::new)
				.push(key.id.clone());
			acc
		});

		let user_ids = user_to_media_ids.keys().cloned().collect::<Vec<_>>();
		let login_users = user::LoginUser::find()
			.filter(user::Column::Id.is_in(user_ids))
			.into_model::<user::LoginUser>()
			.all(self.conn.as_ref())
			.await?;
		let user_id_to_login_user = login_users
			.into_iter()
			.map(|user| (user.id.clone(), user))
			.collect::<HashMap<_, _>>();

		let mut result = HashMap::new();

		for (user_id, media_ids) in user_to_media_ids {
			let Some(login_user) = user_id_to_login_user.get(&user_id) else {
				continue;
			};

			let media_list = media::ModelWithMetadata::find_for_user(&AuthUser::from(
				login_user.clone(),
			))
			.filter(media::Column::Id.is_in(media_ids))
			.into_model::<media::ModelWithMetadata>()
			.all(self.conn.as_ref())
			.await?;

			for m in media_list {
				result.insert(
					MediaByIdForUserLoaderKey {
						id: m.media.id.clone(),
						user_id: user_id.clone(),
					},
					Media::from(m),
				);
			}
		}

		Ok(result)
	}
}

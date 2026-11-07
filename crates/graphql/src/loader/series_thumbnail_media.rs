use async_graphql::dataloader::Loader;
use models::entity::{media, user};
use sea_orm::{prelude::*, QuerySelect};
use std::{collections::HashMap, sync::Arc};

use crate::object::media::Media;

/// A loader for the first books of a series in reading order, used to build stacked series
/// thumbnails
pub struct SeriesThumbnailMediaLoader {
	conn: Arc<DatabaseConnection>,
}

impl SeriesThumbnailMediaLoader {
	pub fn new(conn: Arc<DatabaseConnection>) -> Self {
		Self { conn }
	}
}

#[derive(Clone, PartialEq, Eq, Hash, Debug)]
pub struct SeriesThumbnailMediaLoaderKey {
	pub user_id: String,
	pub series_id: String,
	pub limit: usize,
}

impl Loader<SeriesThumbnailMediaLoaderKey> for SeriesThumbnailMediaLoader {
	type Value = Vec<Media>;
	type Error = Arc<sea_orm::error::DbErr>;

	async fn load(
		&self,
		keys: &[SeriesThumbnailMediaLoaderKey],
	) -> Result<HashMap<SeriesThumbnailMediaLoaderKey, Self::Value>, Self::Error> {
		let mut grouped: HashMap<String, Vec<&SeriesThumbnailMediaLoaderKey>> =
			HashMap::new();
		for key in keys {
			grouped.entry(key.user_id.clone()).or_default().push(key);
		}

		let login_users = user::LoginUser::find()
			.filter(user::Column::Id.is_in(grouped.keys().cloned().collect::<Vec<_>>()))
			.into_model::<user::LoginUser>()
			.all(self.conn.as_ref())
			.await?;
		// ^ realistically we'll only have one user

		let mut result = HashMap::new();
		for login_user in login_users {
			let Some(user_keys) = grouped.remove(&login_user.id) else {
				continue;
			};
			let auth_user = user::AuthUser::from(login_user);
			let max_limit = user_keys.iter().map(|k| k.limit).max().unwrap_or_default();
			// ^ realistically we'll only have one limit

			let series_ids = user_keys
				.iter()
				.map(|k| k.series_id.clone())
				.collect::<Vec<_>>();

			let rows = media::Entity::order_in_series(
				media::Entity::find_for_user(&auth_user)
					.filter(media::Column::SeriesId.is_in(series_ids)),
			)
			.select_only()
			.column(media::Column::SeriesId)
			.column(media::Column::Id)
			.into_tuple::<(String, String)>()
			.all(self.conn.as_ref())
			.await?;

			let mut series_to_media_ids: HashMap<String, Vec<String>> = HashMap::new();
			for (series_id, media_id) in rows {
				let ids = series_to_media_ids.entry(series_id).or_default();
				if ids.len() < max_limit {
					ids.push(media_id);
				}
			}

			let models = media::ModelWithMetadata::find()
				.filter(
					media::Column::Id.is_in(
						series_to_media_ids
							.values()
							.flatten()
							.cloned()
							.collect::<Vec<_>>(),
					),
				)
				.into_model::<media::ModelWithMetadata>()
				.all(self.conn.as_ref())
				.await?
				.into_iter()
				.map(|m| (m.media.id.clone(), m))
				.collect::<HashMap<_, _>>();

			for key in user_keys {
				let books = series_to_media_ids
					.get(&key.series_id)
					.into_iter()
					.flatten()
					.take(key.limit)
					.filter_map(|id| models.get(id).cloned())
					.map(Media::from)
					.collect();
				result.insert(key.clone(), books);
			}
		}

		Ok(result)
	}
}

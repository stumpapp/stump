use std::{collections::HashMap, sync::Arc};

use async_graphql::dataloader::Loader;
use models::entity::{favorite_library, favorite_media, favorite_series};
use sea_orm::{prelude::*, DatabaseConnection};

pub struct FavoritesLoader {
	conn: Arc<DatabaseConnection>,
}

impl FavoritesLoader {
	pub fn new(conn: Arc<DatabaseConnection>) -> Self {
		Self { conn }
	}
}

#[derive(Clone, PartialEq, Eq, Hash)]
pub struct FavoriteMediaLoaderKey {
	pub user_id: String,
	pub media_id: String,
}

impl Loader<FavoriteMediaLoaderKey> for FavoritesLoader {
	type Value = bool; // Indicates if the media is favorited by the user
	type Error = Arc<sea_orm::error::DbErr>;

	async fn load(
		&self,
		keys: &[FavoriteMediaLoaderKey],
	) -> Result<HashMap<FavoriteMediaLoaderKey, Self::Value>, Self::Error> {
		let favorite_records = favorite_media::Entity::find()
			.filter(
				favorite_media::Column::MediaId
					.is_in(
						keys.iter()
							.map(|key| key.media_id.clone())
							.collect::<Vec<_>>(),
					)
					.and(
						favorite_media::Column::UserId.is_in(
							keys.iter()
								.map(|key| key.user_id.clone())
								.collect::<Vec<_>>(),
						),
					),
			)
			.all(self.conn.as_ref())
			.await?;

		let mut result = HashMap::new();

		for key in keys {
			let favorite = favorite_records
				.iter()
				.find(|f| f.user_id == key.user_id && f.media_id == key.media_id)
				.cloned();

			if favorite.is_some() {
				result.insert(key.clone(), true);
			}
		}

		Ok(result)
	}
}

#[derive(Clone, PartialEq, Eq, Hash)]
pub struct FavoriteSeriesLoaderKey {
	pub user_id: String,
	pub series_id: String,
}

impl Loader<FavoriteSeriesLoaderKey> for FavoritesLoader {
	type Value = bool; // Indicates if the series is favorited by the user
	type Error = Arc<sea_orm::error::DbErr>;

	async fn load(
		&self,
		keys: &[FavoriteSeriesLoaderKey],
	) -> Result<HashMap<FavoriteSeriesLoaderKey, Self::Value>, Self::Error> {
		let favorite_records = favorite_series::Entity::find()
			.filter(
				favorite_series::Column::SeriesId
					.is_in(
						keys.iter()
							.map(|key| key.series_id.clone())
							.collect::<Vec<_>>(),
					)
					.and(
						favorite_series::Column::UserId.is_in(
							keys.iter()
								.map(|key| key.user_id.clone())
								.collect::<Vec<_>>(),
						),
					),
			)
			.all(self.conn.as_ref())
			.await?;

		let mut result = HashMap::new();

		for key in keys {
			let favorite = favorite_records
				.iter()
				.find(|f| f.user_id == key.user_id && f.series_id == key.series_id)
				.cloned();

			if favorite.is_some() {
				result.insert(key.clone(), true);
			}
		}

		Ok(result)
	}
}

#[derive(Clone, PartialEq, Eq, Hash)]
pub struct FavoriteLibraryLoaderKey {
	pub user_id: String,
	pub library_id: String,
}

impl Loader<FavoriteLibraryLoaderKey> for FavoritesLoader {
	type Value = bool; // Indicates if the library is favorited by the user
	type Error = Arc<sea_orm::error::DbErr>;

	async fn load(
		&self,
		keys: &[FavoriteLibraryLoaderKey],
	) -> Result<HashMap<FavoriteLibraryLoaderKey, Self::Value>, Self::Error> {
		let favorite_records = favorite_library::Entity::find()
			.filter(
				favorite_library::Column::LibraryId
					.is_in(
						keys.iter()
							.map(|key| key.library_id.clone())
							.collect::<Vec<_>>(),
					)
					.and(
						favorite_library::Column::UserId.is_in(
							keys.iter()
								.map(|key| key.user_id.clone())
								.collect::<Vec<_>>(),
						),
					),
			)
			.all(self.conn.as_ref())
			.await?;

		let mut result = HashMap::new();

		for key in keys {
			let favorite = favorite_records
				.iter()
				.find(|f| f.user_id == key.user_id && f.library_id == key.library_id)
				.cloned();

			if favorite.is_some() {
				result.insert(key.clone(), true);
			}
		}

		Ok(result)
	}
}

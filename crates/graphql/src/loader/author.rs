use async_graphql::dataloader::Loader;
use models::entity::{media, media_metadata, series, user};
use sea_orm::{prelude::*, sea_query::Query};
use std::{collections::HashMap, sync::Arc};

use crate::object::media::Media;

// This is basically the same as it has been for ages but it should go with another note
// that this kind of parsing is super fragile. I wish metadata was WAY more standarized, because
// "Last, First" will just break hard
fn parse_writers(writers: &str) -> Vec<String> {
	writers
		.split(',')
		.map(|s| s.trim().to_string())
		.filter(|s| !s.is_empty())
		.collect()
}

fn series_in_library_subquery(library_id: String) -> sea_orm::sea_query::SelectStatement {
	Query::select()
		.column(series::Column::Id)
		.from(series::Entity)
		.and_where(series::Column::LibraryId.eq(library_id))
		.to_owned()
}

pub struct AuthorMediaLoader {
	conn: Arc<DatabaseConnection>,
}

impl AuthorMediaLoader {
	pub fn new(conn: Arc<DatabaseConnection>) -> Self {
		Self { conn }
	}
}

/// Key for loading media by author name, optionally scoped to a library and user
#[derive(Clone, PartialEq, Eq, Hash, Debug)]
pub struct AuthorMediaLoaderKey {
	pub author_name: String,
	pub library_id: Option<String>,
	pub user_id: String,
}

impl Loader<AuthorMediaLoaderKey> for AuthorMediaLoader {
	type Value = Vec<Media>;
	type Error = Arc<sea_orm::error::DbErr>;

	async fn load(
		&self,
		keys: &[AuthorMediaLoaderKey],
	) -> Result<HashMap<AuthorMediaLoaderKey, Self::Value>, Self::Error> {
		if keys.is_empty() {
			return Ok(HashMap::new());
		}

		let mut grouped: HashMap<(Option<String>, String), Vec<String>> = HashMap::new();
		for key in keys {
			grouped
				.entry((key.library_id.clone(), key.user_id.clone()))
				.or_default()
				.push(key.author_name.clone());
		}

		let mut result: HashMap<AuthorMediaLoaderKey, Vec<Media>> = HashMap::new();

		for key in keys {
			result.insert(key.clone(), Vec::new());
		}

		let mut user_map = HashMap::<String, user::AuthUser>::new();

		// Most likely there will only be one user per batch, so fetching in a loop would be pointlessly expensive
		let user_ids: Vec<String> =
			grouped.keys().map(|(_, user_id)| user_id.clone()).collect();

		let login_users = user::LoginUser::find()
			.filter(user::Column::Id.is_in(user_ids))
			.into_model::<user::LoginUser>()
			.all(self.conn.as_ref())
			.await?;

		for login_user in login_users {
			user_map
				.entry(login_user.id.clone())
				.or_insert(login_user.into());
		}

		for ((library_id, user_id), author_names) in grouped {
			let Some(auth_user) = user_map.get(&user_id) else {
				continue;
			};

			let mut query = media::ModelWithMetadata::find_for_user(auth_user)
				.filter(media_metadata::Column::Writers.is_not_null());

			if let Some(ref lib_id) = library_id {
				query = query.filter(
					media::Column::SeriesId
						.in_subquery(series_in_library_subquery(lib_id.clone())),
				);
			}

			let models = query
				.into_model::<media::ModelWithMetadata>()
				.all(self.conn.as_ref())
				.await?;

			let author_names_lower: HashMap<String, String> = author_names
				.iter()
				.map(|n| (n.to_lowercase(), n.clone()))
				.collect();

			for model in models {
				if let Some(ref metadata) = model.metadata {
					if let Some(ref writers) = metadata.writers {
						let media_authors = parse_writers(writers);
						for author in &media_authors {
							let author_lower = author.to_lowercase();
							if let Some(original_name) =
								author_names_lower.get(&author_lower)
							{
								let key = AuthorMediaLoaderKey {
									author_name: original_name.clone(),
									library_id: library_id.clone(),
									user_id: user_id.clone(),
								};
								if let Some(media_list) = result.get_mut(&key) {
									media_list.push(Media::from(model.clone()));
								}
							}
						}
					}
				}
			}
		}

		Ok(result)
	}
}

/// Loader for media by metadata series title (not the series entity)
pub struct MetadataSeriesMediaLoader {
	conn: Arc<DatabaseConnection>,
}

impl MetadataSeriesMediaLoader {
	pub fn new(conn: Arc<DatabaseConnection>) -> Self {
		Self { conn }
	}
}

/// Key for loading media by metadata series title
#[derive(Clone, PartialEq, Eq, Hash, Debug)]
pub struct MetadataSeriesMediaLoaderKey {
	pub series_title: String,
	pub library_id: Option<String>,
	pub user_id: String,
}

impl Loader<MetadataSeriesMediaLoaderKey> for MetadataSeriesMediaLoader {
	type Value = Vec<Media>;
	type Error = Arc<sea_orm::error::DbErr>;

	async fn load(
		&self,
		keys: &[MetadataSeriesMediaLoaderKey],
	) -> Result<HashMap<MetadataSeriesMediaLoaderKey, Self::Value>, Self::Error> {
		if keys.is_empty() {
			return Ok(HashMap::new());
		}

		let mut grouped: HashMap<(Option<String>, String), Vec<String>> = HashMap::new(); // (library_id, user_id) -> series titles
		for key in keys {
			grouped
				.entry((key.library_id.clone(), key.user_id.clone()))
				.or_default()
				.push(key.series_title.clone());
		}

		let mut result: HashMap<MetadataSeriesMediaLoaderKey, Vec<Media>> =
			HashMap::new();

		for key in keys {
			result.insert(key.clone(), Vec::new());
		}

		let user_ids: Vec<String> =
			grouped.keys().map(|(_, user_id)| user_id.clone()).collect();

		let login_users = user::LoginUser::find()
			.filter(user::Column::Id.is_in(user_ids))
			.into_model::<user::LoginUser>()
			.all(self.conn.as_ref())
			.await?;

		let mut user_map = HashMap::<String, user::AuthUser>::new();

		for login_user in login_users {
			user_map
				.entry(login_user.id.clone())
				.or_insert(login_user.into());
		}

		for ((library_id, user_id), series_titles) in grouped {
			let Some(auth_user) = user_map.get(&user_id) else {
				continue;
			};

			let mut query = media::ModelWithMetadata::find_for_user(auth_user)
				.filter(media_metadata::Column::Series.is_not_null());

			if let Some(ref lib_id) = library_id {
				query = query.filter(
					media::Column::SeriesId
						.in_subquery(series_in_library_subquery(lib_id.clone())),
				);
			}

			let models = query
				.into_model::<media::ModelWithMetadata>()
				.all(self.conn.as_ref())
				.await?;

			let series_titles_lower: HashMap<String, String> = series_titles
				.iter()
				.map(|t| (t.to_lowercase(), t.clone()))
				.collect();

			for model in models {
				if let Some(ref metadata) = model.metadata {
					if let Some(ref series_name) = metadata.series {
						let series_lower = series_name.to_lowercase();
						if let Some(original_title) =
							series_titles_lower.get(&series_lower)
						{
							let key = MetadataSeriesMediaLoaderKey {
								series_title: original_title.clone(),
								library_id: library_id.clone(),
								user_id: user_id.clone(),
							};
							if let Some(media_list) = result.get_mut(&key) {
								media_list.push(Media::from(model.clone()));
							}
						}
					}
				}
			}
		}

		Ok(result)
	}
}

use async_trait::async_trait;
use models::{domain::author::normalize_author_name, entity::author};
use sea_orm::{prelude::*, ActiveValue::Set, ConnectionTrait, EntityTrait, Iterable};
use std::collections::{HashMap, HashSet};
use uuid::Uuid;

use crate::{
	database::{get_insert_batch_size, SQLITE_BIND_LIMIT},
	CoreResult,
};

#[async_trait]
pub trait NameKeyedEntity {
	type Id: Clone;

	/// get the lookup key for a given raw value
	fn lookup_key(raw: &str) -> String;

	/// fetches ids for keys which already exist
	async fn find(
		conn: &impl ConnectionTrait,
		keys: HashSet<String>,
	) -> CoreResult<HashMap<String, Self::Id>>;

	/// inserts any missing lookup keys and returns a map of
	/// key-to-id
	async fn insert(
		conn: &impl ConnectionTrait,
		values: HashMap<String, String>,
	) -> CoreResult<HashMap<String, Self::Id>>;
}

// TODO: i should consider extending to merge with the other maps used during scans too

pub struct EntityCache<E: NameKeyedEntity> {
	by_key: HashMap<String, E::Id>,
}

impl<E: NameKeyedEntity> EntityCache<E> {
	pub async fn build(
		conn: &impl ConnectionTrait,
		raw_values: HashSet<String>,
	) -> CoreResult<Self> {
		if raw_values.is_empty() {
			return Ok(Self {
				by_key: HashMap::new(),
			});
		}

		let mut raw_by_key = HashMap::new();
		for raw in raw_values {
			raw_by_key.entry(E::lookup_key(&raw)).or_insert(raw);
		}
		let keys = raw_by_key.keys().cloned().collect::<HashSet<_>>();
		let mut by_key = E::find(conn, keys).await?;

		let missing: HashMap<String, String> = raw_by_key
			.into_iter()
			.filter(|(key, _)| !by_key.contains_key(key))
			.collect();
		if !missing.is_empty() {
			by_key.extend(E::insert(conn, missing).await?);
		}

		Ok(Self { by_key })
	}

	/// returns the cached id for the given raw value
	pub fn get(&self, raw: &str) -> Option<E::Id> {
		self.by_key.get(&E::lookup_key(raw)).cloned()
	}
}

pub(crate) struct AuthorEntity;

#[async_trait]
impl NameKeyedEntity for AuthorEntity {
	type Id = String; // uuid

	fn lookup_key(raw: &str) -> String {
		normalize_author_name(raw)
	}

	async fn find(
		conn: &impl ConnectionTrait,
		keys: HashSet<String>,
	) -> CoreResult<HashMap<String, String>> {
		let keys = keys.into_iter().collect::<Vec<_>>();
		let mut by_key = HashMap::with_capacity(keys.len());

		for chunk in keys.chunks(SQLITE_BIND_LIMIT) {
			let rows = author::Entity::find()
				.filter(author::Column::NormalizedName.is_in(chunk.to_vec()))
				.all(conn)
				.await?;

			for row in rows {
				by_key.insert(row.normalized_name, row.id);
			}
		}

		// let unresolved = keys
		// 	.iter()
		// 	.filter(|key| !by_key.contains_key(*key))
		// 	.cloned()
		// 	.collect::<Vec<_>>();
		// ^ not sure what to do here yet. i am realizing there is a world where authors
		// have aliases which could also be matched for here? but then, for any remaining
		// misses, not sure.

		Ok(by_key)
	}

	async fn insert(
		conn: &impl ConnectionTrait,
		values: HashMap<String, String>, // normalized key -> display name
	) -> CoreResult<HashMap<String, String>> {
		let active_models = values
			.into_iter()
			.filter_map(|(normalized_name, name)| {
				let name = name.trim().to_string();
				if name.is_empty() || normalized_name.is_empty() {
					return None;
				}
				Some(author::ActiveModel {
					id: Set(Uuid::new_v4().to_string()),
					name: Set(name),
					normalized_name: Set(normalized_name),
					..Default::default()
				})
			})
			.collect::<Vec<_>>();

		let mut by_key = HashMap::with_capacity(active_models.len());

		let chunk_size = get_insert_batch_size(author::Column::iter().count());
		for chunk in active_models.chunks(chunk_size) {
			let inserted = author::Entity::insert_many(chunk.to_vec())
				.exec_with_returning(conn)
				.await?;

			for row in inserted {
				by_key.insert(row.normalized_name, row.id);
			}
		}

		Ok(by_key)
	}
}

pub(crate) type AuthorCache = EntityCache<AuthorEntity>;

// TODO: tag_cache here

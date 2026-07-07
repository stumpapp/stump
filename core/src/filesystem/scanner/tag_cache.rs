use std::collections::{HashMap, HashSet};

use models::entity::tag;
use sea_orm::{prelude::*, Iterable, Set};

use crate::{
	database::{self, SQLITE_BIND_LIMIT},
	error::{CoreError, CoreResult},
};

/// a scan-wide cache mapping tag name to tag ID. added to reduce the number of trips
/// to the database for tags which are likely to be shared across many entities
#[derive(Debug, Default)]
pub(crate) struct TagCache(HashMap<String, i32>);

impl TagCache {
	/// builds a `TagCache` from a set of names, ensuring all exist in the database
	/// and properly caching their IDs
	pub(crate) async fn build(
		conn: &DatabaseConnection,
		all_tag_names: HashSet<String>,
	) -> CoreResult<Self> {
		if all_tag_names.is_empty() {
			return Ok(Self::default());
		}

		let names: Vec<_> = all_tag_names.iter().cloned().collect();
		let mut map = HashMap::with_capacity(names.len());

		for chunk in names.chunks(SQLITE_BIND_LIMIT) {
			let rows = tag::Entity::find()
				.filter(tag::Column::Name.is_in(chunk.to_vec()))
				.all(conn)
				.await?;

			for row in rows {
				map.insert(row.name, row.id);
			}
		}

		let missing: Vec<tag::ActiveModel> = all_tag_names
			.iter()
			.filter(|n| !map.contains_key(*n))
			.map(|n| tag::ActiveModel {
				name: Set(n.clone()),
				..Default::default()
			})
			.collect();

		if !missing.is_empty() {
			let tag_cols = tag::Column::iter().count();
			let batch_size = database::get_insert_batch_size(tag_cols);
			for chunk in missing.chunks(batch_size) {
				let inserted = tag::Entity::insert_many(chunk.to_vec())
					.exec_with_returning_many(conn)
					.await
					.map_err(CoreError::from)?;

				for row in inserted {
					map.insert(row.name, row.id);
				}
			}
		}

		Ok(Self(map))
	}

	/// returns the cached ID for the given tag name
	pub(crate) fn get(&self, name: &str) -> Option<i32> {
		self.0.get(name).copied()
	}
}

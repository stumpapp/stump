use std::collections::HashMap;

use prisma_client_rust::{raw, PrismaValue};
use serde::{Deserialize, Serialize};

use crate::{prisma::PrismaClient, CoreResult};

/// A utility enum that can represent either an array of items or a single item.
#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(untagged)]
pub enum ArrayOrItem<T> {
	Array(Vec<T>),
	Item(T),
}

/// A struct representing the position of an entity within the context of another entity.
/// E.g. the position of a book within a series.
///
/// The position is **1-indexed**.
#[derive(Deserialize)]
struct EntityPosition {
	id: String,
	position: i64,
}

/// A trait to extend the PrismaClient with methods that are specific to the OPDS v2.0
/// implementation.
#[async_trait::async_trait]
pub trait OPDSV2PrismaExt {
	/// Fetches the positions of books in a series, given a list of book IDs and a series ID.
	/// The positions are **1-indexed**. If a book is not found in the series, it will not be included
	/// but it will not cause an error.
	async fn book_positions_in_series(
		&self,
		book_ids: Vec<String>,
		series_id: String,
	) -> CoreResult<HashMap<String, i64>>;
}

#[async_trait::async_trait]
impl OPDSV2PrismaExt for PrismaClient {
	async fn book_positions_in_series(
		&self,
		book_ids: Vec<String>,
		series_id: String,
	) -> CoreResult<HashMap<String, i64>> {
		// TODO: we need to factor in the metadata relation here, and use the name-sorted rank as the fallback
		// E.g. if a book at the end of the series has metadata with `number` set to 1, it should be ranked first.
		// I have tried RANK() OVER (ORDER BY CASE WHEN md.number IS NOT NULL THEN md.number ELSE m.name END ASC) AS position
		// but it doesn't work as expected. We need to figure out how to do this properly.
		let ranked: Vec<EntityPosition> = self
			._query_raw(raw!(
				r#"
				WITH ranked AS (
					SELECT id, RANK() OVER (ORDER BY name ASC) AS position
					FROM media
					WHERE series_id = {}
				)
				SELECT id, position
				FROM ranked
				"#,
				PrismaValue::String(series_id)
			))
			// FIXME: pcr: does not support PrismaValue::List
			// WHERE id IN ({})
			// PrismaValue::List(
			// 	book_ids.into_iter().map(PrismaValue::String).collect()
			// )
			.exec()
			.await?;

		Ok(ranked
			.into_iter()
			.filter(|ep| book_ids.contains(&ep.id)) // FIXME: pcr: same as above
			.map(|ep| (ep.id, ep.position))
			.collect())
	}
}

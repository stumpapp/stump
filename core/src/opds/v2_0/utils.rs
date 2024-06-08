use std::collections::HashMap;

use prisma_client_rust::{raw, PrismaValue};
use serde::{Deserialize, Serialize};

use crate::{prisma::PrismaClient, CoreResult};

#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(untagged)]
pub enum ArrayOrItem<T> {
	Array(Vec<T>),
	Item(T),
}

#[derive(Deserialize)]
struct EntityPosition {
	id: String,
	position: i64,
}

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
				WHERE id IN ({})
				"#,
				PrismaValue::String(series_id),
				PrismaValue::List(
					book_ids.into_iter().map(PrismaValue::String).collect()
				)
			))
			.exec()
			.await?;

		Ok(ranked.into_iter().map(|ep| (ep.id, ep.position)).collect())
	}
}

use std::collections::HashMap;

use chrono::Utc;
use sea_orm::{
	prelude::*, DatabaseBackend, DatabaseConnection, FromQueryResult, Statement,
};
use serde::{Deserialize, Serialize};

use crate::CoreResult;

pub fn default_now() -> String {
	Utc::now().to_rfc3339()
}

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
#[derive(Deserialize, Serialize, FromQueryResult)]
pub(crate) struct EntityPosition {
	pub id: String,
	pub position: i64,
}

/// A trait to extend a [`DatabaseConnection`] with methods that are specific to the OPDS v2.0
/// implementation.
#[async_trait::async_trait]
pub trait OPDSV2QueryExt {
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
impl OPDSV2QueryExt for DatabaseConnection {
	async fn book_positions_in_series(
		&self,
		book_ids: Vec<String>,
		series_id: String,
	) -> CoreResult<HashMap<String, i64>> {
		let result: Vec<QueryResult> = self
			.query_all(Statement::from_sql_and_values(
				DatabaseBackend::Sqlite,
				format!(
					r"
				WITH ranked AS (
					SELECT id, RANK() OVER (ORDER BY name ASC) AS position
					FROM media
					WHERE series_id = ?
				)
				SELECT id, position
				FROM ranked
				WHERE id IN ({})
				",
					book_ids
						.into_iter()
						.map(|id| format!("\"{id}\""))
						.collect::<Vec<_>>()
						.join(",")
				),
				[series_id.into()],
			))
			.await?;

		let ranked = result
			.into_iter()
			.map(|row| EntityPosition::from_query_result(&row, ""))
			.collect::<Result<Vec<_>, _>>()?;

		Ok(ranked.into_iter().map(|ep| (ep.id, ep.position)).collect())
	}
}

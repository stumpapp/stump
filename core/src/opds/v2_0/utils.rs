use std::collections::HashMap;

use chrono::Utc;
use sea_orm::{prelude::*, DatabaseConnection, FromQueryResult, Value};
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
#[derive(Deserialize, Serialize, FromQueryResult)]
pub(crate) struct EntityPosition {
	pub id: String,
	pub position: f64,
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
	) -> CoreResult<HashMap<String, f64>>;
}

#[async_trait::async_trait]
impl OPDSV2QueryExt for DatabaseConnection {
	async fn book_positions_in_series(
		&self,
		book_ids: Vec<String>,
		series_id: String,
	) -> CoreResult<HashMap<String, f64>> {
		let backend = self.get_database_backend();
		// Build $2, $3, ... placeholders for each book ID
		let in_placeholders = (2..=book_ids.len() + 1)
			.map(|i| format!("${i}"))
			.collect::<Vec<_>>()
			.join(", ");
		let sql = format!(
			r"
			WITH ranked AS (
				SELECT m.id,
				   COALESCE(
				       CAST(mm.number AS DOUBLE PRECISION),
				       CAST(RANK() OVER (ORDER BY m.name ASC) AS DOUBLE PRECISION)
				   ) AS position
				FROM media m
				LEFT JOIN media_metadata mm ON mm.media_id = m.id
				WHERE m.series_id = $1
			)
			SELECT id, position
			FROM ranked
			WHERE id IN ({in_placeholders})
			"
		);
		let mut values: Vec<Value> = vec![series_id.into()];
		values.extend(book_ids.into_iter().map(Value::from));

		let result: Vec<QueryResult> = self
			.query_all(sea_orm::Statement::from_sql_and_values(
				backend, sql, values,
			))
			.await?;

		let ranked = result
			.into_iter()
			.map(|row| EntityPosition::from_query_result(&row, ""))
			.collect::<Result<Vec<_>, _>>()?;

		Ok(ranked.into_iter().map(|ep| (ep.id, ep.position)).collect())
	}
}

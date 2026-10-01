use async_graphql::dataloader::Loader;
use sea_orm::{ConnectionTrait, DatabaseConnection, FromQueryResult};
use std::{collections::HashMap, sync::Arc};

use crate::{object::stats::SeriesStats, utils::db_statement};

/// A data loader for fetching many series stats optimally
pub struct SeriesStatsLoader {
	conn: Arc<DatabaseConnection>,
}

impl SeriesStatsLoader {
	pub fn new(conn: Arc<DatabaseConnection>) -> Self {
		Self { conn }
	}
}

#[derive(Clone, PartialEq, Eq, Hash)]
pub struct SeriesStatsLoaderKey {
	pub user_id: String,
	pub series_id: String,
}

impl Loader<SeriesStatsLoaderKey> for SeriesStatsLoader {
	type Value = SeriesStats;
	type Error = Arc<sea_orm::error::DbErr>;

	async fn load(
		&self,
		keys: &[SeriesStatsLoaderKey],
	) -> Result<HashMap<SeriesStatsLoaderKey, Self::Value>, Self::Error> {
		if keys.is_empty() {
			return Ok(HashMap::new());
		}

		let mut user_id_to_series_ids: HashMap<String, Vec<String>> = HashMap::new();
		for key in keys {
			user_id_to_series_ids
				.entry(key.user_id.clone())
				.or_default()
				.push(key.series_id.clone());
		}

		let mut result = HashMap::new();

		for (user_id, series_ids) in &user_id_to_series_ids {
			let placeholders = (1..=series_ids.len())
				.map(|i| format!("${i}"))
				.collect::<Vec<_>>()
				.join(", "); // $1..$N are series ids
			let user_param = format!("${}", series_ids.len() + 1); // n+1 is user

			let sql = format!(
				r#"
				WITH media_for_series AS (
					SELECT id, series_id, size
					FROM media
					WHERE series_id IN ({placeholders})
				),
				base_counts AS (
					SELECT
						series_id,
						COUNT(*) AS book_count,
						COALESCE(CAST(SUM(size) AS BIGINT), 0) AS total_bytes
					FROM media_for_series
					GROUP BY series_id
				),
				filtered_sessions AS (
					SELECT
						rs.id,
						rs.media_id,
						rs.user_id,
						rs.readthrough_number,
						rs.status,
						rs.elapsed_seconds,
						rs.updated_at,
						rs.created_at,
						mfs.series_id
					FROM reading_sessions rs
					JOIN media_for_series mfs ON mfs.id = rs.media_id
					WHERE rs.user_id = {user_param}
				),
				latest_readthrough_sessions AS (
					SELECT
						frs.media_id,
						frs.user_id,
						frs.readthrough_number,
						frs.status,
						frs.series_id
					FROM filtered_sessions frs
					WHERE NOT EXISTS (
						SELECT 1
						FROM filtered_sessions rs2
						WHERE rs2.user_id = frs.user_id
						  AND rs2.media_id = frs.media_id
						  AND rs2.readthrough_number = frs.readthrough_number
						  AND (
							COALESCE(rs2.updated_at, rs2.created_at) > COALESCE(frs.updated_at, frs.created_at)
							OR (
								COALESCE(rs2.updated_at, rs2.created_at) = COALESCE(frs.updated_at, frs.created_at)
								AND rs2.created_at > frs.created_at
							)
							OR (
								COALESCE(rs2.updated_at, rs2.created_at) = COALESCE(frs.updated_at, frs.created_at)
								AND rs2.created_at = frs.created_at
								AND rs2.id > frs.id
							)
						  )
					)
				),
				readthrough_elapsed AS (
					SELECT
						frs.media_id,
						frs.user_id,
						frs.readthrough_number,
						frs.series_id,
						COALESCE(CAST(SUM(frs.elapsed_seconds) AS BIGINT), 0) AS readthrough_elapsed_seconds
					FROM filtered_sessions frs
					GROUP BY frs.media_id, frs.user_id, frs.readthrough_number, frs.series_id
				),
				readthrough_stats AS (
					SELECT
						lrs.media_id,
						lrs.series_id,
						MAX(CASE WHEN lrs.status = 'FINISHED' THEN 1 ELSE 0 END) AS has_finished,
						MAX(CASE WHEN lrs.status = 'READING' THEN 1 ELSE 0 END) AS has_reading,
						COALESCE(CAST(SUM(rte.readthrough_elapsed_seconds) AS BIGINT), 0) AS readthrough_elapsed_seconds
					FROM latest_readthrough_sessions lrs
					INNER JOIN readthrough_elapsed rte
						ON rte.media_id = lrs.media_id
						AND rte.user_id = lrs.user_id
						AND rte.readthrough_number = lrs.readthrough_number
					GROUP BY lrs.media_id, lrs.series_id
				),
				session_stats AS (
					SELECT
						series_id,
						COUNT(CASE WHEN has_finished = 1 THEN media_id END) AS completed_books,
						COUNT(CASE WHEN has_reading = 1 THEN media_id END) AS in_progress_books,
						COALESCE(CAST(SUM(readthrough_elapsed_seconds) AS BIGINT), 0) AS total_reading_time_seconds
					FROM readthrough_stats
					GROUP BY series_id
				)
				SELECT
					bc.series_id,
					bc.book_count,
					bc.total_bytes,
					COALESCE(ss.completed_books, 0) AS completed_books,
					COALESCE(ss.in_progress_books, 0) AS in_progress_books,
					COALESCE(ss.total_reading_time_seconds, 0) AS total_reading_time_seconds
				FROM base_counts bc
				LEFT JOIN session_stats ss ON ss.series_id = bc.series_id
				"#
			);

			let mut values: Vec<sea_orm::Value> =
				series_ids.iter().map(|id| id.clone().into()).collect();
			values.push(user_id.clone().into());

			let rows = self
				.conn
				.query_all(db_statement(self.conn.as_ref(), sql, values))
				.await?;

			for row in rows {
				let series_id: String = row.try_get("", "series_id")?;
				let stats = SeriesStats::from_query_result(&row, "")?;
				result.insert(
					SeriesStatsLoaderKey {
						user_id: user_id.clone(),
						series_id,
					},
					stats,
				);
			}
		}

		Ok(result)
	}
}

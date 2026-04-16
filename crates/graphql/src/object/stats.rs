use async_graphql::{Result, SimpleObject};
use sea_orm::{
	prelude::*, DatabaseBackend, DatabaseConnection, FromQueryResult, Statement,
};

// eventually i see more stats living in here, e.g.:
// - https://github.com/stumpapp/stump/issues/559
// - https://github.com/stumpapp/stump/tree/al/statistics <-- super stale

#[derive(Debug, FromQueryResult, SimpleObject)]
pub struct BookAggregateStats {
	book_count: i64,
	total_bytes: i64,
	completed_books: i64,
	in_progress_books: i64,
	total_reading_time_seconds: i64,
}

// Note: SQLx does not support u64 :'(
// See https://github.com/launchbadge/sqlx/issues/499
#[derive(Debug, FromQueryResult, SimpleObject)]
pub struct LibraryStats {
	series_count: i64,
	#[graphql(flatten)]
	#[sea_orm(nested)]
	inner: BookAggregateStats,
}

impl LibraryStats {
	pub async fn fetch(
		conn: &DatabaseConnection,
		for_library: Option<String>,
		user_id: String,
		for_all_users: bool,
	) -> Result<Self> {
		let result = conn
			.query_one(Statement::from_sql_and_values(
				DatabaseBackend::Sqlite,
				r"
				WITH library_media AS (
					SELECT media.id, media.size
					FROM media
					INNER JOIN series ON media.series_id = series.id
					WHERE ($1 IS NULL OR series.library_id = $1)
				),
				base_counts AS (
					SELECT
						COUNT(*) AS book_count,
						IFNULL(SUM(size), 0) AS total_bytes,
						(SELECT COUNT(*) FROM series WHERE ($1 IS NULL OR series.library_id = $1)) AS series_count
					FROM library_media
				),
				finished_stats AS (
					SELECT
						COUNT(DISTINCT frs.media_id) AS completed_books,
						IFNULL(SUM(frs.elapsed_seconds), 0) AS finished_reading_time
					FROM finished_reading_sessions frs
					WHERE frs.media_id IN (SELECT id FROM library_media)
						AND ($2 IS TRUE OR frs.user_id = $3)
				),
				active_stats AS (
					SELECT
						COUNT(DISTINCT rs.media_id) AS in_progress_books,
						IFNULL(SUM(rs.elapsed_seconds), 0) AS active_reading_time
					FROM reading_sessions rs
					WHERE rs.media_id IN (SELECT id FROM library_media)
						AND ($2 IS TRUE OR rs.user_id = $3)
				)
				SELECT
					base_counts.book_count,
					base_counts.total_bytes,
					base_counts.series_count,
					finished_stats.completed_books,
					active_stats.in_progress_books,
					(finished_stats.finished_reading_time + active_stats.active_reading_time) AS total_reading_time_seconds
				FROM base_counts, finished_stats, active_stats;
				",
				[
					for_library.into(),
					for_all_users.into(),
					user_id.into(),
				],
			))
			.await?
			.ok_or("Library stats failed to be calculated")?;

		Ok(LibraryStats::from_query_result(&result, "")?)
	}
}

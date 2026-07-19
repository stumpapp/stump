use async_graphql::{Result, SimpleObject};
use sea_orm::{
	prelude::*, DatabaseBackend, DatabaseConnection, FromQueryResult, Statement,
};

// eventually i see more stats living in here, e.g.:
// - https://github.com/stumpapp/stump/issues/559
// - https://github.com/stumpapp/stump/tree/al/statistics <-- super stale

// Note: SQLx does not support u64 :'(
// See https://github.com/launchbadge/sqlx/issues/499
#[derive(Debug, FromQueryResult, SimpleObject)]
pub struct BookAggregateStats {
	book_count: i64,
	total_bytes: i64,
	completed_books: i64,
	in_progress_books: i64,
	total_reading_time_seconds: i64,
	// TODO: completed_series?
}

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
				filtered_sessions AS (
					SELECT *
					FROM reading_sessions
					WHERE media_id IN (SELECT id FROM library_media)
						AND ($2 IS TRUE OR user_id = $3)
				),
				latest_readthrough_sessions AS (
					SELECT
						frs.media_id,
						frs.user_id,
						frs.readthrough_number,
						frs.status
					FROM filtered_sessions frs
					WHERE NOT EXISTS (
							SELECT 1
							FROM filtered_sessions rs2
							WHERE rs2.user_id = frs.user_id
								AND rs2.media_id = frs.media_id
								AND rs2.readthrough_number = frs.readthrough_number
								AND (
									IFNULL(rs2.updated_at, rs2.created_at) > IFNULL(frs.updated_at, frs.created_at)
									OR (
										IFNULL(rs2.updated_at, rs2.created_at) = IFNULL(frs.updated_at, frs.created_at)
										AND rs2.created_at > frs.created_at
									)
									OR (
										IFNULL(rs2.updated_at, rs2.created_at) = IFNULL(frs.updated_at, frs.created_at)
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
						IFNULL(SUM(frs.elapsed_seconds), 0) AS readthrough_elapsed_seconds
					FROM filtered_sessions frs
					GROUP BY frs.media_id, frs.user_id, frs.readthrough_number
				),
				readthrough_stats AS (
					SELECT
						lrs.media_id,
						MAX(CASE WHEN lrs.status = 'FINISHED' THEN 1 ELSE 0 END) AS has_finished,
						MAX(CASE WHEN lrs.status = 'READING' THEN 1 ELSE 0 END) AS has_reading,
						IFNULL(SUM(rte.readthrough_elapsed_seconds), 0) AS readthrough_elapsed_seconds
					FROM latest_readthrough_sessions lrs
					INNER JOIN readthrough_elapsed rte
						ON rte.media_id = lrs.media_id
						AND rte.user_id = lrs.user_id
						AND rte.readthrough_number = lrs.readthrough_number
					GROUP BY lrs.media_id
				),
				session_stats AS (
					SELECT
						COUNT(CASE WHEN has_finished = 1 THEN media_id END) AS completed_books,
						COUNT(CASE WHEN has_reading = 1 THEN media_id END) AS in_progress_books,
						IFNULL(SUM(readthrough_elapsed_seconds), 0) AS total_reading_time_seconds
					FROM readthrough_stats
				)
				SELECT
					base_counts.book_count,
					base_counts.total_bytes,
					base_counts.series_count,
					session_stats.completed_books,
					session_stats.in_progress_books,
					session_stats.total_reading_time_seconds
				FROM base_counts, session_stats;
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

#[derive(Debug, FromQueryResult, SimpleObject)]
pub struct SeriesStats {
	#[graphql(flatten)]
	#[sea_orm(nested)]
	inner: BookAggregateStats,
}

impl SeriesStats {
	pub async fn fetch(
		conn: &DatabaseConnection,
		// i did not make this optional bc to say "all series" is effectively the same as library stats
		for_series: String,
		user_id: String,
		for_all_users: bool,
	) -> Result<Self> {
		let result = conn
			.query_one(Statement::from_sql_and_values(
				DatabaseBackend::Sqlite,
				r"
				WITH base_counts AS (
					SELECT
						COUNT(*) AS book_count,
						IFNULL(SUM(media.size), 0) AS total_bytes
					FROM media
					WHERE media.series_id = $1
				),
				filtered_sessions AS (
					SELECT *
					FROM reading_sessions
					WHERE media_id IN (SELECT id FROM media WHERE series_id = $1)
						AND ($2 IS TRUE OR user_id = $3)
				),
				latest_readthrough_sessions AS (
					SELECT
						frs.media_id,
						frs.user_id,
						frs.readthrough_number,
						frs.status
					FROM filtered_sessions frs
					WHERE NOT EXISTS (
							SELECT 1
							FROM filtered_sessions rs2
							WHERE rs2.user_id = frs.user_id
								AND rs2.media_id = frs.media_id
								AND rs2.readthrough_number = frs.readthrough_number
								AND (
									IFNULL(rs2.updated_at, rs2.created_at) > IFNULL(frs.updated_at, frs.created_at)
									OR (
										IFNULL(rs2.updated_at, rs2.created_at) = IFNULL(frs.updated_at, frs.created_at)
										AND rs2.created_at > frs.created_at
									)
									OR (
										IFNULL(rs2.updated_at, rs2.created_at) = IFNULL(frs.updated_at, frs.created_at)
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
						IFNULL(SUM(frs.elapsed_seconds), 0) AS readthrough_elapsed_seconds
					FROM filtered_sessions frs
					GROUP BY frs.media_id, frs.user_id, frs.readthrough_number
				),
				readthrough_stats AS (
					SELECT
						lrs.media_id,
						MAX(CASE WHEN lrs.status = 'FINISHED' THEN 1 ELSE 0 END) AS has_finished,
						MAX(CASE WHEN lrs.status = 'READING' THEN 1 ELSE 0 END) AS has_reading,
						IFNULL(SUM(rte.readthrough_elapsed_seconds), 0) AS readthrough_elapsed_seconds
					FROM latest_readthrough_sessions lrs
					INNER JOIN readthrough_elapsed rte
						ON rte.media_id = lrs.media_id
						AND rte.user_id = lrs.user_id
						AND rte.readthrough_number = lrs.readthrough_number
					GROUP BY lrs.media_id
				),
				session_stats AS (
					SELECT
						COUNT(CASE WHEN has_finished = 1 THEN media_id END) AS completed_books,
						COUNT(CASE WHEN has_reading = 1 THEN media_id END) AS in_progress_books,
						IFNULL(SUM(readthrough_elapsed_seconds), 0) AS total_reading_time_seconds
					FROM readthrough_stats
				)
				SELECT
					base_counts.book_count,
					base_counts.total_bytes,
					session_stats.completed_books,
					session_stats.in_progress_books,
					session_stats.total_reading_time_seconds
				FROM base_counts, session_stats;
				",
				[for_series.into(), for_all_users.into(), user_id.into()],
			))
			.await?
			.ok_or("Series stats failed to be calculated")?;

		Ok(SeriesStats::from_query_result(&result, "")?)
	}
}

// todo: more book stats? not sure i need to "pollute" the above stats with this info, but im thinking things like:
// - number of genres
// - number of characters
// - prominent writers
// etc. some of these things feel cool for libraries and series but i am unsure about adding to the stats above.
// i could put some of these more complex ones behind their own resolvers so they don't weigh down the main stats queries
// but idk ¯\_(ツ)_/¯

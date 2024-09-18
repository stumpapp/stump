use axum::{
	extract::{Query, State},
	middleware,
	routing::get,
	Json, Router,
};
use chrono::{DateTime, FixedOffset};
use prisma_client_rust::{raw, PrismaValue};
use serde::{Deserialize, Serialize};

use crate::{
	config::state::AppState, errors::APIResult, middleware::auth::auth_middleware,
};

pub(crate) fn mount(app_state: AppState) -> Router<AppState> {
	Router::new()
		.nest(
			"/stats",
			Router::new()
				.route("/completed-books", get(completed_books))
				.route("/top-books", get(top_books)),
		)
		.layer(middleware::from_fn_with_state(app_state, auth_middleware))
}

// TODO: move to smart filters?
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct DateRange {
	pub from: DateTime<FixedOffset>,
	pub to: Option<DateTime<FixedOffset>>,
	#[serde(default)]
	pub inclusive: bool,
}

impl Default for DateRange {
	fn default() -> Self {
		Self {
			from: (chrono::Utc::now() - chrono::Duration::days(365)).into(),
			to: None,
			inclusive: false,
		}
	}
}

type BookID = String;

#[derive(Deserialize, Serialize)]
struct CompletedBooksRawQueryData {
	book_id: BookID,
	read_by: String,
	started_at: DateTime<FixedOffset>,
	completed_at: DateTime<FixedOffset>,
}

async fn completed_books(
	State(ctx): State<AppState>,
) -> APIResult<Json<Vec<CompletedBooksRawQueryData>>> {
	let client = &ctx.db;

	let raw_data = client
		._query_raw::<CompletedBooksRawQueryData>(raw!(
			r#"
            SELECT
                u.username AS read_by,
                frs.media_id AS book_id,
                started_at,
                completed_at
            FROM
                finished_reading_sessions frs
                INNER JOIN users u ON u.id = user_id
                INNER JOIN media m ON m.id = frs.media_id;
            "#
		))
		.exec()
		.await?;

	Ok(Json(raw_data))
}

#[derive(Deserialize, Serialize)]
struct TopBooksRawQueryData {
	book_id: BookID,
	filename: String,
	#[serde(skip_serializing_if = "Option::is_none")]
	title: Option<String>,
	read_count: i64,
}

// TODO: validate limt (> 0)
#[derive(Deserialize)]
struct TopBooksQueryParams {
	/// The number of books to return
	limit: i64,
}

impl Default for TopBooksQueryParams {
	fn default() -> Self {
		Self { limit: 5 }
	}
}

async fn top_books(
	State(ctx): State<AppState>,
	Query(params): Query<TopBooksQueryParams>,
) -> APIResult<Json<Vec<TopBooksRawQueryData>>> {
	let client = &ctx.db;

	let raw_data = client
		._query_raw::<TopBooksRawQueryData>(raw!(
			r#"
            SELECT
                m.id AS book_id,
                m.name AS filename,
                mm.title AS title,
                COUNT(frs.media_id) AS read_count
            FROM
                finished_reading_sessions frs
                INNER JOIN media m ON m.id = frs.media_id
                LEFT JOIN media_metadata mm ON mm.media_id = m.id
            GROUP BY
                frs.media_id
            ORDER BY
                read_count DESC
            LIMIT {}
            "#,
			PrismaValue::Int(params.limit)
		))
		.exec()
		.await?;

	Ok(Json(raw_data))
}

/*

-- Top libraries
SELECT
	l.name,
	COUNT(frs.media_id) AS read_count
FROM
	finished_reading_sessions frs
	INNER JOIN media m ON m.id = frs.media_id
	INNER JOIN series s ON s.id = m.series_id
	INNER JOIN libraries l ON s.library_id = l.id
GROUP BY
	l.name
ORDER BY
	read_count DESC
*/

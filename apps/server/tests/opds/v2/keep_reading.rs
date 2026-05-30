use crate::common::{
	book::{
		create_nth_readthrough, fudge_session_time, fudge_session_time_with_timestamp,
		update_progress,
	},
	series::setup_single_series_with_n_books,
	TestApp,
};

use chrono::{Duration, Utc};
use graphql::input::media::{MediaProgressInput, PagedProgressInput};
use models::{entity::reading_session, shared::enums::ReadingStatus};
use sea_orm::{prelude::*, QueryOrder};
use serde_json::Value;
use tests::fake_data;

async fn setup() -> (TestApp, Vec<String>) {
	let app = TestApp::new_with_default_user().await;
	let db = app.conn();

	let image = fake_data::Library {
		id: Some("image".to_string()),
		name: Some("Image".to_string()),
		..Default::default()
	}
	.insert(db)
	.await;

	let (_, books) = setup_single_series_with_n_books(
		&app,
		fake_data::Series {
			id: Some("black_science".to_string()),
			name: Some("Black Science".to_string()),
			library_id: Some(image.id.clone()),
			..Default::default()
		},
		5,
	)
	.await;

	let book_ids = books.into_iter().map(|book| book.id).collect();

	(app, book_ids)
}

fn parse_book_id_from_href(href: &str) -> Option<String> {
	href.rsplit("/books/")
		.next()
		.and_then(|tail| tail.split('/').next())
		.map(ToString::to_string)
}

// a bit scuffed but it's fine
async fn fetch_keep_reading_ids(app: &TestApp) -> Vec<String> {
	let response = app.get("/opds/v2.0/books/keep-reading").await;
	response.assert_status_ok();

	let body: Value = response.json();

	body.get("publications")
		.and_then(Value::as_array)
		.expect("expected publications array")
		.iter()
		.filter_map(|publication| {
			publication
				.get("links")
				.and_then(Value::as_array)
				.and_then(|links| {
					links.iter().find_map(|link| {
						let rel = link.get("rel")?.as_str()?;
						if rel == "self" {
							link.get("href")?.as_str().and_then(parse_book_id_from_href)
						} else {
							None
						}
					})
				})
		})
		.collect()
}

async fn active_session_for_book(app: &TestApp, book_id: &str) -> reading_session::Model {
	let conn = app.conn();

	reading_session::Entity::find()
		.filter(reading_session::Column::MediaId.eq(book_id))
		.filter(reading_session::Column::Status.eq(ReadingStatus::Reading))
		.order_by_desc(reading_session::Column::UpdatedAt)
		.one(conn)
		.await
		.expect("db error")
		.expect("active session should exist")
}

async fn start_active_session(app: &TestApp, book_id: &str, page: i32) {
	update_progress(
		app,
		book_id,
		MediaProgressInput::Paged(PagedProgressInput {
			page,
			elapsed_seconds_delta: Some(300),
			..Default::default()
		}),
	)
	.await;
}

/// if there are no active reading sessions, opds keep-reading should return no books
#[tokio::test]
async fn test_keep_reading_returns_no_books_without_sessions() {
	let (app, _book_ids) = setup().await;
	let ids = fetch_keep_reading_ids(&app).await;
	assert!(ids.is_empty());
}

/// if there are multiple active sessions, opds keep-reading should return them in correct order
#[tokio::test]
async fn test_keep_reading_orders_multiple_active_sessions() {
	let (app, book_ids) = setup().await;
	let conn = app.conn();

	start_active_session(&app, &book_ids[0], 10).await;
	start_active_session(&app, &book_ids[1], 20).await;
	start_active_session(&app, &book_ids[2], 30).await;

	let newest = Utc::now();
	let middle = newest - Duration::minutes(10);
	let oldest = newest - Duration::minutes(20);

	let session_1 = active_session_for_book(&app, &book_ids[0]).await;
	let session_2 = active_session_for_book(&app, &book_ids[1]).await;
	let session_3 = active_session_for_book(&app, &book_ids[2]).await;

	fudge_session_time_with_timestamp(&session_1, conn, oldest).await;
	fudge_session_time_with_timestamp(&session_2, conn, middle).await;
	fudge_session_time_with_timestamp(&session_3, conn, newest).await;

	let ids = fetch_keep_reading_ids(&app).await;
	assert_eq!(
		ids,
		vec![
			book_ids[2].clone(),
			book_ids[1].clone(),
			book_ids[0].clone()
		]
	);

	let active_count = reading_session::Entity::find()
		.filter(reading_session::Column::MediaId.eq(&book_ids[0]))
		.filter(reading_session::Column::Status.eq(ReadingStatus::Reading))
		.count(conn)
		.await
		.expect("db error");
	assert_eq!(active_count, 1);
}

/// opds keep-reading should not return finished sessions or sessions from prior readthroughs
#[tokio::test]
async fn test_keep_reading_filters_finished_and_prior_readthroughs() {
	let (app, book_ids) = setup().await;

	start_active_session(&app, &book_ids[1], 10).await;

	create_nth_readthrough(&app, &book_ids[2], 1).await;
	start_active_session(&app, &book_ids[2], 20).await;

	start_active_session(&app, &book_ids[3], 30).await;
	let book_4_first_session = active_session_for_book(&app, &book_ids[3]).await;
	fudge_session_time(&book_4_first_session, app.conn()).await;
	start_active_session(&app, &book_ids[3], 31).await;

	create_nth_readthrough(&app, &book_ids[4], 2).await;

	let newest = Utc::now();
	let middle = newest - Duration::minutes(10);
	let oldest = newest - Duration::minutes(20);

	let book_2_session = active_session_for_book(&app, &book_ids[1]).await;
	let book_3_session = active_session_for_book(&app, &book_ids[2]).await;
	let book_4_session = active_session_for_book(&app, &book_ids[3]).await;

	fudge_session_time_with_timestamp(&book_2_session, app.conn(), oldest).await;
	fudge_session_time_with_timestamp(&book_3_session, app.conn(), middle).await;
	fudge_session_time_with_timestamp(&book_4_session, app.conn(), newest).await;

	let ids = fetch_keep_reading_ids(&app).await;
	assert_eq!(
		ids,
		vec![
			book_ids[3].clone(),
			book_ids[2].clone(),
			book_ids[1].clone()
		]
	);
	assert!(!ids.contains(&book_ids[0]));
	assert!(!ids.contains(&book_ids[4]));

	let active_sessions_for_book_4 = reading_session::Entity::find()
		.filter(reading_session::Column::MediaId.eq(&book_ids[3]))
		.filter(reading_session::Column::Status.eq(ReadingStatus::Reading))
		.count(app.conn())
		.await
		.expect("db error");
	assert_eq!(active_sessions_for_book_4, 2);
}

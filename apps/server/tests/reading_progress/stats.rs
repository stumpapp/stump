use models::entity::reading_session;
use sea_orm::{prelude::*, EntityTrait};

use crate::common::{
	book::{
		active_session_for_book, create_nth_readthrough, fudge_session_time,
		update_progress,
	},
	TestApp,
};

use graphql::input::media::{MediaProgressInput, PagedProgressInput};
use tests::fake_data;

async fn setup() -> TestApp {
	let app = TestApp::new_with_default_user().await;
	let db = app.conn();

	let image = fake_data::Library {
		id: Some("image".to_string()),
		name: Some("Image".to_string()),
		..Default::default()
	}
	.insert(db)
	.await;

	let black_science = fake_data::Series {
		id: Some("black_science".to_string()),
		name: Some("Black Science".to_string()),
		library_id: Some(image.id.clone()),
		..Default::default()
	}
	.insert(db)
	.await;

	for i in 1..=5 {
		fake_data::Media {
			series_id: black_science.id.clone(),
			id: Some(format!("black_science_{}", i)),
			name: Some(format!("Black Science #{}", i)),
			created_at: Some("1605-01-16T00:00:00Z".parse().unwrap()),
			pages: Some(100),
			..Default::default()
		}
		.insert(db)
		.await;
	}

	let invincible = fake_data::Series {
		id: Some("invincible".to_string()),
		name: Some("Invincible".to_string()),
		library_id: Some(image.id.clone()),
		..Default::default()
	}
	.insert(db)
	.await;

	for i in 1..=5 {
		fake_data::Media {
			series_id: invincible.id.clone(),
			id: Some(format!("invincible_{}", i)),
			name: Some(format!("Invincible #{}", i)),
			created_at: Some("1605-01-16T00:00:00Z".parse().unwrap()),
			pages: Some(100),
			..Default::default()
		}
		.insert(db)
		.await;
	}

	app
}

// TODO(tests): these don't cover all the bases, but the basic ones. eventually i should probably test:
// - abandoned books in the mix
// - multiple readthroughs of the same book
// - mutliple user sessions of the same book to make sure we don't fuck up user isolation

async fn fetch_series_stats(app: &TestApp, series_id: &str) -> serde_json::Value {
	let result = app
		.execute_gql(
			r#"
        query SeriesStats($id: ID!) {
            seriesById(id: $id) {
                stats {
                    bookCount
                    completedBooks
                    inProgressBooks
                    totalReadingTimeSeconds
                }
            }
        }
        "#,
			Some(serde_json::json!({
				"id": series_id,
			})),
		)
		.await;

	result
		.get("data")
		.and_then(|data| data.get("seriesById"))
		.and_then(|series| series.get("stats"))
		.cloned()
		.expect("expected series stats in GraphQL response")
}

async fn fetch_library_stats(app: &TestApp, library_id: &str) -> serde_json::Value {
	let result = app
		.execute_gql(
			r#"
        query LibraryStats($id: ID!) {
            libraryById(id: $id) {
                stats {
                    bookCount
                    seriesCount
                    completedBooks
                    inProgressBooks
                    totalReadingTimeSeconds
                }
            }
        }
        "#,
			Some(serde_json::json!({
				"id": library_id,
			})),
		)
		.await;

	result
		.get("data")
		.and_then(|data| data.get("libraryById"))
		.and_then(|library| library.get("stats"))
		.cloned()
		.expect("expected library stats in GraphQL response")
}

#[tokio::test]
async fn test_series_stats() {
	let app = setup().await;

	update_progress(
		&app,
		"black_science_1",
		MediaProgressInput::Paged(PagedProgressInput {
			page: 10,
			elapsed_seconds_delta: Some(300),
			..Default::default()
		}),
	)
	.await;

	update_progress(
		&app,
		"black_science_1",
		MediaProgressInput::Paged(PagedProgressInput {
			page: 11,
			elapsed_seconds_delta: Some(300),
			..Default::default()
		}),
	)
	.await; // book 1 should be at 600 secs now

	create_nth_readthrough(&app, "black_science_2", 1).await; // 600 secs

	let stats = fetch_series_stats(&app, "black_science").await;

	assert_eq!(stats["bookCount"], 5);
	assert_eq!(stats["completedBooks"], 1);
	assert_eq!(stats["inProgressBooks"], 1);
	assert_eq!(stats["totalReadingTimeSeconds"], 1200);
}

#[tokio::test]
async fn test_library_stats() {
	let app = setup().await;

	update_progress(
		&app,
		"black_science_1",
		MediaProgressInput::Paged(PagedProgressInput {
			page: 10,
			elapsed_seconds_delta: Some(300),
			..Default::default()
		}),
	)
	.await;

	update_progress(
		&app,
		"black_science_1",
		MediaProgressInput::Paged(PagedProgressInput {
			page: 11,
			elapsed_seconds_delta: Some(300),
			..Default::default()
		}),
	)
	.await; // book 1 should be at 600 secs now

	create_nth_readthrough(&app, "black_science_2", 1).await; // 600 secs

	update_progress(
		&app,
		"invincible_1",
		MediaProgressInput::Paged(PagedProgressInput {
			page: 50,
			elapsed_seconds_delta: Some(1500),
			..Default::default()
		}),
	)
	.await; // invicible book 1 should be at 1500 secs now

	let stats = fetch_library_stats(&app, "image").await;

	assert_eq!(stats["bookCount"], 10);
	assert_eq!(stats["seriesCount"], 2);
	assert_eq!(stats["completedBooks"], 1);
	assert_eq!(stats["inProgressBooks"], 2);
	assert_eq!(stats["totalReadingTimeSeconds"], 2700); // 1200 from black science, 1500 from invincible
}

// if a book has multiple sessions within a (finished) readthrough it should count as completed not in-progress
#[tokio::test]
async fn test_series_stats_historical_reading_not_counted_as_in_progress() {
	let app = setup().await;
	let conn = app.conn();

	// starts the book
	update_progress(
		&app,
		"black_science_1",
		MediaProgressInput::Paged(PagedProgressInput {
			page: 10,
			elapsed_seconds_delta: Some(300),
			..Default::default()
		}),
	)
	.await;

	let reading_session = active_session_for_book(&app, "black_science_1").await;
	fudge_session_time(&reading_session, conn).await;

	// finishes the book in diff session
	update_progress(
		&app,
		"black_science_1",
		MediaProgressInput::Paged(PagedProgressInput {
			page: 100,
			elapsed_seconds_delta: Some(300),
			..Default::default()
		}),
	)
	.await;

	let session_count = reading_session::Entity::find()
		.filter(reading_session::Column::MediaId.eq("black_science_1"))
		.count(conn)
		.await
		.expect("db error");
	assert_eq!(session_count, 2);

	let stats = fetch_series_stats(&app, "black_science").await;

	assert_eq!(stats["bookCount"], 5);
	assert_eq!(stats["completedBooks"], 1);
	assert_eq!(stats["inProgressBooks"], 0); // the crux of the test
	assert_eq!(stats["totalReadingTimeSeconds"], 600);
}

// same as above but at the library level
#[tokio::test]
async fn test_library_stats_historical_reading_not_counted_as_in_progress() {
	let app = setup().await;
	let conn = app.conn();

	// starts the book
	update_progress(
		&app,
		"black_science_1",
		MediaProgressInput::Paged(PagedProgressInput {
			page: 10,
			elapsed_seconds_delta: Some(300),
			..Default::default()
		}),
	)
	.await;

	let reading_session = active_session_for_book(&app, "black_science_1").await;
	fudge_session_time(&reading_session, conn).await;

	// finishes the book in diff session
	update_progress(
		&app,
		"black_science_1",
		MediaProgressInput::Paged(PagedProgressInput {
			page: 100,
			elapsed_seconds_delta: Some(300),
			..Default::default()
		}),
	)
	.await;

	// starts another book
	update_progress(
		&app,
		"invincible_1",
		MediaProgressInput::Paged(PagedProgressInput {
			page: 50,
			elapsed_seconds_delta: Some(1500),
			..Default::default()
		}),
	)
	.await;

	let stats = fetch_library_stats(&app, "image").await;

	assert_eq!(stats["bookCount"], 10);
	assert_eq!(stats["seriesCount"], 2);
	assert_eq!(stats["completedBooks"], 1);
	assert_eq!(stats["inProgressBooks"], 1); // the crux of the test
	assert_eq!(stats["totalReadingTimeSeconds"], 2100);
}

// a book already finished but actively being read should report in both completed and in-progress
// states
#[tokio::test]
async fn test_series_stats_second_readthrough() {
	let app = setup().await;

	create_nth_readthrough(&app, "black_science_1", 1).await;

	// start re-reading
	update_progress(
		&app,
		"black_science_1",
		MediaProgressInput::Paged(PagedProgressInput {
			page: 10,
			elapsed_seconds_delta: Some(300),
			..Default::default()
		}),
	)
	.await;

	let stats = fetch_series_stats(&app, "black_science").await;

	assert_eq!(stats["bookCount"], 5);
	assert_eq!(stats["completedBooks"], 1); // crux 1 of test
	assert_eq!(stats["inProgressBooks"], 1); // crux 2 of test
	assert_eq!(stats["totalReadingTimeSeconds"], 900);
}

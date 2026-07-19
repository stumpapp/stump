use crate::common::{
	book::{create_nth_readthrough, fudge_session_time, update_progress},
	series::setup_single_series_with_n_books,
	TestApp,
};

use graphql::input::media::{MediaProgressInput, PagedProgressInput};
use models::{entity::reading_session, shared::enums::ReadingStatus};
use sea_orm::{prelude::*, QueryOrder};
use tests::fake_data;

async fn setup() -> TestApp {
	let app = TestApp::new_with_default_user().await;

	let _ = setup_single_series_with_n_books(
		&app,
		fake_data::Series {
			id: Some("black_science".to_string()),
			name: Some("Black Science".to_string()),
			..Default::default()
		},
		5,
	)
	.await;

	app
}

async fn delete_reading_history(app: &TestApp, book_id: &str) {
	let result = app
		.execute_gql(
			r#"
        mutation DeleteMediaReadingHistory($id: String!) {
            deleteMediaReadingHistory(id: $id)
        }
        "#,
			Some(serde_json::json!({
				"id": book_id,
			})),
		)
		.await;
	assert!(result.get("data").is_some_and(|data| !data.is_null())); // i.e. it worked
}

async fn clear_book_progress(app: &TestApp, book_id: &str) {
	let result = app
		.execute_gql(
			r#"
        mutation ClearBookProgress($id: String!) {
            clearMediaProgress(id: $id)
        }
        "#,
			Some(serde_json::json!({
				"id": book_id,
			})),
		)
		.await;
	assert!(result.get("data").is_some_and(|data| !data.is_null())); // i.e. it worked
}

async fn finish_book_progress(app: &TestApp, book_id: &str, dnf: bool) {
	let result = app
		.execute_gql(
			r#"
        mutation FinishBook($id: String!, $dnf: Boolean!) {
            finishMediaProgress(id: $id, dnf: $dnf)
        }
        "#,
			Some(serde_json::json!({
				"id": book_id,
				"dnf": dnf,
			})),
		)
		.await;
	assert!(result.get("data").is_some_and(|data| !data.is_null())); // i.e. it worked
}

async fn clear_series_reading_history(app: &TestApp, series_id: &str) -> i64 {
	let result = app
		.execute_gql(
			r#"
        mutation ClearSeriesReadingHistory($id: String!) {
            clearSeriesReadingHistory(id: $id)
        }
        "#,
			Some(serde_json::json!({
				"id": series_id,
			})),
		)
		.await;

	let deleted = result
		.get("data")
		.and_then(|data| data.get("clearSeriesReadingHistory"))
		.and_then(|value| value.as_i64())
		.expect("expected a number");

	deleted
}

async fn finish_series_progress(app: &TestApp, series_id: &str) -> i64 {
	let result = app
		.execute_gql(
			r#"
        mutation FinishSeriesProgress($id: String!) {
            finishSeriesProgress(id: $id)
        }
        "#,
			Some(serde_json::json!({
				"id": series_id,
			})),
		)
		.await;

	let changed = result
		.get("data")
		.and_then(|data| data.get("finishSeriesProgress"))
		.and_then(|value| value.as_i64())
		.expect("expected finishSeriesProgress to return a number");

	changed
}

/// a bit of an all-in-one test:
/// - book 1 already complete, should be left alone
/// - book 2 active but within grace period, should be finalized in place
/// - book 3 active but elapsed, should be finalized with a new session to preserve timeline
/// - book 4 already complete, should be left alone
/// - book 5 no sessions, should be marked as complete with a new session
#[tokio::test]
async fn test_finish_series_progress() {
	let app = setup().await;
	let conn = app.conn();

	// book 1 already finished
	create_nth_readthrough(&app, "black_science_1", 1).await;

	// book 2 active but within grace
	update_progress(
		&app,
		"black_science_2",
		MediaProgressInput::Paged(PagedProgressInput {
			page: 50,
			elapsed_seconds_delta: Some(300),
			..Default::default()
		}),
	)
	.await;

	// book 3 active but elapsed, so new session
	update_progress(
		&app,
		"black_science_3",
		MediaProgressInput::Paged(PagedProgressInput {
			page: 40,
			elapsed_seconds_delta: Some(300),
			..Default::default()
		}),
	)
	.await;

	let elapsed_session = reading_session::Entity::find()
		.filter(reading_session::Column::MediaId.eq("black_science_3"))
		.filter(reading_session::Column::Status.eq(ReadingStatus::Reading))
		.one(conn)
		.await
		.expect("db error")
		.expect("session should exist");
	fudge_session_time(&elapsed_session, conn).await;

	let changed = finish_series_progress(&app, "black_science").await;
	assert_eq!(changed, 4);

	let ids = (1..=5)
		.map(|pos| format!("black_science_{}", pos))
		.collect::<Vec<_>>();
	let finished_sessions = reading_session::Entity::find()
		.filter(reading_session::Column::MediaId.is_in(ids.clone()))
		.filter(reading_session::Column::Status.eq(ReadingStatus::Finished))
		.all(conn)
		.await
		.expect("db error");
	assert_eq!(finished_sessions.len(), 5); // 1 for each book

	let total_sessions = reading_session::Entity::find()
		.filter(reading_session::Column::MediaId.is_in(ids))
		.all(conn)
		.await
		.expect("db error");
	assert_eq!(total_sessions.len(), 6); // 1 for each + the extra for book 3
}

/// another kinda all-in-one test:
/// - books 1 and 4 have only finalized sessions, should be fully cleared
/// - book 2 has finalized + active session, active one being left alone
/// - book 3 has only an active session, so left alone
/// - book 5 has no sessions, should remain unaffected
#[tokio::test]
async fn test_clear_series_reading_history() {
	let app = setup().await;
	let conn = app.conn();

	// full readthroughs for books 1 and 4
	create_nth_readthrough(&app, "black_science_1", 1).await;
	create_nth_readthrough(&app, "black_science_4", 1).await;

	// full readthrough + active for book 2
	create_nth_readthrough(&app, "black_science_2", 1).await;
	update_progress(
		&app,
		"black_science_2",
		MediaProgressInput::Paged(PagedProgressInput {
			page: 20,
			elapsed_seconds_delta: Some(300),
			..Default::default()
		}),
	)
	.await;

	// active for book 3
	update_progress(
		&app,
		"black_science_3",
		MediaProgressInput::Paged(PagedProgressInput {
			page: 30,
			elapsed_seconds_delta: Some(300),
			..Default::default()
		}),
	)
	.await;

	let deleted = clear_series_reading_history(&app, "black_science").await;
	assert_eq!(deleted, 3);

	// should be a total of 2 sessions (book 2 active and book 3 active)
	let ids = (1..=5)
		.map(|pos| format!("black_science_{}", pos))
		.collect::<Vec<_>>();
	let total_sessions = reading_session::Entity::find()
		.filter(reading_session::Column::MediaId.is_in(ids))
		.all(conn)
		.await
		.expect("db error");
	assert_eq!(total_sessions.len(), 2);

	// each session should be active
	assert!(total_sessions
		.iter()
		.all(|session| session.status == ReadingStatus::Reading));
}

#[tokio::test]
async fn test_clear_media_progress() {
	let app = setup().await;

	create_nth_readthrough(&app, "black_science_1", 1).await;

	update_progress(
		&app,
		"black_science_1",
		MediaProgressInput::Paged(PagedProgressInput {
			page: 50,
			elapsed_seconds_delta: Some(300),
			..Default::default()
		}),
	)
	.await;

	// so we should have:
	// - one completed session
	// - one in-progress session

	clear_book_progress(&app, "black_science_1").await;

	// now the in-progress session should be gone but the completed one should still be there
	let in_progress_session_exists = reading_session::Entity::find()
		.filter(reading_session::Column::MediaId.eq("black_science_1"))
		.filter(reading_session::Column::Status.ne(ReadingStatus::Finished))
		.one(app.conn())
		.await
		.expect("db error")
		.is_some();
	assert!(!in_progress_session_exists);

	let completed_session_exists = reading_session::Entity::find()
		.filter(reading_session::Column::MediaId.eq("black_science_1"))
		.filter(reading_session::Column::Status.eq(ReadingStatus::Finished))
		.one(app.conn())
		.await
		.expect("db error")
		.is_some();
	assert!(completed_session_exists);
}

#[tokio::test]
async fn test_mark_unread_book_as_finished() {
	let app = setup().await;

	finish_book_progress(&app, "black_science_1", false).await;

	let session = reading_session::Entity::find()
		.filter(reading_session::Column::MediaId.eq("black_science_1"))
		.filter(reading_session::Column::Status.eq(ReadingStatus::Finished))
		.one(app.conn())
		.await
		.expect("db error")
		.expect("session should exist");

	assert_eq!(session.readthrough_number, 1);
	assert_eq!(session.end_percentage, Some(Decimal::new(1, 0)));
	assert_eq!(session.status, ReadingStatus::Finished);
}

#[tokio::test]
async fn test_mark_unread_book_as_abandonded() {
	let app = setup().await;

	finish_book_progress(&app, "black_science_1", true).await;

	let session = reading_session::Entity::find()
		.filter(reading_session::Column::MediaId.eq("black_science_1"))
		.filter(reading_session::Column::Status.eq(ReadingStatus::Abandoned))
		.one(app.conn())
		.await
		.expect("db error")
		.expect("session should exist");

	assert_eq!(session.readthrough_number, 1);
	assert!(session.end_percentage.is_none()); // no active session to derive these things
	assert_eq!(session.status, ReadingStatus::Abandoned);
}

#[tokio::test]
async fn test_mark_incomplete_book_as_finished() {
	let app = setup().await;

	// start the session
	update_progress(
		&app,
		"black_science_1",
		MediaProgressInput::Paged(PagedProgressInput {
			page: 50,
			elapsed_seconds_delta: Some(300),
			..Default::default()
		}),
	)
	.await;

	finish_book_progress(&app, "black_science_1", false).await;

	let session = reading_session::Entity::find()
		.filter(reading_session::Column::MediaId.eq("black_science_1"))
		.filter(reading_session::Column::Status.eq(ReadingStatus::Finished))
		.one(app.conn())
		.await
		.expect("db error")
		.expect("session should exist");

	assert_eq!(session.end_percentage, Some(Decimal::new(1, 0)));
	assert_eq!(session.status, ReadingStatus::Finished);
}

#[tokio::test]
async fn test_mark_incomplete_book_as_abandonded() {
	let app = setup().await;

	// start the session
	update_progress(
		&app,
		"black_science_1",
		MediaProgressInput::Paged(PagedProgressInput {
			page: 50,
			elapsed_seconds_delta: Some(300),
			..Default::default()
		}),
	)
	.await;

	finish_book_progress(&app, "black_science_1", true).await;

	let session = reading_session::Entity::find()
		.filter(reading_session::Column::MediaId.eq("black_science_1"))
		.filter(reading_session::Column::Status.eq(ReadingStatus::Abandoned))
		.one(app.conn())
		.await
		.expect("db error")
		.expect("session should exist");

	assert_eq!(session.end_percentage, Some(Decimal::new(5, 1)));
	assert_eq!(session.status, ReadingStatus::Abandoned);
}

#[tokio::test]
async fn test_mark_incomplete_book_as_finished_and_preserve_sacred_timeline() {
	let app = setup().await;
	let conn = app.conn();

	// start the session
	update_progress(
		&app,
		"black_science_1",
		MediaProgressInput::Paged(PagedProgressInput {
			page: 50,
			elapsed_seconds_delta: Some(300),
			..Default::default()
		}),
	)
	.await;

	let session = reading_session::Entity::find()
		.filter(reading_session::Column::MediaId.eq("black_science_1"))
		.filter(reading_session::Column::Status.eq(ReadingStatus::Reading))
		.one(app.conn())
		.await
		.expect("db error")
		.expect("session should exist");
	// we fudge the time here so that it elapsed and making as finished will create a new session
	// instead of updating the old one
	fudge_session_time(&session, conn).await;

	finish_book_progress(&app, "black_science_1", false).await;

	// there should now be 2 sessions
	let sessions_count = reading_session::Entity::find()
		.filter(reading_session::Column::MediaId.eq("black_science_1"))
		.count(conn)
		.await
		.expect("db error");
	assert_eq!(sessions_count, 2);

	// the old session should still be in reading status, and the new one should be finished
	let old_session_exists = reading_session::Entity::find()
		.filter(reading_session::Column::MediaId.eq("black_science_1"))
		.filter(reading_session::Column::Status.eq(ReadingStatus::Reading))
		.one(conn)
		.await
		.expect("db error")
		.is_some();
	assert!(old_session_exists);

	let new_session_exists = reading_session::Entity::find()
		.filter(reading_session::Column::MediaId.eq("black_science_1"))
		.filter(reading_session::Column::Status.eq(ReadingStatus::Finished))
		.one(conn)
		.await
		.expect("db error")
		.is_some();
	assert!(new_session_exists);
}

#[tokio::test]
async fn test_clear_media_reading_history() {
	let app = setup().await;

	let conn = app.conn();

	create_nth_readthrough(&app, "black_science_1", 1).await;

	delete_reading_history(&app, "black_science_1").await;

	// all sessions for readthrough should be gone
	let session_exists = reading_session::Entity::find()
		.filter(reading_session::Column::MediaId.eq("black_science_1"))
		.one(conn)
		.await
		.expect("db error")
		.is_some();
	assert!(!session_exists);
}

#[tokio::test]
async fn test_clear_media_reading_history_retains_current() {
	let app = setup().await;

	let conn = app.conn();

	create_nth_readthrough(&app, "black_science_1", 1).await;

	// start a new session, which should create a new readthrough since the previous session is finished
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

	// max readthrough should be 2 now
	let max_readthrough = reading_session::Entity::find()
		.filter(reading_session::Column::MediaId.eq("black_science_1"))
		.order_by_desc(reading_session::Column::ReadthroughNumber)
		.one(conn)
		.await
		.expect("db error")
		.expect("should be at least one session")
		.readthrough_number;
	assert_eq!(max_readthrough, 2);

	// should be 2 sessions: initial that turned to completion, and the new in-progress one
	let session_count = reading_session::Entity::find()
		.filter(reading_session::Column::MediaId.eq("black_science_1"))
		.count(conn)
		.await
		.expect("db error");
	assert_eq!(session_count, 2);

	// when we clear now, it should only clear the completed session and not the in-progress one
	delete_reading_history(&app, "black_science_1").await;

	let finished_sessions_exist = reading_session::Entity::find()
		.filter(reading_session::Column::MediaId.eq("black_science_1"))
		.filter(reading_session::Column::Status.eq(ReadingStatus::Finished))
		.one(conn)
		.await
		.expect("db error")
		.is_some();
	assert!(!finished_sessions_exist);

	let in_progress_sessions_exist = reading_session::Entity::find()
		.filter(reading_session::Column::MediaId.eq("black_science_1"))
		.filter(reading_session::Column::Status.ne(ReadingStatus::Finished))
		.one(conn)
		.await
		.expect("db error")
		.is_some();
	assert!(in_progress_sessions_exist);
}

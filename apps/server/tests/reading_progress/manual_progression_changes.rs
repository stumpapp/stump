use crate::common::{
	book::{fudge_session_time, update_progress},
	TestApp,
};

use graphql::input::media::{MediaProgressInput, PagedProgressInput};
use models::{entity::reading_session_v2, shared::enums::ReadingStatus};
use sea_orm::{prelude::*, QueryOrder};
use tests::fake_data;

async fn setup() -> TestApp {
	let app = TestApp::new_with_default_user().await;
	let db = app.conn();

	let black_science = fake_data::Series {
		name: Some("Black Science".to_string()),
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

	app
}

/// this will create a completed readthrough and then fudge the timestamp to be old enough that
/// a follow-up session can be created
async fn prepare_secondary_readthrough(app: &TestApp, book_id: &str) {
	let conn = app.conn();

	// start the session
	update_progress(
		&app,
		book_id,
		MediaProgressInput::Paged(PagedProgressInput {
			page: 10,
			elapsed_seconds_delta: Some(300),
			..Default::default()
		}),
	)
	.await;

	// flip to last page
	update_progress(
		&app,
		book_id,
		MediaProgressInput::Paged(PagedProgressInput {
			page: 100,
			elapsed_seconds_delta: Some(300),
			..Default::default()
		}),
	)
	.await;

	let session = reading_session_v2::Entity::find()
		.filter(reading_session_v2::Column::MediaId.eq(book_id))
		.filter(reading_session_v2::Column::Status.eq(ReadingStatus::Finished))
		.one(conn)
		.await
		.expect("db error")
		.expect("session should exist");
	fudge_session_time(&session, conn).await;
}

async fn clear_reading_history(app: &TestApp, book_id: &str) {
	let result = app
		.execute_gql(
			r#"
        mutation ClearMediaReadingHistory($id: String!) {
            clearMediaReadingHistory(id: $id)
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

// TODO(v2-sessions): add these once i refactor them in server:
// - clear_series_reading_history
// - finish_series_progress

// #[tokio::test]
// async fn test_mark_unread_series_as_complete() {}

// #[tokio::test]
// async fn test_mark_incomplete_series_as_complete() {}

// #[tokio::test]
// async fn test_mark_complete_series_as_incomplete() {}

#[tokio::test]
async fn test_clear_media_progress() {
	let app = setup().await;

	prepare_secondary_readthrough(&app, "black_science_1").await;

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
	let in_progress_session_exists = reading_session_v2::Entity::find()
		.filter(reading_session_v2::Column::MediaId.eq("black_science_1"))
		.filter(reading_session_v2::Column::Status.ne(ReadingStatus::Finished))
		.one(app.conn())
		.await
		.expect("db error")
		.is_some();
	assert!(!in_progress_session_exists);

	let completed_session_exists = reading_session_v2::Entity::find()
		.filter(reading_session_v2::Column::MediaId.eq("black_science_1"))
		.filter(reading_session_v2::Column::Status.eq(ReadingStatus::Finished))
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

	let session = reading_session_v2::Entity::find()
		.filter(reading_session_v2::Column::MediaId.eq("black_science_1"))
		.filter(reading_session_v2::Column::Status.eq(ReadingStatus::Finished))
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

	let session = reading_session_v2::Entity::find()
		.filter(reading_session_v2::Column::MediaId.eq("black_science_1"))
		.filter(reading_session_v2::Column::Status.eq(ReadingStatus::Abandoned))
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

	let session = reading_session_v2::Entity::find()
		.filter(reading_session_v2::Column::MediaId.eq("black_science_1"))
		.filter(reading_session_v2::Column::Status.eq(ReadingStatus::Finished))
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

	let session = reading_session_v2::Entity::find()
		.filter(reading_session_v2::Column::MediaId.eq("black_science_1"))
		.filter(reading_session_v2::Column::Status.eq(ReadingStatus::Abandoned))
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

	let session = reading_session_v2::Entity::find()
		.filter(reading_session_v2::Column::MediaId.eq("black_science_1"))
		.filter(reading_session_v2::Column::Status.eq(ReadingStatus::Reading))
		.one(app.conn())
		.await
		.expect("db error")
		.expect("session should exist");
	// we fudge the time here so that it elapsed and making as finished will create a new session
	// instead of updating the old one
	fudge_session_time(&session, conn).await;

	finish_book_progress(&app, "black_science_1", false).await;

	// there should now be 2 sessions
	let sessions_count = reading_session_v2::Entity::find()
		.filter(reading_session_v2::Column::MediaId.eq("black_science_1"))
		.count(conn)
		.await
		.expect("db error");
	assert_eq!(sessions_count, 2);

	// the old session should still be in reading status, and the new one should be finished
	let old_session_exists = reading_session_v2::Entity::find()
		.filter(reading_session_v2::Column::MediaId.eq("black_science_1"))
		.filter(reading_session_v2::Column::Status.eq(ReadingStatus::Reading))
		.one(conn)
		.await
		.expect("db error")
		.is_some();
	assert!(old_session_exists);

	let new_session_exists = reading_session_v2::Entity::find()
		.filter(reading_session_v2::Column::MediaId.eq("black_science_1"))
		.filter(reading_session_v2::Column::Status.eq(ReadingStatus::Finished))
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

	prepare_secondary_readthrough(&app, "black_science_1").await;

	clear_reading_history(&app, "black_science_1").await;

	// all sessions for readthrough should be gone
	let session_exists = reading_session_v2::Entity::find()
		.filter(reading_session_v2::Column::MediaId.eq("black_science_1"))
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

	prepare_secondary_readthrough(&app, "black_science_1").await;

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
	let max_readthrough = reading_session_v2::Entity::find()
		.filter(reading_session_v2::Column::MediaId.eq("black_science_1"))
		.order_by_desc(reading_session_v2::Column::ReadthroughNumber)
		.one(conn)
		.await
		.expect("db error")
		.expect("should be at least one session")
		.readthrough_number;
	assert_eq!(max_readthrough, 2);

	// should be 2 sessions: initial that turned to completion, and the new in-progress one
	let session_count = reading_session_v2::Entity::find()
		.filter(reading_session_v2::Column::MediaId.eq("black_science_1"))
		.count(conn)
		.await
		.expect("db error");
	assert_eq!(session_count, 2);

	// when we clear now, it should only clear the completed session and not the in-progress one
	clear_reading_history(&app, "black_science_1").await;

	let finished_sessions_exist = reading_session_v2::Entity::find()
		.filter(reading_session_v2::Column::MediaId.eq("black_science_1"))
		.filter(reading_session_v2::Column::Status.eq(ReadingStatus::Finished))
		.one(conn)
		.await
		.expect("db error")
		.is_some();
	assert!(!finished_sessions_exist);

	let in_progress_sessions_exist = reading_session_v2::Entity::find()
		.filter(reading_session_v2::Column::MediaId.eq("black_science_1"))
		.filter(reading_session_v2::Column::Status.ne(ReadingStatus::Finished))
		.one(conn)
		.await
		.expect("db error")
		.is_some();
	assert!(in_progress_sessions_exist);
}

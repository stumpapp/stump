use crate::common::{
	book::{
		active_session_for_book, create_nth_readthrough, fudge_session_time,
		update_progress,
	},
	series::setup_single_series_with_n_books,
	TestApp,
};

use async_graphql::InputType;
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

async fn accept_local_progress(
	app: &TestApp,
	book_id: &str,
	ancestor_session_id: i32,
	input: MediaProgressInput,
) {
	let json_input = input
		.to_value()
		.into_json()
		.expect("failed to convert input to json");
	let result = app
        .execute_gql(
            r#"
            mutation AcceptLocalProgress($id: ID!, $ancestorSessionId: Int!, $input: MediaProgressInput!) {
                acceptLocalProgress(id: $id, ancestorSessionId: $ancestorSessionId, input: $input) {
                    id
                }
            }
            "#,
            Some(serde_json::json!({
                "id": book_id,
                "ancestorSessionId": ancestor_session_id,
                "input": json_input,
            })),
        )
        .await;
	assert!(result.get("data").is_some_and(|d| !d.is_null()));
}

#[tokio::test]
async fn test_accept_local_progress_splices_history_from_ancestor() {
	let app = setup().await;

	let conn = app.conn();

	// shove session before the ancestor session for completeness in tests
	// really, not strictly required but a likely scenario
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
	let pre_ancestor_session = active_session_for_book(&app, "black_science_1").await;
	fudge_session_time(&pre_ancestor_session, conn).await;

	// this is the ancestor session
	update_progress(
		&app,
		"black_science_1",
		MediaProgressInput::Paged(PagedProgressInput {
			page: 20,
			elapsed_seconds_delta: Some(300),
			..Default::default()
		}),
	)
	.await;
	let ancestor = active_session_for_book(&app, "black_science_1").await;
	fudge_session_time(&ancestor, conn).await;

	// the next two are conflicting remote sessions that we want to remove in favor
	// of the lcoal progress
	update_progress(
		&app,
		"black_science_1",
		MediaProgressInput::Paged(PagedProgressInput {
			page: 30,
			elapsed_seconds_delta: Some(300),
			..Default::default()
		}),
	)
	.await;
	let conflicting_session_1 = active_session_for_book(&app, "black_science_1").await;
	fudge_session_time(&conflicting_session_1, conn).await;

	update_progress(
		&app,
		"black_science_1",
		MediaProgressInput::Paged(PagedProgressInput {
			page: 40,
			elapsed_seconds_delta: Some(300),
			..Default::default()
		}),
	)
	.await;
	let conflicting_session_2 = active_session_for_book(&app, "black_science_1").await;

	let remote_count = reading_session::Entity::find()
		.filter(reading_session::Column::MediaId.eq("black_science_1"))
		.count(conn)
		.await
		.expect("db error");
	assert_eq!(remote_count, 4);

	accept_local_progress(
		&app,
		"black_science_1",
		ancestor.id,
		MediaProgressInput::Paged(PagedProgressInput {
			page: 25,
			elapsed_seconds_delta: Some(600),
			..Default::default()
		}),
	)
	.await;

	let remote_sessions = reading_session::Entity::find()
		.filter(reading_session::Column::MediaId.eq("black_science_1"))
		.order_by_asc(reading_session::Column::CreatedAt)
		.all(conn)
		.await
		.expect("db error");
	assert_eq!(remote_sessions.len(), 3); // pre-ancestor, ancestor, and new local progress

	let og_conflicting_ids = vec![conflicting_session_1.id, conflicting_session_2.id];
	assert!(remote_sessions
		.iter()
		.all(|session| !og_conflicting_ids.contains(&session.id)));

	let ancestor_after = remote_sessions
		.iter()
		.find(|s| s.id == ancestor.id)
		.expect("ancestor should still exist");
	assert_eq!(ancestor_after.end_page, Some(20));

	let local_now_remote_session = remote_sessions
		.iter()
		.last()
		.expect("should be a new session");
	assert_eq!(local_now_remote_session.end_page, Some(25));
}

#[tokio::test]
async fn test_accept_local_progress_with_no_conflicts() {
	let app = setup().await;

	let conn = app.conn();

	// pre-ancestor, 5 min
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
	let pre_ancestor_session = active_session_for_book(&app, "black_science_1").await;
	fudge_session_time(&pre_ancestor_session, conn).await;

	// the ancestor, 10 min
	update_progress(
		&app,
		"black_science_1",
		MediaProgressInput::Paged(PagedProgressInput {
			page: 20,
			elapsed_seconds_delta: Some(600),
			..Default::default()
		}),
	)
	.await;
	let ancestor = active_session_for_book(&app, "black_science_1").await;
	fudge_session_time(&ancestor, conn).await;

	// post-ancestor, 5 min (but will be removed)
	update_progress(
		&app,
		"black_science_1",
		MediaProgressInput::Paged(PagedProgressInput {
			page: 30,
			elapsed_seconds_delta: Some(300),
			..Default::default()
		}),
	)
	.await;
	let conflicting_remote_session =
		active_session_for_book(&app, "black_science_1").await;
	fudge_session_time(&conflicting_remote_session, conn).await;

	accept_local_progress(
		&app,
		"black_science_1",
		ancestor.id,
		MediaProgressInput::Paged(PagedProgressInput {
			page: 25,
			elapsed_seconds_delta: Some(120),
			reset_elapsed_seconds: Some(true),
			..Default::default()
		}),
	)
	.await;

	let remote_sessions = reading_session::Entity::find()
		.filter(reading_session::Column::MediaId.eq("black_science_1"))
		.order_by_asc(reading_session::Column::CreatedAt)
		.all(conn)
		.await
		.expect("db error");
	assert_eq!(remote_sessions.len(), 3); // pre-ancestor, ancestor, and new local progress

	assert!(!remote_sessions
		.iter()
		.any(|s| s.id == conflicting_remote_session.id)); // it was replaced iwth local

	let local_now_remote_session = remote_sessions
		.iter()
		.last()
		.expect("should be new session");
	assert_eq!(local_now_remote_session.elapsed_seconds, Some(120));

	// no sessions besides new local should have elapsed time
	assert!(remote_sessions
		.iter()
		.filter(|s| s.id != local_now_remote_session.id)
		.all(|s| s.elapsed_seconds == Some(0)));
}

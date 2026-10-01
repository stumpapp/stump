use crate::common::{
	book::{
		create_nth_readthrough, fudge_session_time_with_timestamp,
		latest_finished_session_for_book,
	},
	series::setup_single_series_with_n_books,
	TestApp,
};

use chrono::{DateTime, Duration, Utc};
use tests::fake_data;

// NOTE: there is a lot of overlap btw here and super::on_deck::dropped_exclusions, but the focus here is on userSeriesState and not
// the on deck implications of the same mutations

async fn drop_series(app: &TestApp, series_id: &str) {
	let result = app
		.execute_gql(
			r#"mutation Drop($id: ID!) { dropSeries(id: $id) { droppedAt } }"#,
			Some(serde_json::json!({ "id": series_id })),
		)
		.await;
	assert!(
		result.get("data").is_some_and(|d| !d.is_null()),
		"dropSeries mutation failed: {result:#}"
	);
}

async fn stop_series_reread(app: &TestApp, series_id: &str) {
	let result = app
		.execute_gql(
			r#"mutation Stop($id: ID!) { stopSeriesReread(id: $id) { stoppedReadthroughAt } }"#,
			Some(serde_json::json!({ "id": series_id })),
		)
		.await;
	assert!(
		result.get("data").is_some_and(|d| !d.is_null()),
		"stopSeriesReread mutation failed: {result:#}"
	);
}

async fn series_reading_state(app: &TestApp, series_id: &str) -> serde_json::Value {
	let result = app
		.execute_gql(
			r#"
            query SeriesReadingState($id: ID!) {
                seriesById(id: $id) {
                    lastReadAt
                    currentReadthrough
                    userSeriesState {
                        droppedAt
                        stoppedReadthroughAt
                    }
                }
            }
            "#,
			Some(serde_json::json!({ "id": series_id })),
		)
		.await;

	result
		.get("data")
		.and_then(|d| d.get("seriesById"))
		.cloned()
		.expect("expected seriesById in response")
}

async fn setup() -> (TestApp, String) {
	let app = TestApp::new_with_default_user().await;

	let lib = fake_data::Library::default().insert(app.conn()).await;

	let (series, _) = setup_single_series_with_n_books(
		&app,
		fake_data::Series {
			id: Some("black_science".to_string()),
			name: Some("Black Science".to_string()),
			library_id: Some(lib.id),
			..Default::default()
		},
		3,
	)
	.await;

	(app, series.id)
}

/// no sessions and no state = all null, a bit of a sanity check really
#[tokio::test]
async fn test_reading_state_null_with_no_activity() {
	let (app, series_id) = setup().await;
	let state = series_reading_state(&app, &series_id).await;
	assert!(state["lastReadAt"].is_null());
	assert!(state["currentReadthrough"].is_null());
	assert!(state["userSeriesState"].is_null());
}

/// lastReadAt should be the most recent session across all books in the series
#[tokio::test]
async fn test_last_read_at_is_max_across_series() {
	let (app, series_id) = setup().await;

	create_nth_readthrough(&app, "black_science_1", 1).await;
	create_nth_readthrough(&app, "black_science_2", 1).await;

	let now = Utc::now();

	let older_session = latest_finished_session_for_book(&app, "black_science_1").await;
	fudge_session_time_with_timestamp(
		&older_session,
		app.conn(),
		now - Duration::hours(2),
	)
	.await;

	let newer_session = latest_finished_session_for_book(&app, "black_science_2").await;
	fudge_session_time_with_timestamp(
		&newer_session,
		app.conn(),
		now - Duration::hours(1),
	)
	.await;

	let state = series_reading_state(&app, &series_id).await;
	let last_read_at: DateTime<Utc> = state["lastReadAt"]
		.as_str()
		.expect("lastReadAt should be set")
		.parse()
		.expect("valid timestamp");

	// should be closer to 1h ago (newer_session) than to 2h ago (older_session)
	let diff_newer = (last_read_at - (now - Duration::hours(1)))
		.num_seconds()
		.abs();
	let diff_older = (last_read_at - (now - Duration::hours(2)))
		.num_seconds()
		.abs();
	assert!(
		diff_newer < diff_older,
		"lastReadAt should be the most recent session"
	);
}

/// currentReadthrough should be the max readthrough across all books in the series
#[tokio::test]
async fn test_current_readthrough_is_max_across_series() {
	let (app, series_id) = setup().await;

	create_nth_readthrough(&app, "black_science_1", 2).await; // readthrough 2
	create_nth_readthrough(&app, "black_science_2", 1).await; // readthrough 1

	let state = series_reading_state(&app, &series_id).await;
	assert_eq!(state["currentReadthrough"], 2);
}

/// dropSeries should set droppedAt on userSeriesState, a bit of a sanity check really
#[tokio::test]
async fn test_drop_series_sets_state() {
	let (app, series_id) = setup().await;

	drop_series(&app, &series_id).await;

	let state = series_reading_state(&app, &series_id).await;
	assert!(!state["userSeriesState"]["droppedAt"].is_null());
	assert!(state["userSeriesState"]["stoppedReadthroughAt"].is_null());
}

/// stopSeriesReread should set stoppedReadthroughAt on userSeriesState, a bit of a sanity check really
#[tokio::test]
async fn test_stop_reread_sets_state() {
	let (app, series_id) = setup().await;

	create_nth_readthrough(&app, "black_science_1", 1).await;

	stop_series_reread(&app, &series_id).await;

	let state = series_reading_state(&app, &series_id).await;
	assert!(!state["userSeriesState"]["stoppedReadthroughAt"].is_null());
	assert!(state["userSeriesState"]["droppedAt"].is_null());
}

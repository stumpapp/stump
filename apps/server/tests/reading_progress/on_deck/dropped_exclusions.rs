use crate::common::{
	book::create_nth_readthrough, series::setup_single_series_with_n_books, TestApp,
};

use tests::fake_data;

async fn setup(books: i32) -> (TestApp, String) {
	let app = TestApp::new_with_default_user().await;

	let image = fake_data::Library {
		id: Some("image".to_string()),
		name: Some("Image".to_string()),
		..Default::default()
	}
	.insert(app.conn())
	.await;

	let (series, _) = setup_single_series_with_n_books(
		&app,
		fake_data::Series {
			id: Some("black_science".to_string()),
			name: Some("Black Science".to_string()),
			library_id: Some(image.id.clone()),
			..Default::default()
		},
		books,
	)
	.await;

	(app, series.id)
}

async fn fetch_on_deck_ids(app: &TestApp) -> Vec<String> {
	let result = app
		.execute_gql(
			r#"
			query OnDeck {
				onDeck {
					nodes { id }
				}
			}
			"#,
			None,
		)
		.await;

	result
		.get("data")
		.and_then(|d| d.get("onDeck"))
		.and_then(|o| o.get("nodes"))
		.and_then(|n| n.as_array())
		.expect("where nodes at")
		.iter()
		.map(|n| {
			n.get("id")
				.and_then(|v| v.as_str())
				.expect("node id")
				.to_string()
		})
		.collect()
}

async fn execute_series_mutation(app: &TestApp, mutation: &str, series_id: &str) {
	let result = app
		.execute_gql(mutation, Some(serde_json::json!({ "id": series_id })))
		.await;
	assert!(
		result.get("data").is_some_and(|d| !d.is_null()),
		"mutation failed: {result:#}"
	);
}

async fn drop_series(app: &TestApp, series_id: &str) {
	execute_series_mutation(
		app,
		r#"mutation Drop($id: ID!) { dropSeries(id: $id) { droppedAt } }"#,
		series_id,
	)
	.await;
}

async fn undrop_series(app: &TestApp, series_id: &str) {
	execute_series_mutation(
		app,
		r#"mutation Undrop($id: ID!) { undropSeries(id: $id) { droppedAt } }"#,
		series_id,
	)
	.await;
}

async fn stop_reread(app: &TestApp, series_id: &str) {
	execute_series_mutation(
		app,
		r#"mutation Stop($id: ID!) { stopSeriesReread(id: $id) { droppedAt } }"#,
		series_id,
	)
	.await;
}

async fn resume_reread(app: &TestApp, series_id: &str) {
	execute_series_mutation(
		app,
		r#"mutation Resume($id: ID!) { resumeSeriesReread(id: $id) { droppedAt } }"#,
		series_id,
	)
	.await;
}

/// read book 5 of 10 -> on deck should be book 6
#[tokio::test]
async fn test_skipped_books_show_next_after_highest_position() {
	let (app, _) = setup(10).await;

	create_nth_readthrough(&app, "black_science_5", 1).await;

	let ids = fetch_on_deck_ids(&app).await;
	assert_eq!(ids.len(), 1);
	assert_eq!(ids[0], "black_science_6");
}

/// finish books 1-3, then re-read book 1 -> on deck should show book 2
#[tokio::test]
async fn test_reread_shows_next_in_reread() {
	let (app, _) = setup(5).await;

	for i in 1..=3 {
		create_nth_readthrough(&app, &format!("black_science_{i}"), 1).await;
	}

	create_nth_readthrough(&app, "black_science_1", 1).await; // a lil misleading with `nth` but its fine

	let ids = fetch_on_deck_ids(&app).await;
	assert_eq!(ids.len(), 1);
	assert_eq!(ids[0], "black_science_2");
}

/// read books 1-3, reread books 1-3, then add and read book 4, then add book 5
#[tokio::test]
async fn test_reading_unread_from_next_in_reread() {
	let (app, series_id) = setup(3).await;

	for i in 1..=3 {
		create_nth_readthrough(&app, &format!("black_science_{i}"), 1).await;
	}

	for i in 1..=3 {
		create_nth_readthrough(&app, &format!("black_science_{i}"), 1).await;
	}

	fake_data::Media {
		id: Some("black_science_4".to_string()),
		name: Some("Black Science #4".to_string()),
		series_id: series_id.clone(),
		pages: Some(100),
		..Default::default()
	}
	.insert(app.conn())
	.await;

	create_nth_readthrough(&app, "black_science_4", 1).await;

	fake_data::Media {
		id: Some("black_science_5".to_string()),
		name: Some("Black Science #5".to_string()),
		series_id: series_id.clone(),
		pages: Some(100),
		..Default::default()
	}
	.insert(app.conn())
	.await;

	let ids = fetch_on_deck_ids(&app).await;
	assert_eq!(ids.len(), 1);
	assert_eq!(ids[0], "black_science_5");
}

/// stopping the re-read should still surface new books added since, e.g.
/// finish books 1-3, re-read book 1, stop the re-read, eventually add new book
#[tokio::test]
async fn test_stop_reread_reverts_to_new_only() {
	let (app, series_id) = setup(3).await;

	for i in 1..=3 {
		create_nth_readthrough(&app, &format!("black_science_{i}"), 1).await;
	}

	// start re-read
	create_nth_readthrough(&app, "black_science_1", 1).await;

	stop_reread(&app, &series_id).await;

	let ids = fetch_on_deck_ids(&app).await;
	assert!(ids.is_empty(), "expected empty on deck, got {ids:?}");

	fake_data::Media {
		id: Some("black_science_4".to_string()),
		name: Some("Black Science #4".to_string()),
		series_id: series_id.clone(),
		pages: Some(100),
		..Default::default()
	}
	.insert(app.conn())
	.await;

	let ids = fetch_on_deck_ids(&app).await;
	assert_eq!(ids, vec!["black_science_4"]);
}

/// stop -> resume -> restore the re-read session, e.g.
/// finish books 1-3, re-read book 1, stop the re-read, resume the re-read
#[tokio::test]
async fn test_resume_reread_after_stop() {
	let (app, series_id) = setup(5).await;

	for i in 1..=3 {
		create_nth_readthrough(&app, &format!("black_science_{i}"), 1).await;
	}

	// start re-read
	create_nth_readthrough(&app, "black_science_1", 1).await;

	stop_reread(&app, &series_id).await;

	let ids = fetch_on_deck_ids(&app).await;
	assert_eq!(ids, vec!["black_science_4".to_string()]); // book 4 from first readthrough

	resume_reread(&app, &series_id).await;

	let ids = fetch_on_deck_ids(&app).await;
	assert_eq!(ids, vec!["black_science_2"]); // back to book 2 from the re-read
}

/// First "readthrough": read 1-5
/// Second "readthrough": reread 2-5 (skip 1)
/// Third "readthrough": reread 1 (second readthrough of 1) -> should show 2,
///     then read 2 (third readthrough of 2) -> should show 3
#[tokio::test]
async fn test_reading_skipped_books_in_reread() {
	let (app, _) = setup(5).await;

	for i in 1..=5 {
		create_nth_readthrough(&app, &format!("black_science_{i}"), 1).await;
	}

	for i in 2..=5 {
		create_nth_readthrough(&app, &format!("black_science_{i}"), 1).await;
	}

	create_nth_readthrough(&app, "black_science_1", 1).await;
	let ids = fetch_on_deck_ids(&app).await;
	assert_eq!(ids, vec!["black_science_2".to_string()]);

	create_nth_readthrough(&app, "black_science_2", 1).await;
	let ids = fetch_on_deck_ids(&app).await;
	assert_eq!(ids, vec!["black_science_3".to_string()]);
}

/// First "readthrough": read 1-4
/// Second "readthrough": reread 1 and 3 -> should show 4
/// Third "readthrough": reread 1 (third readthrough of 1) and 4 (second readthrough of 4) -> should show 5
#[tokio::test]
async fn test_skipping_on_rereads() {
	let (app, _) = setup(5).await;

	for i in 1..=4 {
		create_nth_readthrough(&app, &format!("black_science_{i}"), 1).await;
	}

	create_nth_readthrough(&app, "black_science_1", 1).await;
	create_nth_readthrough(&app, "black_science_3", 1).await;
	let ids = fetch_on_deck_ids(&app).await;
	assert_eq!(ids, vec!["black_science_4".to_string()]);

	create_nth_readthrough(&app, "black_science_1", 1).await;
	create_nth_readthrough(&app, "black_science_4", 1).await;
	let ids = fetch_on_deck_ids(&app).await;
	assert_eq!(ids, vec!["black_science_5".to_string()]);
}

/// First "readthrough": read 1 and 3
/// Second "readthrough": read 1-4 (rereading 1 and 3 in the process) -> should show 5
/// Third "readthrough": reread 1 (third readthrough of 1) and 4 (second readthrough of 4) -> should show 5
///     skip 5 to read 6 -> should show 7
#[tokio::test]
async fn test_skipping_on_first_readthrough() {
	let (app, _) = setup(7).await;

	create_nth_readthrough(&app, "black_science_1", 1).await;
	create_nth_readthrough(&app, "black_science_3", 1).await;

	for i in 1..=4 {
		create_nth_readthrough(&app, &format!("black_science_{i}"), 1).await;
	}

	let ids = fetch_on_deck_ids(&app).await;
	assert_eq!(ids, vec!["black_science_5".to_string()]);

	create_nth_readthrough(&app, "black_science_6", 1).await;

	let ids = fetch_on_deck_ids(&app).await;
	assert_eq!(ids, vec!["black_science_7".to_string()]);
}

/// dropping a series should not appear on deck
#[tokio::test]
async fn test_dropped_series_excluded() {
	let (app, series_id) = setup(3).await;

	create_nth_readthrough(&app, "black_science_1", 1).await;

	assert!(!fetch_on_deck_ids(&app).await.is_empty()); // sanity check

	drop_series(&app, &series_id).await;

	let ids = fetch_on_deck_ids(&app).await;
	assert!(ids.is_empty(), "dropped series still on deck: {ids:?}");
}

/// un-dropping a series should restore it to on deck
#[tokio::test]
async fn test_undrop_series_reappears() {
	let (app, series_id) = setup(3).await;

	create_nth_readthrough(&app, "black_science_1", 1).await;
	drop_series(&app, &series_id).await;

	assert!(fetch_on_deck_ids(&app).await.is_empty());

	undrop_series(&app, &series_id).await;

	let ids = fetch_on_deck_ids(&app).await;
	assert_eq!(ids.len(), 1);
}

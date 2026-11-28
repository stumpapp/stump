use crate::common::{
	TestApp, book::update_progress, series::setup_single_series_with_n_books,
};
use graphql::input::media::{MediaProgressInput, PagedProgressInput};
use serde_json::{Value, json};
use tests::fake_data;

async fn fetch_read_progress(app: &TestApp, book_id: &str) -> Value {
	let result = app
		.execute_gql(
			r#"
			query ReadProgressAfterSync($id: ID!) {
				mediaById(id: $id) {
					readProgress {
						sessionId
						page
					}
				}
			}
			"#,
			Some(json!({ "id": book_id })),
		)
		.await;

	result
		.get("data")
		.and_then(|data| data.get("mediaById"))
		.and_then(|media| media.get("readProgress"))
		.cloned()
		.unwrap_or_else(|| panic!("expected read progress response, got: {result:#}"))
}

/// if i manually clear progression, then the active reading cursor should be null
#[tokio::test]
async fn test_clearing_read_progress_removes_the_cursor_used_for_offline_sync() {
	let app = TestApp::new_with_default_user().await;
	let (_, books) = setup_single_series_with_n_books(
		&app,
		fake_data::Series {
			id: Some("murderbot".to_string()),
			name: Some("The Murderbot Diaries".to_string()),
			..Default::default()
		},
		1,
	)
	.await;
	let book_id = &books[0].id;

	update_progress(
		&app,
		book_id,
		MediaProgressInput::Paged(PagedProgressInput {
			page: 50,
			elapsed_seconds_delta: Some(300),
			..Default::default()
		}),
	)
	.await;

	let before = fetch_read_progress(&app, book_id).await;
	assert_eq!(before["page"], 50);

	let result = app
		.execute_gql(
			r#"
			mutation ClearProgressForOfflineSync($id: ID!) {
				clearMediaProgress(id: $id)
			}
			"#,
			Some(json!({ "id": book_id })),
		)
		.await;
	assert_eq!(result["data"]["clearMediaProgress"], true);

	let after = fetch_read_progress(&app, book_id).await;
	assert!(
		after.is_null(),
		"cleared progress should be returned as null: {after:#}"
	);
}
// ^ mostly a sanity check, but good to have nonetheless

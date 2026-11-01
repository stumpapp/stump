use crate::common::{
	library::setup_library, series::setup_single_series_with_n_books, TestApp,
};
use models::entity::media_metadata;
use sea_orm::{prelude::Decimal, ActiveModelTrait};
use tests::fake_data;

// TODO: added these quickly to assert a fix while i was there but should organize better,
// i.e. media.rs should really be media/ with diff files for diff areas

/// fetch a single media item and return the raw `mediaById` json
async fn fetch_media_by_id(
	app: &TestApp,
	id: &str,
	extra_fields: &str,
) -> serde_json::Value {
	let query = format!(
		r#"
        query GetMedia($id: ID!) {{
            mediaById(id: $id) {{
                id
                {extra_fields}
            }}
        }}
        "#
	);
	let result = app
		.execute_gql(&query, Some(serde_json::json!({ "id": id })))
		.await;

	result
		.get("data")
		.and_then(|d| d.get("mediaById"))
		.cloned()
		.unwrap_or_else(|| panic!("expected mediaById in response: {result:#}"))
}

/// `metadata.number` is preferred when present
#[tokio::test]
async fn test_media_metadata_number_is_returned() {
	let app = TestApp::new_with_default_user().await;
	let conn = app.conn();

	let library = setup_library(&app, fake_data::Library::default(), None).await;
	let (_, books) = setup_single_series_with_n_books(
		&app,
		fake_data::Series {
			library_id: Some(library.id),
			..Default::default()
		},
		1,
	)
	.await;
	let book = &books[0];

	media_metadata::ActiveModel {
		media_id: sea_orm::Set(Some(book.id.clone())),
		number: sea_orm::Set(Some(Decimal::new(3, 0))),
		..Default::default()
	}
	.insert(conn)
	.await
	.expect("could not insert media metadata");

	let media =
		fetch_media_by_id(&app, &book.id, "metadata { number } seriesPosition").await;

	let number = media
		.get("metadata")
		.and_then(|m| m.get("number"))
		.expect("expected metadata.number in response");
	// not going through the effort to cmp a decimal and int below, but it should exist
	assert!(!number.is_null(), "expected metadata.number to be non-null");

	let series_position = media
		.get("seriesPosition")
		.and_then(|v| v.as_i64())
		.expect("expected seriesPosition");
	assert_eq!(series_position, 3);
}

/// `seriesPosition` falls back to a window function when no `metadata.number` is set
#[tokio::test]
async fn test_series_position_via_row_number() {
	let app = TestApp::new_with_default_user().await;

	let library = setup_library(&app, fake_data::Library::default(), None).await;
	// will insert named with order, so should get position as 1, 2, 3
	let (_, books) = setup_single_series_with_n_books(
		&app,
		fake_data::Series {
			library_id: Some(library.id),
			..Default::default()
		},
		3,
	)
	.await;

	for (i, book) in books.iter().enumerate() {
		let expected_position = (i + 1) as i64;
		let media = fetch_media_by_id(&app, &book.id, "seriesPosition").await;
		let series_position = media
			.get("seriesPosition")
			.and_then(|v| v.as_i64())
			.expect("expected seriesPosition");
		assert_eq!(
			series_position, expected_position,
			"book '{}' should have position {}, got {}",
			book.id, expected_position, series_position
		);
	}
}

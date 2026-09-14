use crate::common::{series::setup_single_series_with_n_books, TestApp};

use chrono::Utc;
use serde_json::{json, Value};
use tests::fake_data;

async fn setup() -> (TestApp, String) {
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
		1,
	)
	.await;

	let book = books
		.into_iter()
		.next()
		.expect("expected at least one book");

	(app, book.id)
}

async fn get_progression(app: &TestApp, book_id: &str) -> Value {
	let response = app
		.get(format!("/opds/v2.0/books/{book_id}/progression").as_str())
		.await;
	response.assert_status_ok();
	response.json()
}

/// progression should return an empty/default payload when no active progression exists
#[tokio::test]
async fn test_progression_returns_default_when_missing() {
	let (app, book_id) = setup().await;

	let progression = get_progression(&app, &book_id).await;

	assert!(
		progression
			.get("modified")
			.and_then(Value::as_str)
			.is_some(),
		"expected modified timestamp"
	);
	assert_eq!(
		progression
			.get("device")
			.and_then(|d| d.get("id"))
			.and_then(Value::as_str),
		Some("")
	);
	assert_eq!(
		progression
			.get("device")
			.and_then(|d| d.get("name"))
			.and_then(Value::as_str),
		Some("")
	);
}

/// progression should round-trip with latest page and total progression
#[tokio::test]
async fn test_progression_put_then_get_round_trip() {
	let (app, book_id) = setup().await;

	let payload = json!({
		"modified": Utc::now().to_rfc3339(),
		"device": {
			"id": "opds-device-1",
			"name": "OPDS Device"
		},
		"locator": {
			"href": format!("/opds/v2.0/books/{}/pages/10", book_id),
			"type": "image/jpeg",
			"title": "Page 10",
			"locations": {
				"position": 10,
				"progression": 0.1,
				"totalProgression": 0.1
			}
		}
	});

	let response = app
		.put(
			format!("/opds/v2.0/books/{book_id}/progression").as_str(),
			&payload,
		)
		.await;
	response.assert_status_success();

	let progression = get_progression(&app, &book_id).await;

	assert_eq!(
		progression
			.get("device")
			.and_then(|device| device.get("id"))
			.and_then(Value::as_str),
		Some("opds-device-1")
	);
	assert_eq!(
		progression
			.get("device")
			.and_then(|device| device.get("name"))
			.and_then(Value::as_str),
		Some("OPDS Device")
	);

	assert_eq!(
		progression
			.get("locator")
			.and_then(|locator| locator.get("locations"))
			.and_then(|locations| locations.get("position"))
			.and_then(Value::as_i64),
		Some(10)
	);

	let total_progression = progression
		.get("locator")
		.and_then(|locator| locator.get("locations"))
		.and_then(|locations| locations.get("totalProgression"))
		.and_then(Value::as_f64)
		.expect("expected total progression");

	assert!((total_progression - 0.1).abs() < 0.000001);
}

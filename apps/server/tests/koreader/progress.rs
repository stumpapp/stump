use crate::common::{
	api_key::create_api_key_for_user, series::setup_single_series_with_n_books, TestApp,
};
use models::{
	entity::{media, reading_device, reading_session, user},
	shared::{
		api_key::APIKeyPermissions,
		enums::{ReadingStatus, UserPermission},
	},
};
use sea_orm::{
	prelude::Decimal, ActiveModelTrait, ActiveValue::Set, ColumnTrait, EntityTrait,
	IntoActiveModel, PaginatorTrait, QueryFilter,
};
use serde_json::json;
use tests::fake_data;

async fn setup() -> (TestApp, String, media::Model, user::Model) {
	let app = TestApp::new().await;
	let db = app.conn();

	let user = fake_data::User::new("koreader").insert(db).await;

	let (token, _) = create_api_key_for_user(
		&app,
		&user,
		Some(APIKeyPermissions::Custom(vec![
			UserPermission::AccessKoreaderSync,
		])),
	)
	.await;

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

	let koreader_hash = "abc123".to_string();
	let mut active_book = books
		.into_iter()
		.next()
		.expect("should have at least one book")
		.into_active_model();
	active_book.koreader_hash = Set(Some(koreader_hash.clone()));

	let media = active_book
		.update(db)
		.await
		.expect("failed to update media with koreader_hash");

	(app, token, media, user)
}

#[tokio::test]
async fn test_get_progress_no_session_exists() {
	let (app, api_key, media, _) = setup().await;

	let koreader_hash = media.koreader_hash.clone().expect("should be set");
	let path = format!("/koreader/{}/syncs/progress/{}", api_key, koreader_hash);

	let response = app.server.get(&path).await;

	response.assert_status_ok();

	let body: serde_json::Value = response.json();

	assert_eq!(
		body["document"].as_str().expect("should be set"),
		koreader_hash.as_str()
	);
	assert!(body["percentage"].is_null());
	assert!(body["progress"].is_null());
}

#[tokio::test]
async fn test_get_progress_active_session() {
	let (app, api_key, media, user) = setup().await;
	let db = app.conn();

	fake_data::ReadingSession {
		media_id: media.id.clone(),
		user_id: user.id.clone(),
		end_percentage: 0.42,
		status: ReadingStatus::Reading,
		..Default::default()
	}
	.insert(db)
	.await;

	let koreader_hash = media.koreader_hash.clone().expect("should be set");
	let path = format!("/koreader/{}/syncs/progress/{}", api_key, koreader_hash);

	let response = app.server.get(&path).await;

	response.assert_status_ok();

	let body: serde_json::Value = response.json();

	assert_eq!(
		body["document"].as_str().expect("should be set"),
		koreader_hash.as_str()
	);
	assert_eq!(
		body["percentage"].as_f64().unwrap(),
		0.42,
		"expected 42% progress"
	);
	assert!(body["timestamp"].is_number(), "timestamp should be set");
}

#[tokio::test]
async fn test_get_progress_completed_session() {
	let (app, api_key, media, user) = setup().await;
	let db = app.conn();

	fake_data::ReadingSession {
		media_id: media.id.clone(),
		user_id: user.id.clone(),
		end_percentage: 1.0,
		status: ReadingStatus::Finished,
		..Default::default()
	}
	.insert(db)
	.await;

	let koreader_hash = media.koreader_hash.clone().expect("should be set");
	let path = format!("/koreader/{}/syncs/progress/{}", api_key, koreader_hash);

	let response = app.server.get(&path).await;

	response.assert_status_ok();

	let body: serde_json::Value = response.json();

	assert_eq!(
		body["document"].as_str().expect("should be set"),
		koreader_hash.as_str()
	);
	assert_eq!(
		body["percentage"].as_f64().unwrap(),
		1.0,
		"expected 100% completion"
	);
	assert!(body["timestamp"].is_number(), "timestamp should be set");
}

#[tokio::test]
async fn test_put_progress_creates_device_for_user() {
	let (app, api_key, media, user) = setup().await;
	let db = app.conn();

	let koreader_hash = media.koreader_hash.clone().expect("should be set");
	let path = format!("/koreader/{}/syncs/progress", api_key);

	let response = app
		.server
		.put(&path)
		.json(&json!({
			"document": koreader_hash,
			"progress": "12",
			"percentage": 0.5,
			"device": "Kindle",
			"device_id": "koreader-device",
		}))
		.await;

	response.assert_status_ok();

	let device = reading_device::Entity::find_by_id((
		"koreader-device".to_string(),
		user.id.clone(),
	))
	.one(db)
	.await
	.expect("failed to query reading device")
	.expect("reading device should be created for the user");
	assert_eq!(device.name, "Kindle");

	let session = reading_session::Entity::find()
		.filter(reading_session::Column::UserId.eq(user.id.clone()))
		.filter(reading_session::Column::MediaId.eq(media.id.clone()))
		.one(db)
		.await
		.expect("failed to query reading session")
		.expect("reading session should be created");
	assert_eq!(session.end_percentage, Some(Decimal::new(5, 1)));
	assert_eq!(session.koreader_progress.as_deref(), Some("12"));
}

#[tokio::test]
async fn test_put_progress_updates_existing_device_name() {
	let (app, api_key, media, user) = setup().await;
	let db = app.conn();

	let koreader_hash = media.koreader_hash.clone().expect("should be set");
	let path = format!("/koreader/{}/syncs/progress", api_key);

	for (device_name, progress) in [("Kindle", "12"), ("Kindle Paperwhite", "13")] {
		app.server
			.put(&path)
			.json(&json!({
				"document": koreader_hash,
				"progress": progress,
				"percentage": 0.5,
				"device": device_name,
				"device_id": "koreader-device",
			}))
			.await
			.assert_status_ok();
	}

	let device_count = reading_device::Entity::find()
		.filter(reading_device::Column::UserId.eq(user.id.clone()))
		.count(db)
		.await
		.expect("failed to count reading devices");
	assert_eq!(device_count, 1, "the existing device should be updated");

	let device = reading_device::Entity::find_by_id((
		"koreader-device".to_string(),
		user.id.clone(),
	))
	.one(db)
	.await
	.expect("failed to query reading device")
	.expect("reading device should exist");
	assert_eq!(device.name, "Kindle Paperwhite");
}

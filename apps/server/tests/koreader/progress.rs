use crate::common::{
	api_key::create_api_key_for_user, series::setup_single_series_with_n_books, TestApp,
};
use models::{
	entity::{media, user},
	shared::{
		api_key::APIKeyPermissions,
		enums::{ReadingStatus, UserPermission},
	},
};
use sea_orm::{ActiveModelTrait, ActiveValue::Set, IntoActiveModel};
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

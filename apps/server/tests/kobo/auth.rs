use axum::http::StatusCode;
use tests::fake_data;

use crate::common::{api_key::create_api_key_for_user, TestApp};

async fn setup() -> (TestApp, String, String) {
	let app = TestApp::new().await;
	let user = fake_data::User::new("kobo").insert(app.conn()).await;
	let (api_key, _) = create_api_key_for_user(&app, &user, None).await;
	let series = fake_data::Series::default().insert(app.conn()).await;
	let book = fake_data::Media {
		series_id: series.id,
		extension: Some("epub".to_string()),
		..Default::default()
	}
	.insert(app.conn())
	.await;
	(app, api_key, book.id)
}

/// routes explicitly part of the kobo sync api are authed via api key, not session / jwt auth
#[tokio::test]
async fn test_kobo_device_route_authenticates_with_api_key() {
	let (app, api_key, book_id) = setup().await;

	// invalid api key = 401
	app.server
		.get(&format!("/kobo/invalid_api_key/v1/library/{book_id}/state"))
		.await
		.assert_status(StatusCode::UNAUTHORIZED);

	// valid api key = ok
	app.server
		.get(&format!("/kobo/{api_key}/v1/library/{book_id}/state"))
		.await
		.assert_status_ok();
}

/// routes part of internal api, not part of the kobo sync api, are authed via session / jwt auth
#[tokio::test]
async fn test_delete_sync_sessions_requires_session_auth() {
	let app = TestApp::new_with_default_user().await;

	// no auth at all = 401
	app.server
		.delete("/api/v2/kobo/sync-sessions")
		.await
		.assert_status(StatusCode::UNAUTHORIZED);

	// authed = 204
	app.delete("/api/v2/kobo/sync-sessions")
		.await
		.assert_status(StatusCode::NO_CONTENT);
}

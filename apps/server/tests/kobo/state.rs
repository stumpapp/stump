use std::time::Duration;

use axum::http::StatusCode;
use chrono::{DateTime, Utc};
use models::entity::{reading_progress_reset, reading_session};
use sea_orm::{ColumnTrait, EntityTrait, QueryFilter};
use serde_json::{json, Value};
use tests::fake_data;

use crate::common::{api_key::create_api_key_for_user, TestApp};

async fn setup() -> (TestApp, String, String) {
	let app = TestApp::new().await;
	let user = fake_data::User::new("kobo-state").insert(app.conn()).await;
	let (api_key, _) = create_api_key_for_user(&app, &user, None).await;
	let series = fake_data::Series::default().insert(app.conn()).await;
	let book = fake_data::Media {
		id: Some("kobo-state-book".to_string()),
		series_id: series.id,
		extension: Some("EPUB".to_string()),
		..Default::default()
	}
	.insert(app.conn())
	.await;
	(app, api_key, book.id)
}

#[tokio::test]
async fn syncs_reading_progress_and_reset() {
	let (app, api_key, book_id) = setup().await;
	let path = format!("/kobo/{api_key}/v1/library/{book_id}/state");
	let reading_at: DateTime<Utc> = "2020-01-01T00:00:00Z".parse().unwrap();
	let response = app
		.server
		.put(&path)
		.add_header("x-kobo-deviceid", "kobo-1")
		.json(&json!({
			"ReadingStates": [{
				"EntitlementId": book_id,
				"LastModified": reading_at,
				"CurrentBookmark": {
					"ProgressPercent": 50,
					"ContentSourceProgressPercent": 25,
					"Location": {
						"Source": "OEBPS/chapter.xhtml",
						"Type": "KoboSpan",
						"Value": "kobo.1.1"
					}
				},
				"StatusInfo": { "Status": "Reading" }
			}]
		}))
		.await;
	response.assert_status_ok();
	let body: Value = response.json();
	assert_eq!(body["RequestResult"], "Success");

	let session = reading_session::Entity::find()
		.filter(reading_session::Column::MediaId.eq(&book_id))
		.one(app.conn())
		.await
		.unwrap()
		.unwrap();
	assert_eq!(session.end_percentage.unwrap().to_string(), "0.5");
	assert_eq!(session.device_ids.unwrap().0, vec!["kobo-1"]);
	assert_eq!(session.reported_at.unwrap().to_utc(), reading_at);
	assert!(session.updated_at.unwrap().to_utc() > reading_at);

	let state = app.server.get(&path).await;
	state.assert_status_ok();
	let state: Value = state.json();
	assert_eq!(state[0]["StatusInfo"]["Status"], "Reading");
	assert_eq!(state[0]["CurrentBookmark"]["ProgressPercent"], 50.0);
	assert!(state[0]["CurrentBookmark"]["Location"].is_null());
	assert_eq!(state[0]["LastModified"], json!(reading_at));
	assert_eq!(state[0]["PriorityTimestamp"], json!(reading_at));

	let finished_at: DateTime<Utc> = "2020-01-01T00:01:00Z".parse().unwrap();
	app.server
		.put(&path)
		.json(&json!({
			"ReadingStates": [{
				"EntitlementId": book_id,
				"LastModified": finished_at,
				"StatusInfo": { "Status": "Finished" }
			}]
		}))
		.await
		.assert_status_ok();
	let state: Value = app.server.get(&path).await.json();
	assert_eq!(state[0]["StatusInfo"]["Status"], "Finished");
	assert_eq!(state[0]["CurrentBookmark"]["ProgressPercent"], 100.0);
	let sessions = reading_session::Entity::find()
		.filter(reading_session::Column::MediaId.eq(&book_id))
		.all(app.conn())
		.await
		.unwrap();
	assert_eq!(sessions.len(), 1);

	let reset_at: DateTime<Utc> = "2030-01-01T00:02:00Z".parse().unwrap();
	app.server
		.put(&path)
		.json(&json!({
			"ReadingStates": [{
				"EntitlementId": book_id,
				"LastModified": reset_at,
				"StatusInfo": { "Status": "ReadyToRead" }
			}]
		}))
		.await
		.assert_status_ok();

	let reset = reading_progress_reset::Entity::find_by_id((
		user_id(app.conn()).await,
		book_id.clone(),
	))
	.one(app.conn())
	.await
	.unwrap()
	.unwrap();
	assert_eq!(reset.reported_at.unwrap().to_utc(), reset_at);
	assert!(reset.reset_at.to_utc() < reset_at);
	let state: Value = app.server.get(&path).await.json();
	assert_eq!(state[0]["StatusInfo"]["Status"], "ReadyToRead");
	assert_eq!(state[0]["LastModified"], json!(reset_at));
	assert_eq!(state[0]["PriorityTimestamp"], json!(reset_at));

	// A future client timestamp must not prevent a later server-received update from winning.
	tokio::time::sleep(Duration::from_millis(1)).await;
	app.server
		.put(&path)
		.json(&json!({
			"ReadingStates": [{
				"EntitlementId": book_id,
				"CurrentBookmark": { "ProgressPercent": 10 },
				"StatusInfo": { "Status": "Reading" }
			}]
		}))
		.await
		.assert_status_ok();
	let state: Value = app.server.get(&path).await.json();
	assert_eq!(state[0]["StatusInfo"]["Status"], "Reading");
	let restarted_at: DateTime<Utc> =
		serde_json::from_value(state[0]["LastModified"].clone()).unwrap();
	assert!(restarted_at > reset_at);
}

#[tokio::test]
async fn rejects_out_of_range_progress() {
	let (app, api_key, book_id) = setup().await;
	app.server
		.put(&format!("/kobo/{api_key}/v1/library/{book_id}/state"))
		.json(&json!({
			"ReadingStates": [{
				"EntitlementId": book_id,
				"CurrentBookmark": { "ProgressPercent": 101 },
				"StatusInfo": { "Status": "Reading" }
			}]
		}))
		.await
		.assert_status(StatusCode::BAD_REQUEST);
}

async fn user_id(db: &sea_orm::DatabaseConnection) -> String {
	models::entity::user::Entity::find()
		.one(db)
		.await
		.unwrap()
		.unwrap()
		.id
}

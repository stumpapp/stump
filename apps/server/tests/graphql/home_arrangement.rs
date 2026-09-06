use crate::common::TestApp;
use models::entity::user_preferences;
use sea_orm::{ColumnTrait, EntityTrait, QueryFilter};
use serde_json::{json, Value};

const QUERY: &str = r#"query { me { id preferences { homeArrangement { sections { visible config { __typename ... on RecentlyAdded { entity } } } } navigationArrangement { locked sections { visible } } } } }"#;
const MUTATION: &str = r#"mutation($input: HomeArrangementInput!) { updateHomeArrangement(input: $input) { sections { visible config { __typename ... on RecentlyAdded { entity } } } } }"#;

fn sections() -> Value {
	json!([
		{"visible": false, "config": {"recentlyAdded": {"entity": "SERIES"}}},
		{"visible": true, "config": {"onDeckBooks": {}}},
		{"visible": false, "config": {"recentlyAdded": {"entity": "BOOKS"}}},
		{"visible": true, "config": {"inProgressBooks": {}}}
	])
}

async fn update(app: &TestApp, sections: Value) -> Value {
	app.execute_gql(MUTATION, Some(json!({"input": {"sections": sections}})))
		.await
}

#[tokio::test]
async fn home_arrangement_persists_without_unlocking_and_leaves_other_preferences_alone()
{
	let app = TestApp::new_with_default_user().await;
	let before = app.execute_gql(QUERY, None).await;
	assert!(before.get("errors").is_none(), "{before}");
	let user_id = before["data"]["me"]["id"].as_str().unwrap();
	let preferences = user_preferences::Entity::find()
		.filter(user_preferences::Column::UserId.eq(user_id))
		.one(app.conn())
		.await
		.unwrap()
		.unwrap();
	// Exercise a real stored legacy preference whose lock status was true.
	let legacy = json!({"locked": true, "sections": [
		{"visible": true, "config": {"name": null, "links": []}},
		{"visible": true, "config": {"entity": "BOOKS", "name": null, "links": []}},
		{"visible": true, "config": {"entity": "SERIES", "name": null, "links": []}}
	]});
	// Set the raw JSON to test the persisted legacy representation, before decoding.
	use sea_orm::{ConnectionTrait, DatabaseBackend, Statement};
	app.conn()
		.execute(Statement::from_sql_and_values(
			DatabaseBackend::Sqlite,
			"UPDATE user_preferences SET home_arrangement = ? WHERE id = ?",
			[legacy.to_string().into(), preferences.id.into()],
		))
		.await
		.unwrap();
	let restored = app.execute_gql(QUERY, None).await;
	assert!(restored.get("errors").is_none(), "{restored}");
	let restored = &restored["data"]["me"]["preferences"]["homeArrangement"]["sections"];
	assert_eq!(restored.as_array().unwrap().len(), 4);
	assert_eq!(restored[1]["config"]["__typename"], "OnDeckBooks");
	assert_eq!(restored[2]["config"]["__typename"], "RecentlyAdded");

	let response = update(&app, sections()).await;
	assert!(response.get("errors").is_none(), "{response}");
	let after = app.execute_gql(QUERY, None).await;
	assert_eq!(
		after["data"]["me"]["preferences"]["homeArrangement"]["sections"],
		response["data"]["updateHomeArrangement"]["sections"]
	);
	assert_eq!(
		after["data"]["me"]["preferences"]["navigationArrangement"],
		before["data"]["me"]["preferences"]["navigationArrangement"]
	);
	let stored = user_preferences::Entity::find_by_id(preferences.id)
		.one(app.conn())
		.await
		.unwrap()
		.unwrap();
	assert_eq!(stored.locale, preferences.locale);
	assert_eq!(stored.app_theme, preferences.app_theme);
}

#[tokio::test]
async fn home_arrangement_rejects_invalid_and_unauthenticated_writes() {
	let app = TestApp::new_with_default_user().await;
	let before = app.execute_gql(QUERY, None).await;
	let mut duplicate = sections();
	duplicate[1] = duplicate[0].clone();
	assert!(update(&app, duplicate).await.get("errors").is_some());
	assert!(update(&app, json!([])).await.get("errors").is_some());
	let mut unsupported = sections();
	unsupported[0] = json!({"visible": true, "config": {"system": {"variant": "HOME"}}});
	assert!(update(&app, unsupported).await.get("errors").is_some());
	assert_eq!(app.execute_gql(QUERY, None).await, before);
	let response = app
		.server
		.post("/api/graphql")
		.json(
			&json!({"query": MUTATION, "variables": {"input": {"sections": sections()}}}),
		)
		.await;
	assert!(
		!response.status_code().is_success()
			|| response.json::<Value>().get("errors").is_some()
	);
	assert_eq!(app.execute_gql(QUERY, None).await, before);
}

#[tokio::test]
async fn home_arrangement_is_scoped_to_the_authenticated_user_and_can_hide_every_section()
{
	let app = TestApp::new_with_default_user().await;
	let owner_before = app.execute_gql(QUERY, None).await;
	let owner_token = app.access_token.read().await.clone();
	let created = app.execute_gql(r#"mutation { createUser(input: { username: "home-reader", password: "test-password", permissions: [] }) { id } }"#, None).await;
	assert!(created.get("errors").is_none(), "{created}");
	let login = app
		.server
		.post("/api/v2/auth/login?generate_token=true")
		.json(&json!({"username": "home-reader", "password": "test-password"}))
		.await;
	login.assert_status_ok();
	*app.access_token.write().await = Some(
		login.json::<Value>()["accessToken"]
			.as_str()
			.unwrap()
			.to_owned(),
	);
	let mut hidden = sections();
	for section in hidden.as_array_mut().unwrap() {
		section["visible"] = json!(false);
	}
	let response = update(&app, hidden).await;
	assert!(response.get("errors").is_none(), "{response}");
	let reader_after = app.execute_gql(QUERY, None).await;
	assert!(
		reader_after["data"]["me"]["preferences"]["homeArrangement"]["sections"]
			.as_array()
			.unwrap()
			.iter()
			.all(|section| section["visible"] == false)
	);
	*app.access_token.write().await = owner_token;
	assert_eq!(app.execute_gql(QUERY, None).await, owner_before);
}

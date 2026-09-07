use crate::common::TestApp;
use models::entity::user_preferences;
use sea_orm::{ActiveModelTrait, EntityTrait, IntoActiveModel, Set};
use serde_json::{json, Value};

const QUERY: &str = r#"
query {
    me {
        preferences {
            homeArrangement {
                sections { visible config { __typename ... on RecentlyAdded { entity } } }
            }
        }
    }
}
"#;
const MUTATION: &str = r#"
mutation($input: HomeArrangementInput!) {
    updateHomeArrangement(input: $input) {
        sections { visible config { __typename ... on RecentlyAdded { entity } } }
    }
}
"#;

fn sections() -> Value {
	json!([
		{"visible": false, "config": {"recentlyAdded": {"entity": "SERIES"}}},
		{"visible": true, "config": {"onDeckBooks": {}}},
		{"visible": false, "config": {"recentlyAdded": {"entity": "BOOKS"}}},
		{"visible": true, "config": {"inProgressBooks": {}}}
	])
}

async fn update(app: &TestApp, sections: Value) -> Value {
	let response = app
		.execute_gql(MUTATION, Some(json!({"input": {"sections": sections}})))
		.await;
	assert!(response.get("errors").is_none(), "{response}");
	response["data"]["updateHomeArrangement"]["sections"].clone()
}

async fn read_sections(app: &TestApp) -> Value {
	let response = app.execute_gql(QUERY, None).await;
	assert!(response.get("errors").is_none(), "{response}");
	response["data"]["me"]["preferences"]["homeArrangement"]["sections"].clone()
}

async fn store_config(app: &TestApp, value: Value) {
	let preferences = user_preferences::Entity::find()
		.one(app.conn())
		.await
		.unwrap()
		.unwrap();
	let mut model = preferences.into_active_model();
	model.home_arrangement = Set(Some(value));
	model.update(app.conn()).await.unwrap();
}

#[tokio::test]
async fn home_section_order_and_visibility_are_saved() {
	let app = TestApp::new_with_default_user().await;
	let saved = update(&app, sections()).await;
	assert_eq!(
		saved,
		json!([
			{"visible": false, "config": {"__typename": "RecentlyAdded", "entity": "SERIES"}},
			{"visible": true, "config": {"__typename": "OnDeckBooks"}},
			{"visible": false, "config": {"__typename": "RecentlyAdded", "entity": "BOOKS"}},
			{"visible": true, "config": {"__typename": "InProgressBooks"}}
		])
	);
	assert_eq!(read_sections(&app).await, saved);
}

#[tokio::test]
async fn home_sections_are_normalized_on_save() {
	let app = TestApp::new_with_default_user().await;
	let saved = update(
		&app,
		json!([
			{"visible": true, "config": {"recentlyAdded": {"entity": "BOOKS"}}},
			{"visible": false, "config": {"recentlyAdded": {"entity": "BOOKS"}}},
			{"visible": true, "config": {"system": {"variant": "HOME"}}}
		]),
	)
	.await;
	assert_eq!(
		saved,
		json!([
			{"visible": true, "config": {"__typename": "RecentlyAdded", "entity": "BOOKS"}},
			{"visible": false, "config": {"__typename": "InProgressBooks"}},
			{"visible": false, "config": {"__typename": "OnDeckBooks"}},
			{"visible": false, "config": {"__typename": "RecentlyAdded", "entity": "SERIES"}}
		])
	);
	assert_eq!(read_sections(&app).await, saved);
	let hidden = update(&app, json!([])).await;
	assert_eq!(hidden.as_array().unwrap().len(), 4);
	assert!(hidden
		.as_array()
		.unwrap()
		.iter()
		.all(|section| section["visible"] == false));
}

#[tokio::test]
async fn stored_home_sections_are_normalized_on_read() {
	let app = TestApp::new_with_default_user().await;
	store_config(
		&app,
		json!({"locked": false, "sections": [
			{"visible": true, "config": {"type": "OnDeckBooks", "name": null}},
			{"visible": false, "config": {"type": "OnDeckBooks", "name": null}}
		]}),
	)
	.await;
	let normalized = read_sections(&app).await;
	assert_eq!(normalized.as_array().unwrap().len(), 4);
	assert_eq!(
		normalized[0],
		json!({"visible": true, "config": {"__typename": "OnDeckBooks"}})
	);
	assert!(normalized.as_array().unwrap()[1..]
		.iter()
		.all(|section| section["visible"] == false));
}

#[tokio::test]
async fn unreadable_home_config_uses_defaults_until_the_next_save() {
	let app = TestApp::new_with_default_user().await;
	let defaults = read_sections(&app).await;
	store_config(&app, json!({"sections": [{"config": {"type": "Unknown"}}]})).await;
	assert_eq!(read_sections(&app).await, defaults);
	let saved = update(&app, sections()).await;
	assert_eq!(read_sections(&app).await, saved);
}

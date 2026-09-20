use crate::common::TestApp;
use models::entity::user_preferences;
use sea_orm::{
	sea_query::Expr, ActiveModelTrait, EntityTrait, IntoActiveModel, QuerySelect, Set,
};
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
	user_preferences::Entity::update_many()
		.col_expr(
			user_preferences::Column::HomeArrangement,
			Expr::value(value),
		)
		.exec(app.conn())
		.await
		.unwrap();
}

async fn stored_config(app: &TestApp) -> Value {
	user_preferences::Entity::find()
		.select_only()
		.column(user_preferences::Column::HomeArrangement)
		.into_tuple::<Value>()
		.one(app.conn())
		.await
		.unwrap()
		.unwrap()
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
}

#[tokio::test]
async fn empty_home_input_hides_all_sections() {
	let app = TestApp::new_with_default_user().await;
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
	let mut preferences = user_preferences::Entity::find()
		.one(app.conn())
		.await
		.unwrap()
		.unwrap()
		.into_active_model();
	preferences.locale = Set("fr".into());
	preferences.update(app.conn()).await.unwrap();
	store_config(
		&app,
		json!({"locked": false, "sections": [
			{"visible": true, "config": {"type": "Unknown"}}
		]}),
	)
	.await;
	assert_eq!(read_sections(&app).await, defaults);
	let response = app
		.execute_gql("query { me { preferences { locale } } }", None)
		.await;
	assert!(response.get("errors").is_none(), "{response}");
	assert_eq!(response["data"]["me"]["preferences"]["locale"], "fr");
	let stored = user_preferences::Entity::find()
		.one(app.conn())
		.await
		.unwrap()
		.unwrap();
	assert!(stored.home_arrangement.is_none());
	assert_eq!(
		stored_config(&app).await["sections"][0]["config"]["type"],
		"Unknown"
	);
	let saved = update(&app, sections()).await;
	assert_eq!(read_sections(&app).await, saved);
	let stored = user_preferences::Entity::find()
		.one(app.conn())
		.await
		.unwrap()
		.unwrap();
	let repaired = stored.home_arrangement.unwrap();
	assert_eq!(
		serde_json::to_value(&repaired).unwrap()["sections"][0]["config"]["entity"],
		"SERIES"
	);
}

#[tokio::test]
async fn unreadable_navigation_uses_its_own_defaults_and_can_be_saved() {
	let app = TestApp::new_with_default_user().await;
	let query = "query { me { preferences { navigationArrangement { locked sections { visible } } } } }";
	let defaults = app.execute_gql(query, None).await;
	assert!(defaults.get("errors").is_none(), "{defaults}");
	let saved_home = update(&app, sections()).await;
	let invalid = json!({"locked": true, "sections": [{"config": {"type": "Unknown"}}]});
	user_preferences::Entity::update_many()
		.col_expr(
			user_preferences::Column::NavigationArrangement,
			Expr::value(invalid.clone()),
		)
		.exec(app.conn())
		.await
		.unwrap();
	assert_eq!(app.execute_gql(query, None).await, defaults);
	assert_eq!(read_sections(&app).await, saved_home);
	let stored = user_preferences::Entity::find()
		.select_only()
		.column(user_preferences::Column::NavigationArrangement)
		.into_tuple::<Value>()
		.one(app.conn())
		.await
		.unwrap()
		.unwrap();
	assert_eq!(stored, invalid);

	let unlocked = app
		.execute_gql(
			"mutation { updateNavigationArrangementLock(locked: false) { locked sections { visible } } }",
			None,
		)
		.await;
	assert!(unlocked.get("errors").is_none(), "{unlocked}");
	let mut expected =
		defaults["data"]["me"]["preferences"]["navigationArrangement"].clone();
	expected["locked"] = json!(false);
	assert_eq!(
		unlocked["data"]["updateNavigationArrangementLock"],
		expected
	);

	let saved = app
		.execute_gql(
			r#"mutation { updateNavigationArrangement(input: {sections: [
                {visible: false, config: {system: {variant: EXPLORE}}}
            ]}) { locked sections { visible } } }"#,
			None,
		)
		.await;
	assert!(saved.get("errors").is_none(), "{saved}");
	assert_eq!(
		saved["data"]["updateNavigationArrangement"],
		json!({"locked": false, "sections": [{"visible": false}]})
	);
	assert_eq!(
		app.execute_gql(query, None).await["data"]["me"]["preferences"]
			["navigationArrangement"],
		saved["data"]["updateNavigationArrangement"]
	);
}

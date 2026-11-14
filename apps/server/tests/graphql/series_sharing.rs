use crate::common::{
	TestApp,
	account::{CreateTestUser, TestUser},
	series::setup_single_series_with_n_books,
};
use models::{entity::library_exclusion, shared::enums::UserPermission};
use sea_orm::{ActiveModelTrait, ActiveValue::Set};
use serde_json::{Value, json};
use tests::fake_data;

const UPDATE_SHARES: &str = r#"
mutation UpdateSeriesSharedUsers($id: ID!, $userIds: [String!]!) {
    updateSeriesSharedUsers(id: $id, userIds: $userIds) {
        id
        sharedUsers { id }
    }
}
"#;

const VISIBLE_CONTENT: &str = r#"
query VisibleContent {
    libraries { nodes { id series { id } } }
    series { nodes { id } }
    media { nodes { id } }
}
"#;

/// Sets up a library with a "shared" and a "private" series (each with two books) and a user
/// the library is hidden from
async fn setup(app: &TestApp, permissions: Vec<UserPermission>) -> TestUser {
	let library = fake_data::Library {
		id: Some("library".to_string()),
		name: Some("library".to_string()),
		..Default::default()
	}
	.insert(app.conn())
	.await;

	for id in ["shared", "private"] {
		setup_single_series_with_n_books(
			app,
			fake_data::Series {
				id: Some(id.to_string()),
				name: Some(id.to_string()),
				library_id: Some(library.id.clone()),
				..Default::default()
			},
			2,
		)
		.await;
	}

	let user = CreateTestUser {
		username: "series-share-user".to_string(),
		permissions,
		..Default::default()
	}
	.insert(app)
	.await;

	library_exclusion::ActiveModel {
		user_id: Set(user.id.clone()),
		library_id: Set(library.id.clone()),
		..Default::default()
	}
	.insert(app.conn())
	.await
	.expect("should hide library from user");

	user
}

fn ids(values: &Value) -> Vec<String> {
	let mut ids = values
		.as_array()
		.expect("should be an array")
		.iter()
		.map(|value| value["id"].as_str().unwrap().to_string())
		.collect::<Vec<_>>();
	ids.sort();
	ids
}

async fn visible_content(app: &TestApp, user: &TestUser) -> Value {
	let response = app
		.execute_gql_with_token(VISIBLE_CONTENT, None, &user.token)
		.await;
	assert!(response.get("errors").is_none(), "{response:#}");
	response["data"].clone()
}

#[tokio::test]
async fn shared_series_and_its_books_are_visible_in_a_hidden_library() {
	let app = TestApp::new_with_default_user().await;
	let user = setup(&app, vec![]).await;

	let before = visible_content(&app, &user).await;
	assert!(ids(&before["libraries"]["nodes"]).is_empty());
	assert!(ids(&before["series"]["nodes"]).is_empty());
	assert!(ids(&before["media"]["nodes"]).is_empty());

	let response = app
		.execute_gql(
			UPDATE_SHARES,
			Some(json!({ "id": "shared", "userIds": [user.id] })),
		)
		.await;
	assert!(response.get("errors").is_none(), "{response:#}");
	assert_eq!(
		ids(&response["data"]["updateSeriesSharedUsers"]["sharedUsers"]),
		vec![user.id.clone()]
	);

	let after = visible_content(&app, &user).await;
	assert_eq!(ids(&after["libraries"]["nodes"]), vec!["library"]);
	assert_eq!(
		ids(&after["libraries"]["nodes"][0]["series"]),
		vec!["shared"],
		"only the shared series should be listed for the library"
	);
	assert_eq!(ids(&after["series"]["nodes"]), vec!["shared"]);
	assert_eq!(
		ids(&after["media"]["nodes"]),
		vec!["shared_1", "shared_2"],
		"all books of the shared series should be visible"
	);

	// Books of the shared series are also reachable outside of GraphQL
	app.server
		.get("/opds/v2.0/series/shared")
		.add_header("Authorization", format!("Bearer {}", user.token))
		.await
		.assert_status_ok();
	let private = app
		.server
		.get("/opds/v2.0/series/private")
		.add_header("Authorization", format!("Bearer {}", user.token))
		.await;
	assert_eq!(private.status_code(), 404);

	// Removing the share hides everything again
	let response = app
		.execute_gql(
			UPDATE_SHARES,
			Some(json!({ "id": "shared", "userIds": [] })),
		)
		.await;
	assert!(response.get("errors").is_none(), "{response:#}");

	let removed = visible_content(&app, &user).await;
	assert!(ids(&removed["libraries"]["nodes"]).is_empty());
	assert!(ids(&removed["series"]["nodes"]).is_empty());
	assert!(ids(&removed["media"]["nodes"]).is_empty());
}

#[tokio::test]
async fn a_share_does_not_grant_management_of_the_library() {
	let app = TestApp::new_with_default_user().await;
	let user = setup(
		&app,
		vec![
			UserPermission::ManageLibrary,
			UserPermission::ReadUsers,
			UserPermission::ScanLibrary,
		],
	)
	.await;

	let response = app
		.execute_gql(
			UPDATE_SHARES,
			Some(json!({ "id": "shared", "userIds": [user.id] })),
		)
		.await;
	assert!(response.get("errors").is_none(), "{response:#}");

	// The user can see the shared series, but must not be able to manage shares for it (and,
	// for example, share the series with others) since the library is hidden from them
	let response = app
		.execute_gql_with_token(
			UPDATE_SHARES,
			Some(json!({ "id": "shared", "userIds": [] })),
			&user.token,
		)
		.await;
	assert!(response.get("errors").is_some(), "{response:#}");

	let library = app
		.execute_gql_with_token(
			r#"mutation { scanLibrary(id: "library") }"#,
			None,
			&user.token,
		)
		.await;
	assert!(library.get("errors").is_some(), "{library:#}");
}

#[tokio::test]
async fn sharing_requires_permissions() {
	let app = TestApp::new_with_default_user().await;
	let user = setup(&app, vec![]).await;

	let response = app
		.execute_gql_with_token(
			UPDATE_SHARES,
			Some(json!({ "id": "shared", "userIds": [user.id] })),
			&user.token,
		)
		.await;
	assert!(response.get("errors").is_some(), "{response:#}");
}

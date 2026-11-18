use crate::common::{TestApp, account::CreateTestUser};
use models::entity::library_access;
use sea_orm::{ColumnTrait, EntityTrait, PaginatorTrait, QueryFilter};
use serde_json::json;

const CREATE_LIBRARY: &str = r#"
mutation CreateLibrary($input: CreateOrUpdateLibraryInput!) {
    createLibrary(input: $input) { id }
}
"#;

async fn has_access(app: &TestApp, user_id: &str, library_id: &str) -> bool {
	library_access::Entity::find()
		.filter(library_access::Column::UserId.eq(user_id))
		.filter(library_access::Column::LibraryId.eq(library_id))
		.count(app.conn())
		.await
		.expect("failed to count access")
		> 0
}

async fn create_library(
	app: &TestApp,
	path: &str,
	oidc_groups: serde_json::Value,
) -> String {
	let response = app
		.execute_gql(
			CREATE_LIBRARY,
			Some(json!({ "input": {
				"name": "OIDC Library",
				"path": path,
				"scanAfterPersist": false,
				"oidcGroups": oidc_groups,
			}})),
		)
		.await;
	assert!(
		response.get("errors").is_none(),
		"should have worked, got: {response:#}"
	);
	response["data"]["createLibrary"]["id"]
		.as_str()
		.expect("createLibrary returned no id")
		.to_string()
}

/// creating a group-managed library grants matching OIDC users access immediately
#[tokio::test]
async fn test_create_library_syncs_oidc_access() {
	let app = TestApp::new_with_default_user().await;
	let creator_id = app.get_viewer_id().await;
	let dir = tempfile::tempdir().expect("failed to create temp dir");

	let member = CreateTestUser {
		username: "oidc-access".to_string(),
		oidc_groups: Some(vec!["readers".to_string(), "some-other-group".to_string()]),
		..Default::default()
	}
	.insert(&app)
	.await;
	let outsider = CreateTestUser {
		username: "oidc-no-access".to_string(),
		oidc_groups: Some(vec!["some-other-group".to_string()]),
		..Default::default()
	}
	.insert(&app)
	.await;

	let library_id =
		create_library(&app, dir.path().to_str().unwrap(), json!(["readers"])).await;

	assert!(has_access(&app, &member.id, &library_id).await);
	assert!(!has_access(&app, &outsider.id, &library_id).await);
	assert!(has_access(&app, &creator_id, &library_id).await);
}
// ^ note this is kinda two tests:
// - oidc sync -> users in group has access
// - creator has access even if not in group

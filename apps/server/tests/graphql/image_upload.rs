use axum_test::multipart::{MultipartForm, Part};
use models::shared::enums::UserPermission;
use serde_json::{Value, json};

use crate::common::{TestApp, account::CreateTestUser, assert::assert_forbidden};

const UPLOAD_EMOJI: &str = r#"mutation UploadEmoji($input: CreateCustomEmojiInput!, $upload: Upload!) {
	uploadCustomEmoji(input: $input, upload: $upload) { id }
}"#;
const UPLOAD_AVATAR: &str = r#"mutation UploadAvatar($upload: Upload!) {
	uploadUserAvatar(upload: $upload) { id }
}"#;
const UPLOAD_OTHER_USER_AVATAR: &str = r#"mutation UploadAvatar($id: ID!, $upload: Upload!) {
	uploadUserAvatar(id: $id, upload: $upload) { id }
}"#;

const HTML_PAYLOAD: &[u8] =
	b"<html><body><script>alert(document.cookie)</script></body></html>";

fn form(operations: Value, var_path: &str, file_name: &str, mime: &str) -> MultipartForm {
	MultipartForm::new()
		.add_part(
			"operations",
			Part::text(operations.to_string()).mime_type("application/json"),
		)
		.add_part(
			"map",
			Part::text(json!({ "0": [var_path] }).to_string())
				.mime_type("application/json"),
		)
		.add_part(
			"0",
			Part::bytes(HTML_PAYLOAD.to_vec())
				.file_name(file_name)
				.mime_type(mime),
		)
}

async fn post(app: &TestApp, token: &str, form: MultipartForm) -> Value {
	let response = app
		.server
		.post("/api/graphql")
		.add_header("Authorization", format!("Bearer {token}"))
		.multipart(form)
		.await;
	response.assert_status_ok();
	response.json()
}

async fn uploader_token(app: &TestApp) -> String {
	CreateTestUser {
		username: "oromei".to_string(),
		permissions: vec![UserPermission::UploadFile],
		..Default::default()
	}
	.insert(app)
	.await
	.token
}

/// a user without ManageServer cannot upload/replace a user's avatar if they have ManageServer
#[tokio::test]
async fn test_non_admin_cannot_upload_avatar_for_admin() {
	let app = TestApp::new_with_default_user().await;

	let manager = CreateTestUser {
		username: "manager".to_string(),
		permissions: vec![
			UserPermission::ManageUsers,
			UserPermission::UploadFile,
			UserPermission::ChangeAvatar,
		],
		..Default::default()
	}
	.insert(&app)
	.await;
	let admin = CreateTestUser {
		username: "server-admin".to_string(),
		permissions: vec![UserPermission::ManageServer],
		..Default::default()
	}
	.insert(&app)
	.await;

	let operations = json!({
		"query": UPLOAD_OTHER_USER_AVATAR,
		"variables": { "id": admin.id, "upload": null }
	});
	let response = post(
		&app,
		&manager.token,
		form(operations, "variables.upload", "avatar.png", "image/png"),
	)
	.await;
	assert_forbidden(&response);
}

/// html should be rejected for emoji uploads
#[tokio::test]
async fn test_upload_emoji_rejects_html_disguised_as_image() {
	let app = TestApp::new_with_default_user().await;
	let token = uploader_token(&app).await;

	for (file_name, mime) in [
		("definitelysafe.html", "text/html"),
		("definitelysafe.png", "image/png"),
	] {
		let operations = json!({
			"query": UPLOAD_EMOJI,
			"variables": {
				"input": { "name": format!("{file_name}"), "isAnimated": false },
				"upload": null
			}
		});
		let response = post(
			&app,
			&token,
			form(operations, "variables.upload", file_name, mime),
		)
		.await;

		assert!(
			response.get("errors").is_some(),
			"{file_name} ({mime}) should be rejected: {response:#}"
		);
	}

	let emojis = app.execute_gql("query { customEmojis { id } }", None).await;
	let count = emojis["data"]["customEmojis"]
		.as_array()
		.map(Vec::len)
		.unwrap_or(0);
	assert_eq!(count, 0, "no emoji records should have been created");
}

/// html should be rejected for user avatar uploads
#[tokio::test]
async fn test_upload_avatar_rejects_html_disguised_as_image() {
	let app = TestApp::new_with_default_user().await;
	let token = uploader_token(&app).await;

	for (file_name, mime) in [
		("definitelysafe.html", "text/html"),
		("definitelysafe.png", "image/png"),
	] {
		let operations = json!({
			"query": UPLOAD_AVATAR,
			"variables": { "upload": null }
		});
		let response = post(
			&app,
			&token,
			form(operations, "variables.upload", file_name, mime),
		)
		.await;

		assert!(
			response.get("errors").is_some(),
			"{file_name} ({mime}) should be rejected: {response:#}"
		);
	}
}

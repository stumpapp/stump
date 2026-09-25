use async_graphql::InputType;
use graphql::input::user::AgeRestrictionInput;
use models::shared::enums::UserPermission;
use serde_json::{json, Value};

use super::TestApp;

pub struct TestUser {
	pub id: String,
	pub username: String,
	pub token: String,
}

pub struct CreateTestUser {
	pub username: String,
	pub password: String,
	pub permissions: Vec<UserPermission>,
	pub age_restriction: Option<AgeRestrictionInput>,
}

impl Default for CreateTestUser {
	fn default() -> Self {
		Self {
			username: "testuser".to_string(),
			password: "password".to_string(),
			permissions: vec![],
			age_restriction: None,
		}
	}
}

impl CreateTestUser {
	/// create the user via the server-owner token stored in `app`, log them
	/// in, and return a [`TestUser`]
	pub async fn insert(&self, app: &TestApp) -> TestUser {
		let perm_values: Vec<Value> = self.permissions.iter().map(|p| json!(p)).collect();

		let mut input = json!({
			"username": self.username,
			"password": self.password,
			"permissions": perm_values,
		});
		if let Some(ar) = &self.age_restriction {
			input["ageRestriction"] =
				ar.to_value().into_json().expect("should convert into json")
		}

		let response = app
			.execute_gql(
				r#"mutation CreateTestUser($input: CreateUserInput!) {
                    createUser(input: $input) { id }
                }"#,
				Some(json!({ "input": input })),
			)
			.await;
		assert!(
			response.get("errors").is_none(),
			"createUser failed: {response:#}"
		);

		let id = response["data"]["createUser"]["id"]
			.as_str()
			.expect("createUser returned no id")
			.to_string();

		let token = app.login_as(&self.username, &self.password).await;

		TestUser {
			id,
			username: self.username.clone(),
			token,
		}
	}
}

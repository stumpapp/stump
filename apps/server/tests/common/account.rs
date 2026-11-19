use async_graphql::InputType;
use graphql::input::user::AgeRestrictionInput;
use models::{entity::user, shared::enums::UserPermission};
use sea_orm::{ColumnTrait, EntityTrait, QueryFilter, sea_query::Expr};
use serde_json::{Value, json};

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
	pub oidc_groups: Option<Vec<String>>,
}

impl Default for CreateTestUser {
	fn default() -> Self {
		Self {
			username: "testuser".to_string(),
			password: "password".to_string(),
			permissions: vec![],
			age_restriction: None,
			oidc_groups: None,
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

		// update user doesn't expose oidc groups, so for now just manually edit
		// there is separate mutation for that
		if let Some(groups) = &self.oidc_groups {
			user::Entity::update_many()
				.filter(user::Column::Id.eq(id.clone()))
				.col_expr(user::Column::OidcGroups, Expr::value(groups.join(",")))
				.exec(app.conn())
				.await
				.expect("should have updated groups");
		}

		let token = app.login_as(&self.username, &self.password).await;

		TestUser {
			id,
			username: self.username.clone(),
			token,
		}
	}
}

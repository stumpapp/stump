use rocket::serde::{Deserialize, Serialize};
use rocket_okapi::JsonSchema;
use stump_core::{prisma::user, types::user::UserPreferences};

#[derive(Clone, Debug, Serialize, Deserialize, JsonSchema)]

pub struct AuthenticatedUser {
	pub id: String,
	pub username: String,
	pub role: String,
	pub user_preferences: UserPreferences,
}

impl Into<AuthenticatedUser> for user::Data {
	fn into(self) -> AuthenticatedUser {
		let user_preferences = match self
			.user_preferences()
			.expect("Failed to load user preferences")
		{
			Some(preferences) => preferences.to_owned(),
			None => unreachable!(
				"User does not have preferences. This should not be reachable."
			),
		};

		AuthenticatedUser {
			id: self.id.clone(),
			username: self.username.clone(),
			role: self.role.clone(),
			user_preferences: user_preferences.into(),
		}
	}
}

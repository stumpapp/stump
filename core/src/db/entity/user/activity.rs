use serde::{Deserialize, Serialize};
use specta::Type;
use utoipa::ToSchema;

use crate::prisma;

use super::User;

#[derive(Debug, Clone, Serialize, Deserialize, Type, ToSchema)]
pub struct LoginActivity {
	pub id: String,
	pub ip_address: String,
	pub user_agent: String,
	pub authentication_successful: bool,
	pub timestamp: String,

	#[serde(skip_serializing_if = "Option::is_none")]
	pub user: Option<User>,
}

impl From<prisma::user_login_activity::Data> for LoginActivity {
	fn from(data: prisma::user_login_activity::Data) -> LoginActivity {
		let user = data.user().cloned().map(User::from).ok();
		LoginActivity {
			id: data.id,
			authentication_successful: data.authentication_successful,
			ip_address: data.ip_address,
			timestamp: data.timestamp.to_rfc3339(),
			user_agent: data.user_agent,
			user,
		}
	}
}

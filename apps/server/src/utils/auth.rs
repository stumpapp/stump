use stump_core::db::entity::{User, UserPermission};
use tower_sessions::Session;

use crate::{
	config::session::SESSION_USER_KEY,
	errors::{ApiError, ApiResult, AuthError},
};

#[derive(Debug)]
pub struct DecodedCredentials {
	pub username: String,
	pub password: String,
}

pub fn get_hash_cost() -> u32 {
	std::env::var("HASH_COST")
		.unwrap_or_else(|_e| "12".to_string())
		.parse()
		.unwrap_or(12)
}

pub fn verify_password(hash: &str, password: &str) -> Result<bool, AuthError> {
	Ok(bcrypt::verify(password, hash)?)
}

pub fn decode_base64_credentials(
	bytes: Vec<u8>,
) -> Result<DecodedCredentials, AuthError> {
	let decoded = String::from_utf8(bytes).map_err(|_| AuthError::BadCredentials)?;

	let username = decoded.split(':').next().unwrap_or("").to_string();
	let password = decoded.split(':').nth(1).unwrap_or("").to_string();

	if username.is_empty() || password.is_empty() {
		return Err(AuthError::BadCredentials);
	}

	Ok(DecodedCredentials { username, password })
}

pub fn get_session_user(session: &Session) -> ApiResult<User> {
	if let Some(user) = session.get::<User>(SESSION_USER_KEY)? {
		Ok(user)
	} else {
		Err(ApiError::Unauthorized)
	}
}

pub fn get_session_server_owner_user(session: &Session) -> ApiResult<User> {
	let user = get_session_user(session)?;

	if user.is_server_owner {
		Ok(user)
	} else {
		Err(ApiError::Forbidden(
			"You do not have permission to access this resource.".to_string(),
		))
	}
}

fn user_has_permission(user: &User, permission: UserPermission) -> bool {
	user.is_server_owner || user.permissions.iter().any(|p| p == &permission)
}

/// Enforce that the user has the given permission. If the user does not have the permission, an
/// `ApiError::Forbidden` is returned.
fn enforce_permission(user: &User, permission: UserPermission) -> ApiResult<()> {
	if user_has_permission(user, permission) {
		Ok(())
	} else {
		Err(ApiError::Forbidden(
			"You do not have permission to access this resource.".to_string(),
		))
	}
}

/// Enforce that the user in the session has the given permission. If the user does not have the
/// permission, an `ApiError::Forbidden` is returned.
pub fn enforce_session_permission(
	session: &Session,
	permission: UserPermission,
) -> ApiResult<()> {
	let user = get_session_user(session)?;
	enforce_permission(&user, permission)
}

/// Enforce that the user in the session has the given permission. If the user does not have the
/// permission, an `ApiError::Forbidden` is returned. The user is returned if they have the
/// permission.
pub fn get_user_and_enforce_permission(
	session: &Session,
	permission: UserPermission,
) -> ApiResult<User> {
	let user = get_session_user(session)?;
	enforce_permission(&user, permission)?;
	Ok(user)
}

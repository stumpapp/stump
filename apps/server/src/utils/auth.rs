use stump_core::db::entity::{User, UserPermission};
use tower_sessions::Session;

use crate::{
	config::session::SESSION_USER_KEY,
	errors::{APIError, APIResult, AuthError},
};

#[derive(Debug)]
pub struct DecodedCredentials {
	pub username: String,
	pub password: String,
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

pub fn get_session_user(session: &Session) -> APIResult<User> {
	if let Some(user) = session.get::<User>(SESSION_USER_KEY)? {
		Ok(user)
	} else {
		Err(APIError::Unauthorized)
	}
}

pub fn get_session_server_owner_user(session: &Session) -> APIResult<User> {
	let user = get_session_user(session)?;

	if user.is_server_owner {
		Ok(user)
	} else {
		Err(APIError::Forbidden(
			"You do not have permission to access this resource.".to_string(),
		))
	}
}

fn user_has_permission(user: &User, permission: UserPermission) -> bool {
	user.is_server_owner || user.permissions.iter().any(|p| p == &permission)
}

/// Enforce that the user has the given permission. If the user does not have the permission, an
/// `APIError::Forbidden` is returned.
fn enforce_permission(user: &User, permission: UserPermission) -> APIResult<()> {
	if user_has_permission(user, permission) {
		Ok(())
	} else {
		tracing::error!(?user, ?permission, "User does not have permission");
		Err(APIError::Forbidden(
			"You do not have permission to access this resource.".to_string(),
		))
	}
}

/// Enforce that the user in the session has the given permission. If the user does not have the
/// permission, an `APIError::Forbidden` is returned.
pub fn enforce_session_permission(
	session: &Session,
	permission: UserPermission,
) -> APIResult<()> {
	let user = get_session_user(session)?;
	enforce_permission(&user, permission)
}

pub fn enforce_session_permissions(
	session: &Session,
	permissions: &[UserPermission],
) -> APIResult<User> {
	let user = get_session_user(session)?;

	if user.is_server_owner {
		return Ok(user);
	}

	let missing_permissions = permissions
		.iter()
		.filter(|&permission| !user_has_permission(&user, *permission))
		.collect::<Vec<_>>();

	if !missing_permissions.is_empty() {
		tracing::error!(?user, ?missing_permissions, "User does not have permission");
		Err(APIError::Forbidden(
			"You do not have permission to access this resource.".to_string(),
		))
	} else {
		Ok(user)
	}
}

/// Enforce that the user in the session has the given permission. If the user does not have the
/// permission, an `APIError::Forbidden` is returned. The user is returned if they have the
/// permission.
pub fn get_user_and_enforce_permission(
	session: &Session,
	permission: UserPermission,
) -> APIResult<User> {
	let user = get_session_user(session)?;
	enforce_permission(&user, permission)?;
	Ok(user)
}

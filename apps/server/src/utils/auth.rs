use stump_core::db::entity::{User, UserPermission};
use tower_sessions::Session;

use crate::{
	config::session::SESSION_USER_KEY,
	errors::{APIResult, AuthError},
};

/// A struct to represent the decoded username and (plaintext) password from a base64-encoded
/// string
#[derive(Debug)]
pub struct DecodedCredentials {
	pub username: String,
	pub password: String,
}

/// Verify a password against a hash using the bcrypt algorithm
pub fn verify_password(hash: &str, password: &str) -> Result<bool, AuthError> {
	Ok(bcrypt::verify(password, hash)?)
}

// TODO(axum-upgrade): rebase with develop to get relevant fixes for this
/// Decode a base64-encoded string into a username and password pair
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

pub async fn get_session_user(session: &Session) -> APIResult<Option<User>> {
	Ok(session.get::<User>(SESSION_USER_KEY).await?)
}

/// A function to determine whether a user has a specific permission. The permission
/// is checked against their explicitly assigned permissions, as well as any inherited
/// ones through permission associations.
fn user_has_permission(user: &User, permission: UserPermission) -> bool {
	user.is_server_owner
		|| user
			.permissions
			.iter()
			.any(|p| p == &permission || p.associated().contains(&permission))
}

pub fn user_has_all_permissions(user: &User, permissions: &[UserPermission]) -> bool {
	if user.is_server_owner {
		return true;
	}

	let missing_permissions = permissions
		.iter()
		.filter(|&permission| !user_has_permission(user, *permission))
		.collect::<Vec<_>>();
	if !missing_permissions.is_empty() {
		tracing::error!(?user, ?missing_permissions, "User does not have permission");
	}

	missing_permissions.is_empty()
}

#[cfg(test)]
mod tests {
	use super::*;

	#[test]
	fn test_associated_permissions() {
		let user = User {
			permissions: vec![
				UserPermission::CreateLibrary,
				UserPermission::ManageNotifier,
			],
			..Default::default()
		};

		let expected_can_do = vec![
			UserPermission::EditLibrary,
			UserPermission::ScanLibrary,
			UserPermission::ReadNotifier,
			UserPermission::CreateNotifier,
			UserPermission::DeleteNotifier,
		];

		assert!(user_has_all_permissions(&user, &expected_can_do));
	}
}

use stump_core::{
	config::StumpConfig,
	db::entity::{User, UserPermission},
};
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

pub fn hash_password(password: &str, config: &StumpConfig) -> Result<String, AuthError> {
	Ok(bcrypt::hash(password, config.password_hash_cost)?)
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

	match decoded.split_once(':') {
		Some((username, password)) => {
			if username.is_empty() || password.is_empty() {
				Err(AuthError::BadCredentials)
			} else {
				Ok(DecodedCredentials {
					username: username.to_string(),
					password: password.to_string(),
				})
			}
		},
		None => Err(AuthError::BadCredentials),
	}
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
	fn test_verify_password() {
		let hash = bcrypt::hash("password", bcrypt::DEFAULT_COST).unwrap();
		assert!(verify_password(&hash, "password").unwrap());
	}

	// TODO(axum-upgrade): Fix all of these tests
	// #[test]
	// fn test_get_session_user_no_user() {
	// 	let session = Session::default();
	// 	let result = get_session_user(&session);
	// 	assert!(result.is_err());
	// }

	// #[test]
	// fn test_get_session_user_with_user() {
	// 	let session = Session::default();
	// 	let session_user = User {
	// 		username: "oromei".to_string(),
	// 		..Default::default()
	// 	};
	// 	session
	// 		.insert(SESSION_USER_KEY, session_user.clone())
	// 		.expect("Failed to insert user into session");
	// 	let loaded_user = get_session_user(&session).expect("Failed to get session user");
	// 	assert_eq!(loaded_user.username, session_user.username);
	// }

	#[test]
	fn test_decode_64_credentials_with_colon_in_password() {
		let testcreds = decode_base64_credentials("username:pass:$%^word".into());
		assert_eq!(testcreds.unwrap().password, String::from("pass:$%^word"));
	}

	#[test]
	fn test_decode_64_credentials_32_chars_password() {
		let testcreds =
			decode_base64_credentials("username:wp*r@hj!1b:o4sZ#5TdvyzBd$n-bqaPi".into());
		assert_eq!(
			testcreds.unwrap().password,
			String::from("wp*r@hj!1b:o4sZ#5TdvyzBd$n-bqaPi")
		);
	}

	#[test]
	fn test_decode_64_credentials_64_chars_password() {
		let testcreds = decode_base64_credentials(
			"username:wp*r@hj!1b:o4sZ#5TdvyzBd$n-bqaPiwp*r@hj!1b:o4sZ#5TdvyzBd$n-bqaPi"
				.into(),
		);
		assert_eq!(
			testcreds.unwrap().password,
			String::from(
				"wp*r@hj!1b:o4sZ#5TdvyzBd$n-bqaPiwp*r@hj!1b:o4sZ#5TdvyzBd$n-bqaPi"
			)
		);
	}

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

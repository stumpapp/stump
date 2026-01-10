use models::entity::user::{AuthUser, LoginUser};
use sea_orm::DatabaseConnection;
use stump_core::config::StumpConfig;
use tower_sessions::Session;

use crate::{
	config::session::SESSION_USER_KEY,
	errors::{APIError, AuthError},
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

pub async fn fetch_session_user(
	session: &Session,
	conn: &DatabaseConnection,
) -> Result<Option<AuthUser>, APIError> {
	if let Some(user_id) = session.get::<String>(SESSION_USER_KEY).await? {
		let user = LoginUser::find_by_id(user_id)
			.into_model::<LoginUser>()
			.one(conn)
			.await?
			.ok_or(APIError::Unauthorized)?;

		if user.is_locked {
			return Err(APIError::AccountLocked);
		}

		Ok(Some(user.into()))
	} else {
		tracing::debug!("No user found in session");
		Ok(None)
	}
}

#[cfg(test)]
mod tests {
	use super::*;

	#[test]
	fn test_verify_password() {
		let hash = bcrypt::hash("password", bcrypt::DEFAULT_COST).unwrap();
		assert!(verify_password(&hash, "password").unwrap());
	}

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
}

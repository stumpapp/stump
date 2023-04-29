use axum_sessions::extractors::{ReadableSession, WritableSession};
use stump_core::{db::entity::User, prelude::DecodedCredentials};

use crate::errors::{ApiError, ApiResult, AuthError};

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

pub fn get_session_user(session: &ReadableSession) -> ApiResult<User> {
	if let Some(user) = session.get::<User>("user") {
		Ok(user)
	} else {
		Err(ApiError::Unauthorized)
	}
}

pub fn get_writable_session_user(session: &WritableSession) -> ApiResult<User> {
	if let Some(user) = session.get::<User>("user") {
		Ok(user)
	} else {
		Err(ApiError::Unauthorized)
	}
}

// pub fn get_writable_session_admin_user(session: &WritableSession) -> ApiResult<User> {
// 	let user = get_writable_session_user(session)?;

// 	if user.is_admin() {
// 		Ok(user)
// 	} else {
// 		Err(ApiError::Forbidden(
// 			"You do not have permission to access this resource.".to_string(),
// 		))
// 	}
// }

pub fn get_session_admin_user(session: &ReadableSession) -> ApiResult<User> {
	let user = get_session_user(session)?;

	if user.is_admin() {
		Ok(user)
	} else {
		Err(ApiError::Forbidden(
			"You do not have permission to access this resource.".to_string(),
		))
	}
}

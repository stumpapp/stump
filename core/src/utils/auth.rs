use crate::types::{errors::AuthError, models::DecodedCredentials};

pub fn get_hash_cost() -> u32 {
	std::env::var("HASH_COST")
		.unwrap_or("12".to_string())
		.parse()
		.unwrap_or(12)
}

pub fn verify_password(hash: &str, password: &str) -> Result<bool, AuthError> {
	Ok(bcrypt::verify(password, hash)?)
}

pub fn decode_base64_credentials(
	bytes: Vec<u8>,
) -> Result<DecodedCredentials, AuthError> {
	let decoded = String::from_utf8(bytes).unwrap_or("".to_string());

	let username = decoded.split(":").next().unwrap_or("").to_string();
	let password = decoded.split(":").skip(1).next().unwrap_or("").to_string();

	if username.is_empty() || password.is_empty() {
		return Err(AuthError::BadCredentials);
	}

	Ok(DecodedCredentials { username, password })
}

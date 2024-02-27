use simple_crypt::{decrypt, encrypt};

use crate::{config::StumpConfig, CoreError, CoreResult};

pub fn chain_optional_iter<T>(
	required: impl IntoIterator<Item = T>,
	optional: impl IntoIterator<Item = Option<T>>,
) -> Vec<T> {
	required
		.into_iter()
		.map(Some)
		.chain(optional)
		.flatten()
		.collect()
}

// TODO: consider unique errors for encryption/decryption

pub fn encrypt_string(str: &str) -> CoreResult<String> {
	let encryption_key = StumpConfig::get_encryption_key();
	let encrypted_bytes = encrypt(
		str.as_bytes(),
		encryption_key
			.ok_or(CoreError::EncryptionKeyNotSet)?
			.as_bytes(),
	)
	.map_err(|e| CoreError::InternalError(e.to_string()))?;
	String::from_utf8(encrypted_bytes)
		.map_err(|e| CoreError::InternalError(e.to_string()))
}

pub fn decrypt_string(encrypted_str: &str) -> CoreResult<String> {
	let encryption_key = StumpConfig::get_encryption_key();
	let decrypted_bytes = decrypt(
		encrypted_str.as_bytes(),
		encryption_key
			.ok_or(CoreError::EncryptionKeyNotSet)?
			.as_bytes(),
	)
	.map_err(|e| CoreError::InternalError(e.to_string()))?;
	String::from_utf8(decrypted_bytes)
		.map_err(|e| CoreError::InternalError(e.to_string()))
}

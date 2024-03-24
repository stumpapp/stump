use simple_crypt::{decrypt, encrypt};

use crate::{CoreError, CoreResult, Ctx};

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

pub fn create_encryption_key() -> CoreResult<String> {
	let random_bytes = rand::random::<[u8; 32]>();

	Ok(data_encoding::BASE64.encode(&random_bytes))
}

pub async fn encrypt_string(str: &str, ctx: &Ctx) -> CoreResult<String> {
	let encryption_key = ctx.get_encryption_key().await?;
	let encrypted_bytes = encrypt(str.as_bytes(), encryption_key.as_bytes())
		.map_err(|e| CoreError::EncryptionFailed(e.to_string()))?;
	Ok(data_encoding::BASE64.encode(&encrypted_bytes))
}

pub async fn decrypt_string(encrypted_str: &str, ctx: &Ctx) -> CoreResult<String> {
	let encryption_key = ctx.get_encryption_key().await?;
	let encrypted_bytes = data_encoding::BASE64
		.decode(encrypted_str.as_bytes())
		.map_err(|e| CoreError::DecryptionFailed(e.to_string()))?;
	let decrypted_bytes = decrypt(&encrypted_bytes, encryption_key.as_bytes())
		.map_err(|e| CoreError::DecryptionFailed(e.to_string()))?;
	String::from_utf8(decrypted_bytes)
		.map_err(|e| CoreError::DecryptionFailed(e.to_string()))
}

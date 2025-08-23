use std::collections::HashMap;

use chrono::{DateTime, FixedOffset};
use keyring::Entry;
use serde::{Deserialize, Serialize};
use specta::Type;

const TOKEN_STORAGE: &str = "stump-desktop-operator-tokens";
const CREDENTIALS_STORAGE: &str = "stump-desktop-operator-credentials";

#[derive(Debug, Serialize, Deserialize)]
pub struct StoredUsernamePassword {
	pub username: String,
	pub password: String,
}

#[derive(Debug, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub enum StoredCredentials {
	Bearer(String),
	Basic(StoredUsernamePassword),
}

#[derive(Debug, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct JwtTokenPair {
	#[serde(alias = "accessToken")]
	pub access_token: String,
	#[serde(alias = "refreshToken")]
	pub refresh_token: Option<String>,
	#[serde(alias = "expiresAt")]
	pub expires_at: DateTime<FixedOffset>,
}

#[derive(Debug, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub enum StoredTokens {
	ApiKey(String),
	Jwt(JwtTokenPair),
}

#[derive(Debug, thiserror::Error)]
pub enum SecureStoreError {
	#[error("Keyring error: {0}")]
	KeyringError(#[from] keyring::Error),
	#[error("Entry missing")]
	EntryMissing,
	#[error("Invalid token pair: {0}")]
	InvalidTokenPair(#[from] serde_json::Error),
}

type ServerId = String;

#[derive(Default)]
pub struct SecureStore {
	token_records: HashMap<ServerId, Entry>,
	credentials_records: HashMap<ServerId, Entry>,
}

impl std::fmt::Debug for SecureStore {
	fn fmt(&self, f: &mut std::fmt::Formatter<'_>) -> std::fmt::Result {
		f.debug_struct("SecureStore")
			.field("records", &self.token_records.keys().collect::<Vec<_>>())
			.finish()
	}
}

#[derive(Debug, Serialize, Deserialize, Type)]
pub struct CredentialStoreTokenState(HashMap<ServerId, bool>);

// TODO: it would be nice to manage refreshes as well as expiration times?

/// A secure store for API tokens **scoped to a user**. This store allows for managing multiple tokens
/// for different servers, however they are all assumed to be for the same user. When the frontend logs a user
/// out, the store should be reinitialized via [`SecureStore::init`] once reauthenticated.
impl SecureStore {
	/// Create a new entry in the store for the given server. This should be called once the servers are loaded
	/// If a server did not exist before this store was initialized, it should be added via this function to ensure
	/// the store is up to date. If that step is skipped, the store will continue throwing [`SecureStoreError::EntryMissing`]
	/// until the entry is created.
	pub fn create_entry(&mut self, server: ServerId) -> Result<(), SecureStoreError> {
		let entry = Entry::new_with_target("user", &server, TOKEN_STORAGE)?;
		self.token_records.insert(server.clone(), entry);
		self.credentials_records.insert(
			server.clone(),
			Entry::new_with_target("user", &server, CREDENTIALS_STORAGE)?,
		);
		Ok(())
	}

	/// Initialize the store with entries for the given servers. This should be called each time a user logs in
	pub fn init(servers: Vec<String>) -> Result<Self, SecureStoreError> {
		let mut store = SecureStore::default();
		for server in servers {
			store.create_entry(server)?;
		}
		Ok(store)
	}

	/// Clear all entries from the store, effectively logging the user out
	pub fn clear(&mut self) {
		self.token_records.clear();
	}

	/// Replace the store with a new one (e.g. after reauthenticating)
	pub fn replace(&mut self, new_store: SecureStore) {
		self.token_records = new_store.token_records;
		self.credentials_records = new_store.credentials_records;
	}

	/// Return a record which indicates servers with/without tokens
	pub fn get_login_state(&self) -> CredentialStoreTokenState {
		CredentialStoreTokenState(
			self.token_records
				.iter()
				.map(|(server, entry)| {
					let has_token = entry.get_password().is_ok();
					(server.clone(), has_token)
				})
				.collect(),
		)
	}

	pub fn get_credentials(
		&self,
		server: ServerId,
	) -> Result<Option<StoredCredentials>, SecureStoreError> {
		let entry = self
			.credentials_records
			.get(&server)
			.ok_or(SecureStoreError::EntryMissing)?;

		let encoded_str = match entry.get_password() {
			Ok(password) => password,
			Err(keyring::Error::NoEntry) => return Ok(None),
			Err(e) => return Err(e.into()),
		};

		let decoded: StoredCredentials = serde_json::from_str(&encoded_str)?;

		Ok(Some(decoded))
	}

	pub fn set_credentials(
		&self,
		server: ServerId,
		credentials: StoredCredentials,
	) -> Result<(), SecureStoreError> {
		let entry = self
			.credentials_records
			.get(&server)
			.ok_or(SecureStoreError::EntryMissing)?;
		let encoded_str = serde_json::to_string(&credentials)?;
		entry.set_password(&encoded_str)?;
		Ok(())
	}

	pub fn delete_credentials(&self, server: ServerId) -> Result<bool, SecureStoreError> {
		let entry = self
			.credentials_records
			.get(&server)
			.ok_or(SecureStoreError::EntryMissing)?;
		match entry.delete_credential() {
			Ok(_) => Ok(true),
			Err(keyring::Error::NoEntry) => Ok(false),
			Err(e) => Err(e.into()),
		}
	}

	/// Get the tokens for the given server, if it exists
	pub fn get_tokens(
		&self,
		server: ServerId,
	) -> Result<Option<StoredTokens>, SecureStoreError> {
		let entry = self
			.token_records
			.get(&server)
			.ok_or(SecureStoreError::EntryMissing)?;

		let encoded_str = match entry.get_password() {
			Ok(token) => token,
			Err(keyring::Error::NoEntry) => return Ok(None),
			Err(e) => return Err(e.into()),
		};

		let decoded: StoredTokens = serde_json::from_str(&encoded_str)?;

		Ok(Some(decoded))
	}

	/// Set the API token for the given server
	pub fn set_tokens(
		&self,
		server: ServerId,
		tokens: StoredTokens,
	) -> Result<(), SecureStoreError> {
		let entry = self
			.token_records
			.get(&server)
			.ok_or(SecureStoreError::EntryMissing)?;
		let encoded_str = serde_json::to_string(&tokens)?;
		entry.set_password(&encoded_str)?;
		Ok(())
	}

	/// Delete the API token for the given server
	pub fn delete_tokens(&self, server: ServerId) -> Result<bool, SecureStoreError> {
		let entry = self
			.token_records
			.get(&server)
			.ok_or(SecureStoreError::EntryMissing)?;
		match entry.delete_credential() {
			Ok(_) => Ok(true),
			Err(keyring::Error::NoEntry) => Ok(false),
			Err(e) => Err(e.into()),
		}
	}
}

// NOTE: The following tests are ignored because they require a running keyring service / daemon
// which is not available in CI right now. These tests are important and should be fixed in the future.

#[cfg(test)]
mod tests {
	use chrono::Utc;

	use super::*;

	#[ignore]
	#[test]
	fn test_get_tokens_none() {
		let store = SecureStore::init(vec!["homeserver".to_string()])
			.expect("Failed to init store");

		let tokens = store
			.get_tokens("homeserver".to_string())
			.expect("Failed to get tokens");

		assert!(tokens.is_none());
	}

	#[ignore]
	#[test]
	fn test_get_tokens_some() {
		let store = SecureStore::init(vec!["homeserver".to_string()])
			.expect("Failed to init store");

		// Update the entry with a token
		store
			.set_tokens(
				"homeserver".to_string(),
				JwtTokenPair {
					access_token: "definitely-real-token".to_string(),
					refresh_token: Some("definitely-real-refresh-token".to_string()),
					expires_at: (Utc::now() + chrono::Duration::days(1)).into(),
				},
			)
			.expect("Failed to set token");

		// Get the token (should be Some now)
		let tokens = store
			.get_tokens("homeserver".to_string())
			.expect("Failed to get token")
			.expect("Token missing");

		assert_eq!(tokens.access_token, "definitely-real-token");
		assert_eq!(
			tokens.refresh_token,
			Some("definitely-real-refresh-token".to_string())
		);
	}

	#[ignore]
	#[test]
	fn test_delete_api_token() {
		let store = SecureStore::init(vec!["homeserver".to_string()])
			.expect("Failed to init store");
		// Update the entry with a token
		store
			.set_tokens(
				"homeserver".to_string(),
				JwtTokenPair {
					access_token: "definitely-real-token".to_string(),
					refresh_token: Some("definitely-real-refresh-token".to_string()),
					expires_at: (Utc::now() + chrono::Duration::days(1)).into(),
				},
			)
			.expect("Failed to set token");
		// Delete the token
		store
			.delete_tokens("homeserver".to_string())
			.expect("Failed to delete token");

		// Get the token (should be None now)
		let token = store
			.get_tokens("homeserver".to_string())
			.expect("Failed to get token");

		assert!(token.is_none());
	}

	#[ignore]
	#[test]
	fn test_replace() {
		let mut store = SecureStore::init(vec!["homeserver".to_string()])
			.expect("Failed to init store");
		// Update the entry with a token
		store
			.set_tokens(
				"homeserver".to_string(),
				JwtTokenPair {
					access_token: "definitely-real-token".to_string(),
					refresh_token: Some("definitely-real-refresh-token".to_string()),
					expires_at: (Utc::now() + chrono::Duration::days(1)).into(),
				},
			)
			.expect("Failed to set token");

		let new_store = SecureStore::init(vec!["homeserver".to_string()])
			.expect("Failed to init store");
		// Update the entry with a token
		new_store
			.set_tokens(
				"homeserver".to_string(),
				JwtTokenPair {
					access_token: "new-definitely-real-token".to_string(),
					refresh_token: Some("new-definitely-real-refresh-token".to_string()),
					expires_at: (Utc::now() + chrono::Duration::days(1)).into(),
				},
			)
			.expect("Failed to set token");

		store.replace(new_store);

		let tokens = store
			.get_tokens("homeserver".to_string())
			.expect("Failed to get token")
			.expect("Token missing");

		assert_eq!(tokens.access_token, "new-definitely-real-token");
		assert_eq!(
			tokens.refresh_token,
			Some("new-definitely-real-refresh-token".to_string())
		);
	}

	#[ignore]
	#[test]
	fn test_create_entry() {
		let mut store = SecureStore::default();
		assert!(store.records.is_empty());

		store
			.create_entry("homeserver".to_string())
			.expect("Failed to create entry");

		assert_eq!(store.records.len(), 1);
	}

	#[ignore]
	#[test]
	fn test_clear() {
		let mut store = SecureStore::default();
		store
			.create_entry("homeserver".to_string())
			.expect("Failed to create entry");

		store.clear();

		assert!(store.records.is_empty());
	}

	#[ignore]
	#[test]
	fn test_init() {
		let store = SecureStore::init(vec!["homeserver".to_string()])
			.expect("Failed to init store");

		assert_eq!(store.records.len(), 1);
	}
}

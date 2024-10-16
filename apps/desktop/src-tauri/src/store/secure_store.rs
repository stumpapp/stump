use std::collections::HashMap;

use keyring::Entry;
use serde::{Deserialize, Serialize};
use specta::Type;

const STORAGE_USER: &str = "stump-desktop-operator";

#[derive(Debug, thiserror::Error)]
pub enum SecureStoreError {
	#[error("Keyring error: {0}")]
	KeyringError(#[from] keyring::Error),
	#[error("Entry missing")]
	EntryMissing,
}

type ServerName = String;

#[derive(Default)]
pub struct SecureStore {
	records: HashMap<ServerName, Entry>,
}

impl std::fmt::Debug for SecureStore {
	fn fmt(&self, f: &mut std::fmt::Formatter<'_>) -> std::fmt::Result {
		f.debug_struct("SecureStore")
			.field("records", &self.records.keys().collect::<Vec<_>>())
			.finish()
	}
}

#[derive(Debug, Serialize, Deserialize, Type)]
pub struct CredentialStoreTokenState(HashMap<ServerName, bool>);

// TODO: it would be nice to manage refreshes as well as expiration times?

/// A secure store for API tokens **scoped to a user**. This store allows for managing multiple tokens
/// for different servers, however they are all assumed to be for the same user. When the frontend logs a user
/// out, the store should be reinitialized via [`SecureStore::init`] once reauthenticated.
impl SecureStore {
	/// Create a new entry in the store for the given server. This should be called once the servers are loaded
	/// If a server did not exist before this store was initialized, it should be added via this function to ensure
	/// the store is up to date. If that step is skipped, the store will continue throwing [`SecureStoreError::EntryMissing`]
	/// until the entry is created.
	pub fn create_entry(&mut self, server: ServerName) -> Result<(), SecureStoreError> {
		let entry = Entry::new_with_target("user", &server, STORAGE_USER)?;
		self.records.insert(server.clone(), entry);
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
		self.records.clear();
	}

	/// Replace the store with a new one (e.g. after reauthenticating)
	pub fn replace(&mut self, new_store: SecureStore) {
		self.records = new_store.records;
	}

	/// Return a record which indicates servers with/without tokens
	pub fn get_login_state(&self) -> CredentialStoreTokenState {
		CredentialStoreTokenState(
			self.records
				.iter()
				.map(|(server, entry)| {
					let has_token = entry.get_password().is_ok();
					(server.clone(), has_token)
				})
				.collect(),
		)
	}

	/// Get the API token for the given server, if it exists
	pub fn get_api_token(
		&self,
		server: ServerName,
	) -> Result<Option<String>, SecureStoreError> {
		let entry = self
			.records
			.get(&server)
			.ok_or(SecureStoreError::EntryMissing)?;
		match entry.get_password() {
			Ok(token) => Ok(Some(token)),
			Err(keyring::Error::NoEntry) => Ok(None),
			Err(e) => Err(e.into()),
		}
	}

	/// Set the API token for the given server
	pub fn set_api_token(
		&self,
		server: ServerName,
		token: String,
	) -> Result<(), SecureStoreError> {
		let entry = self
			.records
			.get(&server)
			.ok_or(SecureStoreError::EntryMissing)?;
		entry.set_password(&token)?;
		Ok(())
	}

	/// Delete the API token for the given server
	pub fn delete_api_token(&self, server: ServerName) -> Result<bool, SecureStoreError> {
		let entry = self
			.records
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
	use super::*;

	#[ignore]
	#[test]
	fn test_get_api_token_none() {
		let store = SecureStore::init(vec!["homeserver".to_string()])
			.expect("Failed to init store");

		let token = store
			.get_api_token("homeserver".to_string())
			.expect("Failed to get token");

		assert_eq!(token, None);
	}

	#[ignore]
	#[test]
	fn test_get_api_token_some() {
		let store = SecureStore::init(vec!["homeserver".to_string()])
			.expect("Failed to init store");
		// Update the entry with a token
		store
			.set_api_token(
				"homeserver".to_string(),
				"definitely-real-token".to_string(),
			)
			.expect("Failed to set token");
		// Get the token (should be Some now)
		let token = store
			.get_api_token("homeserver".to_string())
			.expect("Failed to get token")
			.expect("Token missing");

		assert_eq!(token, "definitely-real-token");
	}

	#[ignore]
	#[test]
	fn test_delete_api_token() {
		let store = SecureStore::init(vec!["homeserver".to_string()])
			.expect("Failed to init store");
		// Update the entry with a token
		store
			.set_api_token(
				"homeserver".to_string(),
				"definitely-real-token".to_string(),
			)
			.expect("Failed to set token");
		// Delete the token
		store
			.delete_api_token("homeserver".to_string())
			.expect("Failed to delete token");
		// Get the token (should be None now)
		let token = store
			.get_api_token("homeserver".to_string())
			.expect("Failed to get token");

		assert_eq!(token, None);
	}

	#[ignore]
	#[test]
	fn test_replace() {
		let mut store = SecureStore::init(vec!["homeserver".to_string()])
			.expect("Failed to init store");
		// Update the entry with a token
		store
			.set_api_token(
				"homeserver".to_string(),
				"definitely-real-token".to_string(),
			)
			.expect("Failed to set token");

		let new_store = SecureStore::init(vec!["homeserver".to_string()])
			.expect("Failed to init store");
		// Update the entry with a token
		new_store
			.set_api_token(
				"homeserver".to_string(),
				"new-definitely-real-token".to_string(),
			)
			.expect("Failed to set token");

		store.replace(new_store);

		let token = store
			.get_api_token("homeserver".to_string())
			.expect("Failed to get token")
			.expect("Token missing");

		assert_eq!(token, "new-definitely-real-token");
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

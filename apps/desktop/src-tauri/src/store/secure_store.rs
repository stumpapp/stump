// TODO: store keyring entries per configured server? E.g. typescript Record<string, Entry>

use std::collections::HashMap;

use keyring::Entry;

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

pub struct EntryParams {
	pub server: ServerName,
	pub username: String,
}

// TODO: it would be nice to manage refreshes as well as expiration times?
// TODO: determine if I am using keyring appropriately here

/// A secure store for API tokens **scoped to a user**. This store allows for managing multiple tokens
/// for different servers, however they are all assumed to be for the same user. When the frontend logs a user
/// out, the store should be reinitialized via [`SecureStore::init`] once reauthenticated.
impl SecureStore {
	/// Create a new entry in the store for the given server and username. This should be called once
	/// for each server the user has a token for. If a server did not exist before this store was initialized,
	/// it should be added via this function to ensure the store is up to date. If that step is skipped, the
	/// store will continue throwing [`SecureStoreError::EntryMissing`] until the entry is created.
	pub fn create_entry(
		&mut self,
		EntryParams { server, username }: EntryParams,
	) -> Result<(), SecureStoreError> {
		let entry = Entry::new_with_target("api-token", &server, &username)?;
		self.records.insert(server.clone(), entry);
		Ok(())
	}

	/// Initialize the store with entries for the given servers. This should be called each time a user logs in
	pub fn init(
		servers: Vec<String>,
		for_user: String,
	) -> Result<Self, SecureStoreError> {
		let mut store = SecureStore::default();
		for server in servers {
			store.create_entry(EntryParams {
				server,
				username: for_user.clone(),
			})?;
		}
		Ok(store)
	}

	/// Clear all entries from the store, effectively logging the user out
	pub fn clear(&mut self) {
		self.records.clear();
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
	pub fn delete_api_token(&self, server: ServerName) -> Result<(), SecureStoreError> {
		let entry = self
			.records
			.get(&server)
			.ok_or(SecureStoreError::EntryMissing)?;
		entry.delete_credential()?;
		Ok(())
	}
}

#[cfg(test)]
mod tests {
	use super::*;

	#[test]
	fn test_get_api_token_none() {
		let store =
			SecureStore::init(vec!["homeserver".to_string()], "oromei".to_string())
				.expect("Failed to init store");

		let token = store
			.get_api_token("homeserver".to_string())
			.expect("Failed to get token");

		assert_eq!(token, None);
	}

	#[test]
	fn test_get_api_token_some() {
		let store =
			SecureStore::init(vec!["homeserver".to_string()], "oromei".to_string())
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

	#[test]
	fn test_delete_api_token() {
		let store =
			SecureStore::init(vec!["homeserver".to_string()], "oromei".to_string())
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
}

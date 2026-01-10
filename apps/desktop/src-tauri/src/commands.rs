use serde::Serialize;
use tauri::{AppHandle, State};

use crate::{
	state::WrappedState,
	store::{
		app_store::AppStoreExt,
		secure_store::{
			CredentialStoreTokenState, SecureStore, SecureStoreError, StoredCredentials,
			StoredTokens,
		},
		AppStore, StoreError,
	},
	utils::discord::DiscordIntegrationError,
};

/// An error type for the desktop RPC commands.
#[derive(Debug, Serialize, thiserror::Error)]
pub enum DesktopRPCError {
	#[error("Failed to get state in handler")]
	MutexPoisoned,
	#[error("{0}")]
	DiscordError(#[from] DiscordIntegrationError),
	#[error("{0}")]
	CredentialsError(String),
	#[error("{0}")]
	StoreError(#[from] StoreError),
}

impl From<SecureStoreError> for DesktopRPCError {
	fn from(error: SecureStoreError) -> Self {
		Self::CredentialsError(error.to_string())
	}
}

#[tauri::command]
pub fn set_use_discord_connection(
	connect: bool,
	ctx: State<WrappedState>,
) -> Result<(), DesktopRPCError> {
	let mut state = ctx.lock().map_err(|_| DesktopRPCError::MutexPoisoned)?;
	let discord_client = &mut state.discord_client;

	if connect {
		discord_client.connect();
		discord_client.set_defaults()?;
	} else if !connect {
		discord_client.shutdown()?;
	}

	Ok(())
}

#[tauri::command]
pub fn set_discord_presence(
	status: Option<String>,
	details: Option<String>,
	state: State<WrappedState>,
) -> Result<(), DesktopRPCError> {
	let mut state = state.lock().map_err(|_| DesktopRPCError::MutexPoisoned)?;
	let discord_client = &mut state.discord_client;

	if discord_client.is_connected() {
		discord_client.set_presence(status.as_deref(), details.as_deref())?;
	}

	Ok(())
}

#[tauri::command]
pub async fn get_current_server(
	app_handle: AppHandle,
) -> Result<Option<String>, DesktopRPCError> {
	let store = AppStore::load_store(&app_handle)?;
	let server = store.get_active_server();
	Ok(server.map(|s| s.name))
}

#[tauri::command]
pub async fn init_credential_store(
	state: State<'_, WrappedState>,
	servers: Vec<String>,
) -> Result<(), DesktopRPCError> {
	let mut state = state.lock().map_err(|_| DesktopRPCError::MutexPoisoned)?;
	let secure_store = SecureStore::init(servers)?;
	state.secure_store.replace(secure_store);

	Ok(())
}

#[tauri::command]
pub async fn create_server_entry(
	state: State<'_, WrappedState>,
	server: String,
) -> Result<(), DesktopRPCError> {
	let mut state = state.lock().map_err(|_| DesktopRPCError::MutexPoisoned)?;
	state.secure_store.create_entry(server)?;
	Ok(())
}

#[tauri::command]
pub async fn get_credential_store_state(
	state: State<'_, WrappedState>,
) -> Result<CredentialStoreTokenState, DesktopRPCError> {
	let state = state.lock().map_err(|_| DesktopRPCError::MutexPoisoned)?;
	Ok(state.secure_store.get_login_state())
}

#[tauri::command]
pub async fn get_credentials(
	server: String,
	state: State<'_, WrappedState>,
) -> Result<Option<StoredCredentials>, DesktopRPCError> {
	let state = state.lock().map_err(|_| DesktopRPCError::MutexPoisoned)?;

	let credentials = state.secure_store.get_credentials(server)?;

	Ok(credentials)
}

#[tauri::command]
pub async fn set_credentials(
	server: String,
	credentials: StoredCredentials,
	state: State<'_, WrappedState>,
) -> Result<(), DesktopRPCError> {
	let state = state.lock().map_err(|_| DesktopRPCError::MutexPoisoned)?;

	state.secure_store.set_credentials(server, credentials)?;

	Ok(())
}

#[tauri::command]
pub async fn delete_credentials(
	server: String,
	state: State<'_, WrappedState>,
) -> Result<(), DesktopRPCError> {
	let state = state.lock().map_err(|_| DesktopRPCError::MutexPoisoned)?;

	state.secure_store.delete_credentials(server)?;

	Ok(())
}

#[tauri::command]
pub async fn get_tokens(
	server: String,
	state: State<'_, WrappedState>,
) -> Result<Option<StoredTokens>, DesktopRPCError> {
	let state = state.lock().map_err(|_| DesktopRPCError::MutexPoisoned)?;

	let tokens = state.secure_store.get_tokens(server)?;

	Ok(tokens)
}

#[tauri::command]
pub async fn set_tokens(
	server: String,
	tokens: StoredTokens,
	state: State<'_, WrappedState>,
) -> Result<(), DesktopRPCError> {
	let state = state.lock().map_err(|_| DesktopRPCError::MutexPoisoned)?;

	state.secure_store.set_tokens(server, tokens)?;

	Ok(())
}

#[tauri::command]
pub async fn delete_tokens(
	server: String,
	state: State<'_, WrappedState>,
) -> Result<bool, DesktopRPCError> {
	let state = state.lock().map_err(|_| DesktopRPCError::MutexPoisoned)?;
	Ok(state.secure_store.delete_tokens(server)?)
}

#[tauri::command]
pub async fn clear_credential_store(
	state: State<'_, WrappedState>,
) -> Result<(), DesktopRPCError> {
	let mut state = state.lock().map_err(|_| DesktopRPCError::MutexPoisoned)?;
	state.secure_store.clear();
	Ok(())
}

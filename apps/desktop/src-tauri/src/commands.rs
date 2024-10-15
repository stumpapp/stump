use serde::Serialize;
use tauri::{AppHandle, State};

use crate::{
	state::WrappedState,
	store::{
		app_store::AppStoreExt,
		secure_store::{CredentialStoreTokenState, SecureStore, SecureStoreError},
		AppStore, StoreError,
	},
	utils::discord::DiscordIntegrationError,
};

/// An error type for the desktop RPC commands.
#[derive(Debug, Serialize, thiserror::Error)]
pub enum DeskopRPCError {
	#[error("Failed to get state in handler")]
	MutexPoisoned,
	#[error("{0}")]
	DiscordError(#[from] DiscordIntegrationError),
	#[error("{0}")]
	CredentialsError(String),
	#[error("{0}")]
	StoreError(#[from] StoreError),
}

impl From<SecureStoreError> for DeskopRPCError {
	fn from(error: SecureStoreError) -> Self {
		Self::CredentialsError(error.to_string())
	}
}

#[tauri::command]
pub fn set_use_discord_connection(
	connect: bool,
	ctx: State<WrappedState>,
) -> Result<(), DeskopRPCError> {
	let mut state = ctx.lock().map_err(|_| DeskopRPCError::MutexPoisoned)?;
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
) -> Result<(), DeskopRPCError> {
	let mut state = state.lock().map_err(|_| DeskopRPCError::MutexPoisoned)?;
	let discord_client = &mut state.discord_client;

	if discord_client.is_connected() {
		discord_client.set_presence(status.as_deref(), details.as_deref())?;
	}

	Ok(())
}

#[tauri::command]
pub async fn get_current_server(
	app_handle: AppHandle,
) -> Result<Option<String>, DeskopRPCError> {
	let store = AppStore::load_store(&app_handle)?;
	let server = store.get_active_server();
	Ok(server.map(|s| s.name))
}

#[tauri::command]
pub async fn init_credential_store(
	state: State<'_, WrappedState>,
	app_handle: AppHandle,
) -> Result<(), DeskopRPCError> {
	let mut state = state.lock().map_err(|_| DeskopRPCError::MutexPoisoned)?;
	let store = AppStore::load_store(&app_handle)?;

	let servers = store.get_servers();
	let server_names = servers.iter().map(|s| s.name.clone()).collect();

	let secure_store = SecureStore::init(server_names)?;
	state.secure_store.replace(secure_store);

	Ok(())
}

#[tauri::command]
pub async fn get_credential_store_state(
	state: State<'_, WrappedState>,
) -> Result<CredentialStoreTokenState, DeskopRPCError> {
	let state = state.lock().map_err(|_| DeskopRPCError::MutexPoisoned)?;
	Ok(state.secure_store.get_login_state())
}

#[tauri::command]
pub async fn get_api_token(
	server: String,
	state: State<'_, WrappedState>,
) -> Result<Option<String>, DeskopRPCError> {
	let state = state.lock().map_err(|_| DeskopRPCError::MutexPoisoned)?;

	let token = state.secure_store.get_api_token(server)?;

	Ok(token)
}

#[tauri::command]
pub async fn set_api_token(
	server: String,
	token: String,
	state: State<'_, WrappedState>,
) -> Result<(), DeskopRPCError> {
	let state = state.lock().map_err(|_| DeskopRPCError::MutexPoisoned)?;

	state.secure_store.set_api_token(server, token)?;

	Ok(())
}

#[tauri::command]
pub async fn delete_api_token(
	server: String,
	state: State<'_, WrappedState>,
) -> Result<bool, DeskopRPCError> {
	let state = state.lock().map_err(|_| DeskopRPCError::MutexPoisoned)?;
	Ok(state.secure_store.delete_api_token(server)?)
}

#[tauri::command]
pub async fn clear_credential_store(
	state: State<'_, WrappedState>,
) -> Result<(), DeskopRPCError> {
	let mut state = state.lock().map_err(|_| DeskopRPCError::MutexPoisoned)?;
	state.secure_store.clear();
	Ok(())
}

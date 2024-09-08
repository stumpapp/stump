use std::sync::Mutex;

use serde::Serialize;
use tauri::Manager;

use crate::utils::discord::StumpDiscordPresence;

/// An error type for the desktop RPC commands.
#[derive(Debug, Serialize, thiserror::Error)]
pub enum DeskopRPCError {
	#[error("Failed to get state in handler")]
	MutexPoisoned,
	#[error("Failed action on window")]
	WindowOperationFailed,
	#[error("Window not found")]
	WindowMissing,
}

#[tauri::command]
pub fn set_use_discord_connection(
	connect: bool,
	state: tauri::State<Mutex<StumpDiscordPresence>>,
) -> Result<(), DeskopRPCError> {
	let mut client = state.lock().map_err(|_| DeskopRPCError::MutexPoisoned)?;

	if connect && !client.is_connected() {
		client.connect();
		client.set_defaults();
	} else if !connect && client.is_connected() {
		client.shutdown();
	}

	Ok(())
}

#[tauri::command]
pub fn set_discord_presence(
	status: Option<String>,
	details: Option<String>,
	state: tauri::State<Mutex<StumpDiscordPresence>>,
) -> Result<(), DeskopRPCError> {
	let mut client = state.lock().map_err(|_| DeskopRPCError::MutexPoisoned)?;

	if client.is_connected() {
		client.set_presence(status.as_deref(), details.as_deref());
	}

	Ok(())
}

#[tauri::command]
pub async fn close_splashscreen(window: tauri::Window) -> Result<(), DeskopRPCError> {
	if let Some(splashscreen) = window.get_window("splashscreen") {
		splashscreen
			.close()
			.map_err(|_| DeskopRPCError::WindowOperationFailed)?;
	}

	let Some(main_window) = window.get_window("main") else {
		return Err(DeskopRPCError::WindowMissing);
	};

	main_window
		.show()
		.map_err(|_| DeskopRPCError::WindowOperationFailed)?;

	Ok(())
}

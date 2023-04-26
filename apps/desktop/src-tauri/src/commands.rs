use std::sync::Mutex;

use tauri::Manager;

use crate::utils::discord::StumpDiscordPresence;

// TODO: error handling :D

#[tauri::command]
pub fn set_use_discord_connection(
	connect: bool,
	state: tauri::State<Mutex<StumpDiscordPresence>>,
) {
	let mut client = state.lock().unwrap();

	if connect && !client.is_connected() {
		client.connect();
		client.set_defaults();
	} else if !connect && client.is_connected() {
		client.shutdown();
	}
}

#[tauri::command]
pub fn set_discord_presence(
	status: Option<String>,
	details: Option<String>,
	state: tauri::State<Mutex<StumpDiscordPresence>>,
) {
	let mut client = state.lock().unwrap();

	if client.is_connected() {
		client.set_presence(status.as_deref(), details.as_deref());
	}
}

#[tauri::command]
pub async fn close_splashscreen(window: tauri::Window) {
	if let Some(splashscreen) = window.get_window("splashscreen") {
		splashscreen.close().unwrap();
	}
	window.get_window("main").unwrap().show().unwrap();
}

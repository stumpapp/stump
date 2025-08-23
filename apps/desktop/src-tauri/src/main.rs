#![cfg_attr(
	all(not(debug_assertions), target_os = "windows"),
	windows_subsystem = "windows"
)]

mod commands;
mod error;
mod state;
mod store;
mod utils;

use std::sync::{Arc, Mutex};
use store::AppStore;

use state::AppState;

use commands::{
	clear_credential_store, create_server_entry, delete_credentials, delete_tokens,
	get_credential_store_state, get_credentials, get_current_server, get_tokens,
	init_credential_store, set_credentials, set_discord_presence, set_tokens,
	set_use_discord_connection,
};

#[cfg(feature = "bundled-server")]
use stump_server::{bootstrap_http_server_config, run_http_server};

fn setup_app(app: &mut tauri::App) -> Result<(), Box<dyn std::error::Error>> {
	let _app_store = AppStore::init(app)?;

	// if bundled-server feature is enabled, start the server
	#[cfg(feature = "bundled-server")]
	if _app_store.run_bundled_server {
		tauri::async_runtime::spawn(async move {
			// TODO: would setting the client path to tauri-managed resources work?
			// - https://github.com/tauri-apps/tauri/issues/5225
			// - https://tauri.app/v1/guides/building/resources/
			// - https://github.com/tauri-apps/tauri/discussions/4998
			let config_result = bootstrap_http_server_config().await;
			match config_result {
				Ok(config) => {
					if let Err(error) = run_http_server(config).await {
						tracing::error!(?error, "Server exited!");
					}
				},
				Err(error) => {
					tracing::error!(?error, "Failed to bootstrap server config!");
				},
			}
		});
	}

	Ok(())
}

// TODO(titlebar): https://v2.tauri.app/plugin/window-customization/#macos-transparent-titlebar-with-custom-window-background-color
// See also https://github.com/tauri-apps/tauri/issues/2663

// TODO(system-tray): https://v2.tauri.app/plugin/system-tray/

fn main() {
	let app_state = AppState::new().expect("Failed to initialize application state");

	tauri::Builder::default()
		.plugin(tauri_plugin_shell::init())
		.plugin(tauri_plugin_os::init())
		.plugin(tauri_plugin_store::Builder::default().build())
		.setup(setup_app)
		.manage(Arc::new(Mutex::new(app_state)))
		.invoke_handler(tauri::generate_handler![
			set_use_discord_connection,
			set_discord_presence,
			get_current_server,
			init_credential_store,
			get_credentials,
			set_credentials,
			delete_credentials,
			get_tokens,
			set_tokens,
			delete_tokens,
			clear_credential_store,
			get_credential_store_state,
			create_server_entry
		])
		.run(tauri::generate_context!())
		.expect("error while running tauri application");
}

#![cfg_attr(
	all(not(debug_assertions), target_os = "windows"),
	windows_subsystem = "windows"
)]

// TODO: https://github.com/tauri-apps/tauri-plugin-store
// TODO: https://tauri.app/v1/guides/features/menu

mod commands;
mod error;
mod state;
mod store;
mod utils;

use std::sync::{Arc, Mutex};
use store::AppStore;
use tauri_plugin_store::StoreBuilder;

use state::AppState;

use commands::{close_splashscreen, set_discord_presence, set_use_discord_connection};

#[cfg(feature = "bundled-server")]
use stump_server::{bootstrap_http_server_config, run_http_server};

// TODO: https://github.com/tauri-apps/tauri/issues/2663

fn main() {
	// if bundled-server feature is enabled, start the server
	#[cfg(feature = "bundled-server")]
	{
		tauri::async_runtime::spawn(async move {
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

	let app_state = AppState::new().expect("Failed to initialize application state");

	tauri::Builder::default()
		.plugin(tauri_plugin_store::Builder::default().build())
		.setup(|app| {
			if let Err(error) = AppStore::init(app) {
				tracing::error!(?error, "Failed to initialize store");
				Err(error.to_string().into())
			} else {
				Ok(())
			}
		})
		.manage(Arc::new(Mutex::new(app_state)))
		.invoke_handler(tauri::generate_handler![
			set_use_discord_connection,
			set_discord_presence,
			close_splashscreen
		])
		.run(tauri::generate_context!())
		.expect("error while running tauri application");
}

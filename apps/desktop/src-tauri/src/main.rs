#![cfg_attr(
	all(not(debug_assertions), target_os = "windows"),
	windows_subsystem = "windows"
)]

// TODO: https://github.com/tauri-apps/tauri-plugin-store
// TODO: https://tauri.app/v1/guides/features/menu

mod commands;
mod utils;

use std::sync::Mutex;

use utils::discord::StumpDiscordPresence;

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

	tauri::Builder::default()
		.manage(Mutex::new(StumpDiscordPresence::new()))
		.invoke_handler(tauri::generate_handler![
			set_use_discord_connection,
			set_discord_presence,
			close_splashscreen
		])
		.run(tauri::generate_context!())
		.expect("error while running tauri application");
}

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

use state::AppState;

use commands::{
	close_splashscreen, get_api_token, get_current_server, init_credential_store,
	set_api_token, set_discord_presence, set_use_discord_connection,
};

#[cfg(feature = "bundled-server")]
use stump_server::{bootstrap_http_server_config, run_http_server};

// TODO: https://github.com/tauri-apps/tauri/issues/2663

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

fn main() {
	let app_state = AppState::new().expect("Failed to initialize application state");

	tauri::Builder::default()
		.plugin(tauri_plugin_store::Builder::default().build())
		.setup(setup_app)
		.manage(Arc::new(Mutex::new(app_state)))
		.invoke_handler(tauri::generate_handler![
			set_use_discord_connection,
			set_discord_presence,
			close_splashscreen,
			get_current_server,
			init_credential_store,
			get_api_token,
			set_api_token,
		])
		.run(tauri::generate_context!())
		.expect("error while running tauri application");
}

#[allow(unused_imports)]
mod tests {
	use std::{fs::File, io::Write, path::PathBuf};

	use specta::{
		ts::{export, BigIntExportBehavior, ExportConfiguration, TsExportError},
		NamedType,
	};

	use crate::store::{app_store::*, saved_server::*};

	#[allow(dead_code)]
	fn ts_export<T>() -> Result<String, TsExportError>
	where
		T: NamedType,
	{
		export::<T>(&ExportConfiguration::new().bigint(BigIntExportBehavior::Number))
	}

	#[test]
	#[ignore]
	fn codegen() -> Result<(), Box<dyn std::error::Error>> {
		let path = PathBuf::from(env!("CARGO_MANIFEST_DIR"))
			.join("../../../packages/sdk/src/types")
			.join("generated.ts");

		if !path.exists() {
			panic!(
				"Please run `cargo run --package codegen` first to generate the types"
			);
		}

		println!(
			"Please ensure to only generate types using `cargo run --package codegen`"
		);

		let mut file = std::fs::OpenOptions::new().append(true).open(path)?;

		file.write_all(b"// DESKTOP TYPE GENERATION\n\n")?;

		file.write_all(format!("{}\n\n", ts_export::<SavedServer>()?).as_bytes())?;
		file.write_all(format!("{}\n\n", ts_export::<AppStore>()?).as_bytes())?;

		Ok(())
	}
}

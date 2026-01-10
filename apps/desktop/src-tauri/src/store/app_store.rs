use serde::Serialize;
use tauri::{App, AppHandle, Manager, Wry};
use tauri_plugin_store::{Store, StoreExt};

use super::saved_server::SavedServer;

pub const STORE_FILE: &str = "settings.json";

#[derive(Debug, Serialize, thiserror::Error)]
pub enum StoreError {
	#[error("Failed to load store")]
	StoreLoadError,
}

#[derive(Serialize)]
#[serde(rename = "DesktopAppStore", rename_all = "camelCase")]
pub struct AppStore {
	#[serde(default, alias = "runBundledServer")]
	pub run_bundled_server: bool,
	#[serde(default, alias = "activeServer")]
	active_server: Option<SavedServer>,
	#[serde(default, alias = "connectedServers")]
	connected_servers: Vec<SavedServer>,
}

impl AppStore {
	pub fn load_store(handle: &AppHandle) -> Result<Store<Wry>, StoreError> {
		let path = handle
			.path()
			.app_config_dir()
			.map_err(|_| StoreError::StoreLoadError)?
			.join(STORE_FILE);

		// Init store and load it from disk
		let store = handle.store_builder(path).build();

		// TODO(tauri-v2): Still necessary?
		// If there are no saved settings yet, this will return an error so we ignore the return value.
		let _ = store.load();

		Ok(store)
	}

	pub fn init(app: &mut App) -> Result<Self, StoreError> {
		let store = Self::load_store(app.handle())?;

		let active_server = store.get_active_server();
		let connected_servers = store.get_servers();
		let run_bundled_server = store.get_run_bundled_server();

		Ok(Self {
			active_server,
			connected_servers,
			run_bundled_server,
		})
	}
}

pub trait AppStoreExt {
	fn get_servers(&self) -> Vec<SavedServer>;
	fn get_active_server(&self) -> Option<SavedServer>;
	fn get_run_bundled_server(&self) -> bool;
}

impl AppStoreExt for Store<Wry> {
	fn get_servers(&self) -> Vec<SavedServer> {
		self.get("connected_servers")
			.and_then(|s| s.as_array().cloned())
			.map(SavedServer::from_vec)
			.unwrap_or_default()
	}

	fn get_active_server(&self) -> Option<SavedServer> {
		self.get("active_server")
			.map(SavedServer::try_from)
			.transpose()
			.unwrap_or_else(|error| {
				tracing::error!(?error, "Failed to parse active server");
				None
			})
	}

	fn get_run_bundled_server(&self) -> bool {
		self.get("run_bundled_server")
			.and_then(|s| s.as_bool())
			.unwrap_or(false)
	}
}

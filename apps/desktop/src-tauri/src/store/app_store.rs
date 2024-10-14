use serde::Serialize;
use specta::Type;
use tauri::{App, AppHandle, Wry};
use tauri_plugin_store::{Store, StoreBuilder};

use super::saved_server::SavedServer;

pub const STORE_FILE: &str = "settings.json";

#[derive(Debug, Serialize, thiserror::Error)]
pub enum StoreError {
	#[error("Failed to load store")]
	StoreLoadError,
}

#[derive(Serialize, Type)]
#[serde(rename = "DesktopAppStore")]
pub struct AppStore {
	pub run_bundled_server: bool,
	#[specta(optional)]
	active_server: Option<SavedServer>,
	connected_servers: Vec<SavedServer>,
}

impl AppStore {
	pub fn load_store(handle: AppHandle) -> Result<Store<Wry>, StoreError> {
		// Init store and load it from disk
		let mut store = StoreBuilder::new(
			handle,
			STORE_FILE.parse().map_err(|_| StoreError::StoreLoadError)?,
		)
		.build();

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
			.cloned()
			.and_then(|s| s.as_array().cloned())
			.map(SavedServer::from_vec)
			.unwrap_or_default()
	}

	fn get_active_server(&self) -> Option<SavedServer> {
		self.get("active_server")
			.cloned()
			.map(SavedServer::try_from)
			.transpose()
			.unwrap_or_else(|error| {
				tracing::error!(?error, "Failed to parse active server");
				None
			})
	}

	fn get_run_bundled_server(&self) -> bool {
		self.get("run_bundled_server")
			.cloned()
			.and_then(|s| s.as_bool())
			.unwrap_or(false)
	}
}

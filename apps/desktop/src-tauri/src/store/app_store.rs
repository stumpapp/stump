use serde::Serialize;
use specta::Type;
use tauri::App;
use tauri_plugin_store::StoreBuilder;

use super::saved_server::SavedServer;

#[derive(Debug, thiserror::Error)]
pub enum StoreError {
	#[error("Failed to load store")]
	StoreLoadError,
	#[error("Failed to save store")]
	StoreSaveError,
}

#[derive(Serialize, Type)]
#[serde(rename = "DesktopAppStore")]
pub struct AppStore {
	#[specta(optional)]
	active_server: Option<SavedServer>,
	connected_servers: Vec<SavedServer>,
}

impl AppStore {
	pub fn init(app_handle: &mut App) -> Result<Self, StoreError> {
		// Init store and load it from disk
		let mut store = StoreBuilder::new(
			app_handle.handle(),
			"settings.json"
				.parse()
				.map_err(|_| StoreError::StoreLoadError)?,
		)
		.build();

		// If there are no saved settings yet, this will return an error so we ignore the return value.
		let _ = store.load();

		let active_server = store
			.get("active_server")
			.cloned()
			.map(SavedServer::try_from)
			.transpose()
			.unwrap_or_else(|error| {
				tracing::error!(?error, "Failed to parse active server");
				None
			});

		let connected_servers = store
			.get("connected_servers")
			.cloned()
			.and_then(|s| s.as_array().cloned())
			.map(SavedServer::from_vec)
			.unwrap_or_default();

		Ok(Self {
			active_server,
			connected_servers,
		})
	}
}

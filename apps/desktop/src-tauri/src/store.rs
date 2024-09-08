use std::str::FromStr;

use tauri::{http::Uri, App};
use tauri_plugin_store::StoreBuilder;

#[derive(Debug, thiserror::Error)]
pub enum StoreError {
	#[error("Failed to load store")]
	StoreLoadError,
	#[error("Failed to save store")]
	StoreSaveError,
}

pub struct AppStore {
	active_server: Option<Uri>,
	connected_servers: Vec<Uri>,
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
			.and_then(|s| s.as_str().map(Uri::from_str))
			.transpose()
			.map_err(|_| StoreError::StoreLoadError)?;
		let connected_servers: Vec<Uri> = store
			.get("connected_servers")
			.cloned()
			.and_then(|s| s.as_array().cloned())
			.map(|a| {
				a.iter()
					.filter_map(|s| s.as_str().map(Uri::from_str))
					.collect::<Result<Vec<_>, _>>()
			})
			.transpose()
			.map_err(|_| StoreError::StoreLoadError)?
			.unwrap_or_default();

		Ok(Self {
			active_server: active_server.clone(),
			connected_servers: connected_servers.clone(),
		})
	}
}

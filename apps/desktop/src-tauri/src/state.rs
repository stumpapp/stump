use std::sync::{Arc, Mutex};

use crate::{
	error::DesktopError, store::secure_store::SecureStore,
	utils::discord::StumpDiscordPresence,
};

pub struct AppState {
	pub discord_client: StumpDiscordPresence,
	pub secure_store: SecureStore,
}

impl AppState {
	pub fn new() -> Result<Self, DesktopError> {
		Ok(Self {
			discord_client: StumpDiscordPresence::new()?,
			secure_store: SecureStore::default(),
		})
	}
}

pub type WrappedState = Arc<Mutex<AppState>>;

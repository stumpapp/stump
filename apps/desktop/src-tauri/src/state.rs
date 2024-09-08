use std::sync::{Arc, Mutex};

use crate::{error::DesktopError, utils::discord::StumpDiscordPresence};

pub struct AppState {
	pub discord_client: StumpDiscordPresence,
}

impl AppState {
	pub fn new() -> Result<Self, DesktopError> {
		Ok(Self {
			discord_client: StumpDiscordPresence::new()?,
		})
	}
}

pub type WrappedState = Arc<Mutex<AppState>>;

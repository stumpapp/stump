use discord_rich_presence::{
	activity::{self, Assets},
	DiscordIpc, DiscordIpcClient,
};
use serde::Serialize;

const STUMP_ICON: &str = "https://raw.githubusercontent.com/aaronleopold/stump/develop/apps/docs/public/favicon.png";
const IPC_ID: &str = "1022185766677389392";

#[derive(Debug, Serialize, thiserror::Error)]
pub enum DiscordIntegrationError {
	#[error("Failed to initialize Discord IPC client: {0}")]
	InitializationError(String),
	#[error("Failed to shutdown Discord IPC client: {0}")]
	ShutdownError(String),
	#[error("Failed to update Discord presence")]
	SetPresenceFailed,
	#[error("Attempted an operation without an active connection")]
	NotConnected,
}

/// A struct for managing Discord Rich Presence.
pub struct StumpDiscordPresence {
	/// Whether the Discord IPC client is connected.
	is_connected: bool,
	/// The Discord IPC client.
	client: DiscordIpcClient,
}

impl StumpDiscordPresence {
	pub fn new() -> Result<Self, DiscordIntegrationError> {
		let client = DiscordIpcClient::new(IPC_ID).map_err(|err| {
			DiscordIntegrationError::InitializationError(err.to_string())
		})?;

		Ok(Self {
			client,
			is_connected: false,
		})
	}

	pub fn set_defaults(&mut self) -> Result<(), DiscordIntegrationError> {
		self.set_presence(None, None)
	}

	pub fn connect(&mut self) {
		if let Err(err) = self.client.connect() {
			// TODO: log error, this is probably just because Discord isn't running...
			println!("Failed to connect to Discord IPC: {}", err);
		} else {
			self.is_connected = true;
		}
		// .expect("Failed to connect to Discord IPC");
	}

	pub fn set_presence(
		&mut self,
		state: Option<&str>,
		details: Option<&str>,
	) -> Result<(), DiscordIntegrationError> {
		if !self.is_connected {
			return Err(DiscordIntegrationError::NotConnected);
		}

		let mut activity =
			activity::Activity::new().assets(Assets::new().large_image(STUMP_ICON));

		if let Some(state) = state {
			activity = activity.state(state);
		}

		if let Some(details) = details {
			activity = activity.details(details);
		}

		self.client
			.set_activity(activity)
			.map_err(|_| DiscordIntegrationError::SetPresenceFailed)?;

		Ok(())
	}

	// pub fn clear_presence(&mut self) {
	// 	if !self.is_connected {
	// 		return;
	// 	}

	// 	self.client
	// 		.clear_activity()
	// 		.expect("Failed to clear Discord presence");
	// }

	pub fn shutdown(&mut self) -> Result<(), DiscordIntegrationError> {
		if !self.is_connected {
			return Ok(());
		}

		self.client
			.close()
			.map_err(|err| DiscordIntegrationError::ShutdownError(err.to_string()))?;
		self.is_connected = false;

		Ok(())
	}

	pub fn is_connected(&self) -> bool {
		self.is_connected
	}
}

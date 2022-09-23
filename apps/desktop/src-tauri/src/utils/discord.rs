const STUMP_ICON: &str = "https://raw.githubusercontent.com/aaronleopold/stump/develop/apps/docs/public/favicon.png";

use discord_rich_presence::{
	activity::{self, Assets},
	DiscordIpc, DiscordIpcClient,
};

// TODO: error handling, don't want to panic application when discord presence fails...
pub struct StumpDiscordPresence {
	is_connected: bool,
	client: DiscordIpcClient,
}

impl StumpDiscordPresence {
	pub fn new() -> Self {
		let client = DiscordIpcClient::new("1022185766677389392")
			.expect("Failed to create Discord IPC client");

		Self {
			client,
			is_connected: false,
		}
	}

	pub fn init() -> Result<Self, String> {
		let mut client = DiscordIpcClient::new("1022185766677389392")
			.map_err(|e| format!("Failed to create Discord IPC client: {}", e))?;

		client
			.connect()
			.map_err(|e| format!("Failed to connect to Discord IPC client: {}", e))?;

		Ok(Self {
			client,
			is_connected: true,
		})
	}

	pub fn set_defaults(&mut self) {
		self.set_presence(None, None);
	}

	pub fn connect(&mut self) {
		if let Err(err) = self.client.connect() {
			// TODO: log error
		} else {
			self.is_connected = true;
		}
		// .expect("Failed to connect to Discord IPC");
	}

	pub fn set_presence(&mut self, state: Option<&str>, details: Option<&str>) {
		if !self.is_connected {
			return;
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
			.expect("Failed to set Discord presence");
	}

	pub fn clear_presence(&mut self) {
		if !self.is_connected {
			return;
		}

		self.client
			.clear_activity()
			.expect("Failed to clear Discord presence");
	}

	pub fn shutdown(&mut self) {
		if !self.is_connected {
			return;
		}

		self.client
			.close()
			.expect("Failed to close Discord IPC client");

		self.is_connected = false;
	}

	pub fn is_connected(&self) -> bool {
		self.is_connected
	}
}

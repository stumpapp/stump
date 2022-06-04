use serde::{Deserialize, Serialize};

use crate::config::get_config_dir;

#[derive(Serialize, Deserialize, Debug, Clone)]
pub struct Env {
	// SERVER CONFIG
	pub rocket_profile: Option<String>,
	pub rocket_port: Option<u16>,

	// STUMP CONFIG
	pub stump_log_verbosity: Option<u64>,
	pub stump_client_dir: Option<String>,
	pub stump_config_dir: Option<String>,
	pub stump_allowed_origins: Option<Vec<String>>,
}

impl Default for Env {
	fn default() -> Self {
		Self {
			rocket_profile: Some(String::from("debug")),
			rocket_port: Some(10801),
			stump_log_verbosity: Some(0),
			stump_client_dir: Some(String::from("client")),
			stump_config_dir: None,
			stump_allowed_origins: None,
		}
	}
}

// TODO: error handling
impl Env {
	pub fn load() -> anyhow::Result<()> {
		let config_dir = get_config_dir();
		let stump_toml = config_dir.join("Stump.toml");

		if !stump_toml.exists() {
			log::debug!("Stump.toml does not exist, creating it");

			std::fs::File::create(stump_toml.clone())?;

			log::debug!("Stump.toml created");

			let default_env = Env::default();

			log::debug!("Writing default configuration to Stump.toml");

			std::fs::write(stump_toml.as_path(), toml::to_string(&default_env)?)?;

			log::debug!("Wrote default configuration to Stump.toml. Environment variables configured.");

			return Ok(());
		}

		let toml_str = std::fs::read_to_string(stump_toml)?;

		let env = toml::from_str::<Env>(&toml_str)?;

		// only 'debug' and 'release' are valid
		if let Some(rocket_profile) = env.rocket_profile {
			if rocket_profile != "debug" {
				std::env::set_var("ROCKET_PROFILE", "release");
			} else {
				std::env::set_var("ROCKET_PROFILE", "debug");
			}
		}

		let rocket_port = env.rocket_port.unwrap_or(10801);

		std::env::set_var("ROCKET_PORT", rocket_port.to_string());
		std::env::set_var(
			"STUMP_LOG_VERBOSITY",
			env.stump_log_verbosity.unwrap_or(0).to_string(),
		);

		if let Some(config_dir) = env.stump_config_dir {
			if !config_dir.is_empty() {
				std::env::set_var("STUMP_CONFIG_DIR", config_dir);
			}
		}

		if let Some(client_dir) = env.stump_client_dir {
			if !client_dir.is_empty() {
				std::env::set_var("STUMP_CLIENT_DIR", client_dir);
			}
		}

		if let Some(allowed_origins) = env.stump_allowed_origins {
			if !allowed_origins.is_empty() {
				std::env::set_var("STUMP_ALLOWED_ORIGINS", allowed_origins.join(","));
			}
		}

		Ok(())
	}
}

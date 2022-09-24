use std::path::Path;

use serde::{Deserialize, Serialize};

use crate::{
	config::get_config_dir,
	types::{errors::CoreError, CoreResult},
};

#[derive(Serialize, Deserialize, Debug, Clone)]
pub struct StumpEnv {
	// SERVER CONFIG
	pub rocket_profile: Option<String>,
	pub rocket_port: Option<u16>,

	// STUMP CONFIG
	pub stump_log_verbosity: Option<u64>,
	pub stump_client_dir: Option<String>,
	pub stump_config_dir: Option<String>,
	pub stump_allowed_origins: Option<Vec<String>>,
}

impl Default for StumpEnv {
	fn default() -> Self {
		Self {
			rocket_profile: Some(String::from("debug")),
			rocket_port: Some(10801),
			// TODO: change default back to 0
			stump_log_verbosity: Some(1),
			stump_client_dir: Some(String::from("client")),
			stump_config_dir: None,
			stump_allowed_origins: None,
		}
	}
}

// TODO: error handling
// FIXME: I don't believe this will work very well, but it requires some testing.
impl StumpEnv {
	/// Will try to create a new Env object from set environment variables. If none are set,
	/// will return the default Env object.
	pub fn from_env(existing: Option<Self>) -> CoreResult<Self> {
		let mut env = match existing {
			Some(env) => env,
			None => Self::default(),
		};

		if let Ok(port) = std::env::var("ROCKET_PORT") {
			env.rocket_port = Some(port.parse().unwrap());
		}

		if let Ok(profile) = std::env::var("ROCKET_PROFILE") {
			if profile == "release" || profile == "debug" {
				env.rocket_profile = Some(profile);
			} else {
				log::debug!("Invalid ROCKET_PROFILE value: {}", profile);

				env.rocket_profile = Some(String::from("debug"));
			}
		}

		if let Ok(verbosity) = std::env::var("STUMP_LOG_VERBOSITY") {
			env.stump_log_verbosity = Some(verbosity.parse().unwrap());
		}

		if let Ok(client_dir) = std::env::var("STUMP_CLIENT_DIR") {
			env.stump_client_dir = Some(client_dir);
		}

		if let Ok(config_dir) = std::env::var("STUMP_CONFIG_DIR") {
			if !config_dir.is_empty() {
				if Path::new(&config_dir).exists() {
					env.stump_config_dir = Some(config_dir);
				} else {
					log::debug!(
						"Invalid STUMP_CONFIG_DIR value, cannot find on file system: {}",
						config_dir
					);
				}
			} else {
				log::debug!("Invalid STUMP_CONFIG_DIR value: EMPTY");
			}
		}

		env.stump_config_dir = Some(get_config_dir().to_string_lossy().to_string());

		env.write()?;

		Ok(env)
	}

	pub fn load() -> CoreResult<()> {
		let config_dir = get_config_dir();
		let stump_toml = config_dir.join("Stump.toml");

		let env = if stump_toml.exists() {
			let toml_str = std::fs::read_to_string(stump_toml)?;
			toml::from_str::<StumpEnv>(&toml_str)
				.map_err(|e| CoreError::InitializationError(e.to_string()))?
		} else {
			log::debug!("Stump.toml does not exist, creating it");
			std::fs::File::create(stump_toml.clone())?;
			log::debug!("Stump.toml created");

			Self::default()
		};

		// I reassign the env here to make sure it picks up changes when a user manually sets a value
		let env = Self::from_env(Some(env))?;

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

	pub fn write(&self) -> CoreResult<()> {
		let config_dir = get_config_dir();
		let stump_toml = config_dir.join("Stump.toml");

		std::fs::write(
			stump_toml.as_path(),
			toml::to_string(&self)
				.map_err(|e| CoreError::InitializationError(e.to_string()))?,
		)?;

		Ok(())
	}
}

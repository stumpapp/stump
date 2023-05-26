use std::{env, path::Path};

use optional_struct::OptionalStruct;
use serde::{Deserialize, Serialize};
use tracing::debug;

use crate::{
	config::get_config_dir,
	error::{CoreError, CoreResult},
};

// TODO: before I actually use this, test to see if it works well.

#[derive(Serialize, Deserialize, Debug, Clone, OptionalStruct)]
#[optional_name = "PartialStumpConfig"]
#[optional_derive(Deserialize)]
pub struct StumpConfig {
	pub profile: String,
	pub port: u16,
	pub verbosity: u64,
	pub client_dir: String,
	pub config_dir: String,
	pub allowed_origins: Option<Vec<String>>,
}

impl Default for StumpConfig {
	fn default() -> Self {
		Self {
			profile: String::from("debug"),
			port: 10801,
			// TODO: change default back to 0
			verbosity: 1,
			client_dir: String::from("client"),
			config_dir: get_config_dir().to_string_lossy().to_string(),
			allowed_origins: None,
		}
	}
}

impl StumpConfig {
	/// Will load the [StumpConfig] object from the Stump.toml file. If the file does not exist,
	/// it will create it with the default values. Internally, it will call `StumpConfig::from_env`
	/// to override the toml values with newly set environment variables. This is done so that a user
	/// can set an environment variable if they prefer to not manually edit the toml.
	///
	/// ## Example
	/// ```rust
	/// use stump_core::config::StumpConfig;
	/// use std::env;
	///
	/// env::set_var("STUMP_PORT", "8080");
	/// let env = StumpConfig::load().unwrap();
	/// assert_eq!(env.port, 8080);
	/// ```
	pub fn load() -> CoreResult<StumpConfig> {
		let config_dir = get_config_dir();
		let stump_toml = config_dir.join("Stump.toml");

		let environment = if stump_toml.exists() {
			StumpConfig::from_toml(&stump_toml)?
		} else {
			debug!("Stump.toml does not exist, creating it");
			std::fs::File::create(stump_toml)?;
			debug!("Stump.toml created");
			StumpConfig::default()
		};

		// I reassign the env here to make sure it picks up changes when a user manually sets a value
		let environment = StumpConfig::from_env(Some(environment))?;
		// I then reassign the env here to make sure the vars it previously set are correct
		environment.set_env()?;

		Ok(environment)
	}

	/// Will load the [StumpConfig] object from the Stump.toml file.
	pub fn from_toml<P: AsRef<Path>>(path: P) -> CoreResult<Self> {
		let path = path.as_ref();
		let toml_str = std::fs::read_to_string(path)?;
		let partial_config = toml::from_str::<PartialStumpConfig>(&toml_str)
			.map_err(|e| CoreError::InitializationError(e.to_string()))?;

		Ok(StumpConfig::from(partial_config))
	}

	/// Will try to create a new [StumpConfig] object from set environment variables. If none are set,
	/// will return the default [StumpConfig] object.
	///
	/// ## Example
	/// ```rust
	/// use std::env;
	/// use stump_core::config::stump_config::StumpConfig;
	///
	/// env::set_var("STUMP_PORT", "8080");
	/// env::set_var("STUMP_VERBOSITY", "3");
	///
	/// let config = StumpConfig::from_env(None);
	/// assert!(env.is_ok());
	/// let config = config.unwrap();
	/// assert_eq!(config.port, 8080);
	/// assert_eq!(config.verbosity, 3);
	/// ```
	pub fn from_env(existing: Option<Self>) -> CoreResult<Self> {
		let mut config = existing.unwrap_or_default();

		if let Ok(port) = env::var("STUMP_PORT") {
			config.port = port
				.parse::<u16>()
				.map_err(|e| CoreError::InitializationError(e.to_string()))?;
		}

		if let Ok(profile) = env::var("STUMP_PROFILE") {
			if profile == "release" || profile == "debug" {
				config.profile = profile;
			} else {
				debug!("Invalid PROFILE value: {}", profile);
				config.profile = String::from("debug");
			}
		}

		if let Ok(verbosity) = env::var("STUMP_VERBOSITY") {
			config.verbosity = verbosity
				.parse::<u64>()
				.map_err(|e| CoreError::InitializationError(e.to_string()))?;
		}

		if let Ok(client_dir) = env::var("STUMP_CLIENT_DIR") {
			config.client_dir = client_dir;
		}

		if let Ok(config_dir) = env::var("STUMP_CONFIG_DIR") {
			if Path::new(&config_dir).exists() {
				config.config_dir = config_dir;
			} else {
				return Err(CoreError::ConfigDirDoesNotExist(config_dir));
			}
		}

		config.config_dir = get_config_dir().to_string_lossy().to_string();
		config.write()?;

		Ok(config)
	}

	/// Will set the environment variables to the values in the [StumpConfig] object.
	/// If the values are not set, will use the default values.
	///
	/// ## Example
	/// ```rust
	/// use std::env;
	/// use stump_core::config::StumpConfig;
	///
	/// let mut config = StumpConfig::default();
	/// config.port = 8080;
	///
	/// assert_eq!(env::var("STUMP_PORT").is_err(), true);
	/// config.set_env().unwrap();
	/// assert_eq!(env::var("STUMP_PORT").unwrap(), "8080");
	/// ```
	pub fn set_env(&self) -> CoreResult<()> {
		if self.profile != "debug" {
			env::set_var("STUMP_PROFILE", "release");
		} else {
			env::set_var("STUMP_PROFILE", "debug");
		}

		env::set_var("STUMP_PORT", self.port.to_string());
		env::set_var("STUMP_VERBOSITY", self.verbosity.to_string());

		if Path::new(self.config_dir.as_str()).exists() {
			env::set_var("STUMP_CONFIG_DIR", self.config_dir.as_str());
		}

		if Path::new(self.client_dir.as_str()).exists() {
			env::set_var("STUMP_CLIENT_DIR", self.client_dir.as_str());
		}

		if let Some(allowed_origins) = &self.allowed_origins {
			if !allowed_origins.is_empty() {
				env::set_var("STUMP_ALLOWED_ORIGINS", allowed_origins.join(","));
			}
		}

		Ok(())
	}

	/// Will write the [StumpConfig] object to the Stump.toml file.
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

impl From<PartialStumpConfig> for StumpConfig {
	fn from(partial: PartialStumpConfig) -> StumpConfig {
		let mut default = StumpConfig::default();
		default.apply_options(partial);

		default
	}
}

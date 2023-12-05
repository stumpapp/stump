use std::{env, path::PathBuf};

use serde::{Deserialize, Serialize};
use tracing::debug;

use crate::error::{CoreError, CoreResult};

/// Represents the configuration of a Stump application. This file is generated at startup
/// using a TOML file, enviroment variables, or both and is input when creating a `StumpCore`
/// instance.
///
/// Example:
/// ```
/// /// Get config dir from environment variables.
/// let config_dir = config::bootstrap_config_dir();
///
/// // Create a StumpConfig using the config file and environment variables.
/// let config = StumpConfig::new(config_dir)
/// 	// Load Stump.toml file (if any)
/// 	.with_config_file().unwrap()
/// 	// Overlay environment variables
/// 	.with_environment().unwrap();
///
/// // Ensure that config directory exists and write Stump.toml.
/// config.write_config_dir().unwrap();
///	// Create an instance of the stump core.
/// let core = StumpCore::new(config).await;
/// ```
#[derive(Serialize, Deserialize, Debug, Clone)]
pub struct StumpConfig {
	/// The "release" | "debug" profile with which the application is running.
	pub profile: String,
	/// The port from which to serve the application (default: 10801).
	pub port: u16,
	/// The verbosity with which to log errors (default: 0).
	pub verbosity: u64,
	/// An optional custom path for the database.
	pub db_path: Option<String>,
	/// The client directory.
	pub client_dir: String,
	/// The configuration root for the Stump application, cotains thumbnails, cache, and logs.
	pub config_dir: String,
	/// A list of origins for CORS.
	pub allowed_origins: Vec<String>,
	/// Path to the PDFium binary for PDF support.
	pub pdfium_path: Option<String>,
}

impl StumpConfig {
	/// Create a new `StumpConfig` isntance with a given `config_dir`
	/// configuration root and default values.
	pub fn new(config_dir: String) -> Self {
		Self {
			profile: String::from("debug"),
			port: 10801,
			verbosity: 0,
			db_path: None,
			client_dir: String::from("client"),
			config_dir,
			allowed_origins: vec![],
			pdfium_path: None,
		}
	}

	/// Create a debug version of `StumpConfig` with `config_dir`
	/// automatically set using `get_default_config_dir()` and `client_dir` set
	/// to `env!("CARGO_MANIFEST_DIR").to_string() + "/../web/dist"`.
	pub fn debug() -> Self {
		Self {
			profile: String::from("debug"),
			port: 10801,
			verbosity: 0,
			db_path: None,
			client_dir: env!("CARGO_MANIFEST_DIR").to_string() + "/../web/dist",
			config_dir: super::get_default_config_dir(),
			allowed_origins: vec![],
			pdfium_path: None,
		}
	}

	/// Looks for Stump.toml at `self.config_dir`, loading its contents and replacing
	/// stored configuration variables with those contents. If Stump.toml doesn't exist,
	/// the stored variables remain unchanged and the function returns `Ok`.
	pub fn with_config_file(mut self) -> CoreResult<Self> {
		let stump_toml = self.get_config_dir().join("Stump.toml");

		// The config file may not exist (e.g. on first startup),
		// this isn't an error, so we just return early.
		if !stump_toml.exists() {
			return Ok(self);
		}

		let toml_content_str = std::fs::read_to_string(stump_toml)?;
		let toml_configs = toml::from_str::<PartialStumpConfig>(&toml_content_str)
			.map_err(|e| CoreError::InitializationError(e.to_string()))?;

		toml_configs.apply_to_config(&mut self);
		Ok(self)
	}

	/// Loads configuration variables from the environment, replacing stored
	/// values with the environment values.
	pub fn with_environment(mut self) -> CoreResult<Self> {
		let mut env_configs = PartialStumpConfig::empty();

		if let Ok(profile) = env::var("STUMP_PROFILE") {
			if profile == "release" || profile == "debug" {
				env_configs.profile = Some(profile);
			} else {
				debug!("Invalid PROFILE value: {}", profile);
			}
		}

		if let Ok(port) = env::var("STUMP_PORT") {
			let port_u16 = port
				.parse::<u16>()
				.map_err(|e| CoreError::InitializationError(e.to_string()))?;
			env_configs.port = Some(port_u16);
		}

		if let Ok(verbosity) = env::var("STUMP_VERBOSITY") {
			let verbosity_u64 = verbosity
				.parse::<u64>()
				.map_err(|e| CoreError::InitializationError(e.to_string()))?;
			env_configs.verbosity = Some(verbosity_u64);
		}

		if let Ok(db_path) = env::var("STUMP_DB_PATH") {
			env_configs.db_path = Some(db_path);
		}

		if let Ok(client_dir) = env::var("STUMP_CLIENT_DIR") {
			env_configs.client_dir = Some(client_dir);
		}

		if let Ok(config_dir) = env::var("STUMP_CONFIG_DIR") {
			env_configs.config_dir = Some(config_dir);
		}

		if let Ok(pdfium_path) = env::var("PDFIUM_PATH") {
			env_configs.pdfium_path = Some(pdfium_path);
		}

		env_configs.apply_to_config(&mut self);
		Ok(self)
	}

	/// Ensures that the configuration directory exists and saves the `StumpConfig`'s current values
	/// to Stump.toml in the configuration directory.
	///
	/// This function first checks if `config_dir` exists and creates it if it does not, then does the
	/// same for the thumbnails and cache directories. Finally, a Stump.toml file containing the current
	/// configuration values is written. Returns `Ok` on success and `Err` if paths are misconfigured or
	/// file IO errors are encountered.
	pub fn write_config_dir(&self) -> CoreResult<()> {
		// Check that config directory is configured correctly
		let config_dir = self.get_config_dir();
		if !config_dir.is_dir() {
			return Err(CoreError::InitializationError(format!(
				"Error writing config directory: {:?} is not a directory",
				config_dir
			)));
		}
		// And create directory if it is missing.
		if !config_dir.exists() {
			match std::fs::create_dir_all(config_dir.clone()) {
				Ok(_) => (),
				Err(e) => {
					return Err(CoreError::InitializationError(format!(
						"Failed to create Stump configuration directory at {:?}: {:?}",
						config_dir,
						e.to_string()
					)));
				},
			}
		}

		// Create cache and thumbnail directories if they are missing
		let cache_dir = self.get_cache_dir();
		let thumbs_dir = self.get_thumbnails_dir();
		if !cache_dir.exists() {
			std::fs::create_dir(cache_dir).unwrap();
		}
		if !thumbs_dir.exists() {
			std::fs::create_dir(thumbs_dir).unwrap();
		}

		// Save configuration to Stump.toml
		let stump_toml = config_dir.join("Stump.toml");

		std::fs::write(
			stump_toml.as_path(),
			toml::to_string(&self)
				.map_err(|e| CoreError::InitializationError(e.to_string()))?,
		)?;

		Ok(())
	}

	/// Returns a `PathBuf` to the Stump configuration directory.
	pub fn get_config_dir(&self) -> PathBuf {
		PathBuf::from(&self.config_dir)
	}

	/// Returns a `PathBuf` to the Stump cache directory.
	pub fn get_cache_dir(&self) -> PathBuf {
		PathBuf::from(&self.config_dir).join("cache")
	}

	/// Returns a `PathBuf` to the Stump thumbnails directory.
	pub fn get_thumbnails_dir(&self) -> PathBuf {
		PathBuf::from(&self.config_dir).join("thumbnails")
	}

	/// Returns a `PathBuf` to the Stump log file.
	pub fn get_log_file(&self) -> PathBuf {
		self.get_config_dir().join("Stump.log")
	}
}

#[derive(Serialize, Deserialize, Debug, Clone)]
pub struct PartialStumpConfig {
	pub profile: Option<String>,
	pub port: Option<u16>,
	pub verbosity: Option<u64>,
	pub db_path: Option<String>,
	pub client_dir: Option<String>,
	pub config_dir: Option<String>,
	pub allowed_origins: Option<Vec<String>>,
	pub pdfium_path: Option<String>,
}

impl PartialStumpConfig {
	pub fn empty() -> Self {
		Self {
			profile: None,
			port: None,
			verbosity: None,
			db_path: None,
			client_dir: None,
			config_dir: None,
			allowed_origins: None,
			pdfium_path: None,
		}
	}

	pub fn apply_to_config(self, config: &mut StumpConfig) {
		// Port
		if let Some(port) = self.port {
			config.port = port;
		}
		// Verbosity
		if let Some(verbosity) = self.verbosity {
			config.verbosity = verbosity;
		}
		// DB Path
		if let Some(db_path) = self.db_path {
			config.db_path = Some(db_path);
		}
		// Client Directory
		if let Some(client_dir) = self.client_dir {
			config.client_dir = client_dir;
		}
		// Config Directory
		if let Some(config_dir) = self.config_dir {
			config.config_dir = config_dir;
		}

		// Profile - validate profile selection
		if let Some(profile) = self.profile {
			if profile == "release" || profile == "debug" {
				config.profile = profile;
			} else {
				debug!("Invalid PROFILE value: {}", profile);
			}
		}

		// Allowed Origins - merge lists
		if let Some(origins) = self.allowed_origins {
			let orig_origins = config.allowed_origins.clone();
			config
				.allowed_origins
				.extend(origins.into_iter().filter(|x| !orig_origins.contains(x)));
		}

		// Pdfium Path - Merge if not None
		if let Some(pdfium_path) = self.pdfium_path {
			config.pdfium_path = Some(pdfium_path);
		}
	}
}

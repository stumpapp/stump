use std::{env, path::PathBuf};

use itertools::Itertools;
use serde::{Deserialize, Serialize};
use tracing::debug;

use crate::error::{CoreError, CoreResult};

pub const CONFIG_DIR_KEY: &str = "STUMP_CONFIG_DIR";
pub const IN_DOCKER_KEY: &str = "STUMP_IN_DOCKER";
const PROFILE_KEY: &str = "STUMP_PROFILE";
const PORT_KEY: &str = "STUMP_PORT";
const VERBOSITY_KEY: &str = "STUMP_VERBOSITY";
const DB_PATH_KEY: &str = "STUMP_DB_PATH";
const CLIENT_KEY: &str = "STUMP_CLIENT_DIR";
const ORIGINS_KEY: &str = "STUMP_ALLOWED_ORIGINS";
const PDFIUM_KEY: &str = "PDFIUM_PATH";
const DISABLE_SWAGGER_KEY: &str = "DISABLE_SWAGGER_UI";
const HASH_COST_KEY: &str = "HASH_COST";
const SESSION_TTL_KEY: &str = "SESSION_TTL";
const SESSION_EXPIRY_INTERVAL_KEY: &str = "SESSION_EXPIRY_CLEANUP_INTERVAL";
const ENABLE_WAL_KEY: &str = "ENABLE_WAL";

const DEFAULT_HASH_COST: u32 = 12;
const DEFAULT_SESSION_TTL: i64 = 3600 * 24 * 3; // 3 days
const DEFAULT_SESSION_EXPIRY_CLEANUP_INTERVAL: u64 = 60 * 60 * 24; // 24 hours
const DEFAULT_ENABLE_WAL: bool = false;

/// Represents the configuration of a Stump application. This file is generated at startup
/// using a TOML file, environment variables, or both and is input when creating a `StumpCore`
/// instance.
///
/// Example:
/// ```
/// use stump_core::{config::{self, StumpConfig}, StumpCore};
///
/// #[tokio::main]
/// async fn main() {
/// 	/// Get config dir from environment variables.
/// 	let config_dir = config::bootstrap_config_dir();
///
/// 	// Create a StumpConfig using the config file and environment variables.
/// 	let config = StumpConfig::new(config_dir)
/// 		// Load Stump.toml file (if any)
/// 		.with_config_file().unwrap()
/// 		// Overlay environment variables
/// 		.with_environment().unwrap();
///
/// 	// Ensure that config directory exists and write Stump.toml.
/// 	config.write_config_dir().unwrap();
/// 	// Create an instance of the stump core.
/// 	let core = StumpCore::new(config).await;
/// }
/// ```
#[derive(Serialize, Deserialize, Debug, Clone, PartialEq)]
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
	/// Indicates if the Swagger UI should be disabled.
	pub disable_swagger: bool,
	/// Password hash cost
	pub hash_cost: u32,
	/// TODO What is this?
	pub session_ttl: i64,
	/// TODO What is this?
	pub session_expiry_cleanup_interval: u64,
	/// Indicates whether the prisma client will support write-ahead logging.
	pub enable_wal: bool,
}

impl StumpConfig {
	/// Create a new `StumpConfig` instance with a given `config_dir` as
	/// the configuration root and default values for other variables.
	pub fn new(config_dir: String) -> Self {
		Self {
			profile: String::from("debug"),
			port: 10801,
			verbosity: 0,
			db_path: None,
			client_dir: String::from("./dist"),
			config_dir,
			allowed_origins: vec![],
			pdfium_path: None,
			disable_swagger: false,
			hash_cost: DEFAULT_HASH_COST,
			session_ttl: DEFAULT_SESSION_TTL,
			session_expiry_cleanup_interval: DEFAULT_SESSION_EXPIRY_CLEANUP_INTERVAL,
			enable_wal: DEFAULT_ENABLE_WAL,
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
			disable_swagger: false,
			hash_cost: DEFAULT_HASH_COST,
			session_ttl: DEFAULT_SESSION_TTL,
			session_expiry_cleanup_interval: DEFAULT_SESSION_EXPIRY_CLEANUP_INTERVAL,
			enable_wal: DEFAULT_ENABLE_WAL,
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

		if let Ok(profile) = env::var(PROFILE_KEY) {
			if profile == "release" || profile == "debug" {
				env_configs.profile = Some(profile);
			} else {
				debug!("Invalid PROFILE value: {}", profile);
			}
		}

		if let Ok(port) = env::var(PORT_KEY) {
			let port_u16 = port
				.parse::<u16>()
				.map_err(|e| CoreError::InitializationError(e.to_string()))?;
			env_configs.port = Some(port_u16);
		}

		if let Ok(verbosity) = env::var(VERBOSITY_KEY) {
			let verbosity_u64 = verbosity
				.parse::<u64>()
				.map_err(|e| CoreError::InitializationError(e.to_string()))?;
			env_configs.verbosity = Some(verbosity_u64);
		}

		if let Ok(db_path) = env::var(DB_PATH_KEY) {
			env_configs.db_path = Some(db_path);
		}

		if let Ok(client_dir) = env::var(CLIENT_KEY) {
			env_configs.client_dir = Some(client_dir);
		}

		if let Ok(config_dir) = env::var(CONFIG_DIR_KEY) {
			env_configs.config_dir = Some(config_dir);
		}

		if let Ok(allowed_origins) = env::var(ORIGINS_KEY) {
			if !allowed_origins.is_empty() {
				env_configs.allowed_origins = Some(
					allowed_origins
						.split(',')
						.map(|val| val.trim().to_string())
						.collect_vec(),
				)
			}
		};

		if let Ok(pdfium_path) = env::var(PDFIUM_KEY) {
			env_configs.pdfium_path = Some(pdfium_path);
		}

		if let Ok(hash_cost) = env::var(HASH_COST_KEY) {
			if let Ok(val) = hash_cost.parse() {
				env_configs.hash_cost = Some(val);
			}
		}

		if let Ok(disable_swagger) = env::var(DISABLE_SWAGGER_KEY) {
			if let Ok(val) = disable_swagger.parse() {
				env_configs.disable_swagger = Some(val);
			}
		}

		if let Ok(session_ttl) = env::var(SESSION_TTL_KEY) {
			match session_ttl.parse() {
				Ok(val) => env_configs.session_ttl = Some(val),
				Err(e) => tracing::error!(?e, "Failed to parse provided SESSION_TTL"),
			}
		}

		if let Ok(session_expiry_interval) = env::var(SESSION_EXPIRY_INTERVAL_KEY) {
			match session_expiry_interval.parse() {
				Ok(val) => env_configs.session_expiry_cleanup_interval = Some(val),
				Err(e) => tracing::error!(
					?e,
					"Failed to parse provided SESSION_EXPIRY_CLEANUP_INTERVAL"
				),
			}
		}

		if let Ok(enable_wal) = env::var(ENABLE_WAL_KEY) {
			match enable_wal.parse() {
				Ok(val) => env_configs.enable_wal = Some(val),
				Err(e) => tracing::error!(?e, "Failed to parse ENABLE_WAL"),
			}
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

	/// Returns True if the configuration profile is "debug" and False otherwise.
	pub fn is_debug(&self) -> bool {
		self.profile.as_str() == "debug"
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

#[derive(Serialize, Deserialize, Debug, Clone, PartialEq)]
pub struct PartialStumpConfig {
	pub profile: Option<String>,
	pub port: Option<u16>,
	pub verbosity: Option<u64>,
	pub db_path: Option<String>,
	pub client_dir: Option<String>,
	pub config_dir: Option<String>,
	pub allowed_origins: Option<Vec<String>>,
	pub pdfium_path: Option<String>,
	pub disable_swagger: Option<bool>,
	pub hash_cost: Option<u32>,
	pub session_ttl: Option<i64>,
	pub session_expiry_cleanup_interval: Option<u64>,
	pub enable_wal: Option<bool>,
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
			disable_swagger: None,
			hash_cost: None,
			session_ttl: None,
			session_expiry_cleanup_interval: None,
			enable_wal: None,
		}
	}

	pub fn apply_to_config(self, config: &mut StumpConfig) {
		if let Some(port) = self.port {
			config.port = port;
		}
		if let Some(verbosity) = self.verbosity {
			config.verbosity = verbosity;
		}
		if let Some(db_path) = self.db_path {
			config.db_path = Some(db_path);
		}
		if let Some(client_dir) = self.client_dir {
			config.client_dir = client_dir;
		}
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
		// Disable Swagger - Merge if not None
		if let Some(disable_swagger) = self.disable_swagger {
			config.disable_swagger = disable_swagger;
		}
		// Hash Cost - Merge if not None
		if let Some(hash_cost) = self.hash_cost {
			config.hash_cost = hash_cost;
		}
		// Session TTL - Merge if not None
		if let Some(session_ttl) = self.session_ttl {
			config.session_ttl = session_ttl;
		}
		// Session Expiry Cleanup Interval - Merge if not None
		if let Some(cleanup_interval) = self.session_expiry_cleanup_interval {
			config.session_expiry_cleanup_interval = cleanup_interval;
		}
		// Enable WAL - Merge if not None
		if let Some(enable_wal) = self.enable_wal {
			config.enable_wal = enable_wal;
		}
	}
}

#[cfg(test)]
mod tests {
	use std::fs;

	use tempfile;

	use super::*;

	#[test]
	fn test_apply_partial_to_debug() {
		let mut config = StumpConfig::debug();
		config.allowed_origins = vec!["origin1".to_string(), "origin2".to_string()];

		let partial_config = PartialStumpConfig {
			profile: Some("release".to_string()),
			port: Some(1337),
			verbosity: Some(3),
			db_path: Some("not_a_real_path".to_string()),
			client_dir: Some("not_a_real_dir".to_string()),
			config_dir: Some("also_not_a_real_dir".to_string()),
			allowed_origins: Some(vec![
				"origin1".to_string(),
				"origin3".to_string(),
				"origin2".to_string(),
			]),
			pdfium_path: Some("not_a_path_to_pdfium".to_string()),
			disable_swagger: Some(true),
			hash_cost: Some(24),
			session_ttl: Some(3600 * 24),
			session_expiry_cleanup_interval: Some(60 * 60 * 8),
			enable_wal: Some(true),
		};

		// Apply the partial configuration
		partial_config.apply_to_config(&mut config);

		// Check that values are as expected
		assert_eq!(
			config,
			StumpConfig {
				profile: "release".to_string(),
				port: 1337,
				verbosity: 3,
				db_path: Some("not_a_real_path".to_string()),
				client_dir: "not_a_real_dir".to_string(),
				config_dir: "also_not_a_real_dir".to_string(),
				allowed_origins: vec![
					"origin1".to_string(),
					"origin2".to_string(),
					"origin3".to_string()
				],
				pdfium_path: Some("not_a_path_to_pdfium".to_string()),
				disable_swagger: true,
				hash_cost: 24,
				session_ttl: 3600 * 24,
				session_expiry_cleanup_interval: 60 * 60 * 8,
				enable_wal: true,
			}
		);
	}

	#[test]
	fn test_getting_config_from_environment() {
		// Set environment variables
		env::set_var(PROFILE_KEY, "release");
		env::set_var(PORT_KEY, "1337");
		env::set_var(VERBOSITY_KEY, "3");
		env::set_var(DB_PATH_KEY, "not_a_real_path");
		env::set_var(CLIENT_KEY, "not_a_real_dir");
		env::set_var(CONFIG_DIR_KEY, "also_not_a_real_dir");
		env::set_var(DISABLE_SWAGGER_KEY, "true");
		env::set_var(HASH_COST_KEY, "24");
		env::set_var(SESSION_TTL_KEY, (3600 * 24).to_string());
		env::set_var(SESSION_EXPIRY_INTERVAL_KEY, (60 * 60 * 8).to_string());
		env::set_var(ENABLE_WAL_KEY, "true".to_string());

		// Create a new StumpConfig and load values from the environment.
		let config = StumpConfig::new("not_a_dir".to_string())
			.with_environment()
			.unwrap();

		// Confirm values are as expected
		assert_eq!(
			config,
			StumpConfig {
				profile: "release".to_string(),
				port: 1337,
				verbosity: 3,
				db_path: Some("not_a_real_path".to_string()),
				client_dir: "not_a_real_dir".to_string(),
				config_dir: "also_not_a_real_dir".to_string(),
				allowed_origins: vec![],
				pdfium_path: None,
				disable_swagger: true,
				hash_cost: 24,
				session_ttl: 3600 * 24,
				session_expiry_cleanup_interval: 60 * 60 * 8,
				enable_wal: true,
			}
		);
	}

	#[test]
	fn test_getting_config_from_toml() {
		// Create temporary directory and place a copy of our mock Stump.toml in it
		let tempdir = tempfile::tempdir().expect("Failed to create temporary directory");
		let temp_config_file_path = tempdir.path().join("Stump.toml");
		fs::write(temp_config_file_path, get_mock_config_file())
			.expect("Failed to write temporary Stump.toml");

		// Now we can create a StumpConfig rooted at the temporary directory and load the values
		let config_dir = tempdir.path().to_string_lossy().to_string();
		let config = StumpConfig::new(config_dir).with_config_file().unwrap();

		// Check that values are as expected
		assert_eq!(
			config,
			StumpConfig {
				profile: "release".to_string(),
				port: 1337,
				verbosity: 3,
				db_path: Some("not_a_real_path".to_string()),
				client_dir: "not_a_real_dir".to_string(),
				config_dir: "also_not_a_real_dir".to_string(),
				allowed_origins: vec!["origin1".to_string(), "origin2".to_string()],
				pdfium_path: Some("not_a_path_to_pdfium".to_string()),
				disable_swagger: false,
				hash_cost: DEFAULT_HASH_COST,
				session_ttl: DEFAULT_SESSION_TTL,
				session_expiry_cleanup_interval: DEFAULT_SESSION_EXPIRY_CLEANUP_INTERVAL,
				enable_wal: DEFAULT_ENABLE_WAL,
			}
		);

		// Ensure that the temporary directory is deleted
		tempdir
			.close()
			.expect("Failed to delete temporary directory");
	}

	#[test]
	fn test_writing_to_config_dir() {
		let tempdir = tempfile::tempdir().expect("Failed to create temporary directory");

		// Now we can create a StumpConfig rooted at the temporary directory
		let config_dir = tempdir.path().to_string_lossy().to_string();
		let mut config = StumpConfig::new(config_dir.clone());

		// Apply a partial config to set the values
		let partial_config = PartialStumpConfig {
			profile: Some("release".to_string()),
			port: Some(1337),
			verbosity: Some(3),
			db_path: Some("not_a_real_path".to_string()),
			client_dir: Some("not_a_real_dir".to_string()),
			config_dir: None,
			allowed_origins: Some(vec!["origin1".to_string(), "origin2".to_string()]),
			pdfium_path: Some("not_a_path_to_pdfium".to_string()),
			disable_swagger: Some(false),
			hash_cost: None,
			session_ttl: None,
			session_expiry_cleanup_interval: None,
			enable_wal: None,
		};
		partial_config.apply_to_config(&mut config);

		// Write to the config directory
		config.write_config_dir().unwrap();

		// Load the toml that should have been created
		let new_toml_path = tempdir.path().join("Stump.toml");
		let new_toml_content = std::fs::read_to_string(new_toml_path).unwrap();
		let new_toml_vals =
			toml::from_str::<PartialStumpConfig>(&new_toml_content).unwrap();

		// And check its values against what we expect
		assert_eq!(
			new_toml_vals,
			PartialStumpConfig {
				profile: Some("release".to_string()),
				port: Some(1337),
				verbosity: Some(3),
				db_path: Some("not_a_real_path".to_string()),
				client_dir: Some("not_a_real_dir".to_string()),
				config_dir: Some(config_dir),
				allowed_origins: Some(vec!["origin1".to_string(), "origin2".to_string()]),
				pdfium_path: Some("not_a_path_to_pdfium".to_string()),
				disable_swagger: Some(false),
				hash_cost: Some(DEFAULT_HASH_COST),
				session_ttl: Some(DEFAULT_SESSION_TTL),
				session_expiry_cleanup_interval: Some(
					DEFAULT_SESSION_EXPIRY_CLEANUP_INTERVAL
				),
				enable_wal: Some(DEFAULT_ENABLE_WAL)
			}
		);

		// Ensure that the temporary directory is deleted
		tempdir
			.close()
			.expect("Failed to delete temporary directory");
	}

	fn get_mock_config_file() -> String {
		let mock_config_path = PathBuf::from(env!("CARGO_MANIFEST_DIR"))
			.join("integration-tests/data/mock-stump.toml");

		fs::read_to_string(mock_config_path).expect("Failed to fetch mock config file")
	}
}

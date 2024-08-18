//! Contains the [StumpConfig] struct and related functions for loading and saving configuration
//! values for a Stump application.
//!
//! Note: [StumpConfig] is constructed _before_ tracing is initializing. This is because the
//! configuration is used to determine the log file path and verbosity level. This means that any
//! logging that occurs during the construction of the [StumpConfig] should be done using the
//! standard `println!` or `eprintln!` macros.

use std::{env, path::PathBuf};

use itertools::Itertools;
use serde::{Deserialize, Serialize};

use crate::{CoreError, CoreResult};
use stump_config_gen::StumpConfigGenerator;

pub mod env_keys {
	pub const CONFIG_DIR_KEY: &str = "STUMP_CONFIG_DIR";
	pub const IN_DOCKER_KEY: &str = "STUMP_IN_DOCKER";
	pub const PROFILE_KEY: &str = "STUMP_PROFILE";
	pub const PORT_KEY: &str = "STUMP_PORT";
	pub const VERBOSITY_KEY: &str = "STUMP_VERBOSITY";
	pub const PRETTY_LOGS_KEY: &str = "STUMP_PRETTY_LOGS";
	pub const DB_PATH_KEY: &str = "STUMP_DB_PATH";
	pub const CLIENT_KEY: &str = "STUMP_CLIENT_DIR";
	pub const ORIGINS_KEY: &str = "STUMP_ALLOWED_ORIGINS";
	pub const PDFIUM_KEY: &str = "PDFIUM_PATH";
	pub const DISABLE_SWAGGER_KEY: &str = "DISABLE_SWAGGER_UI";
	pub const HASH_COST_KEY: &str = "HASH_COST";
	pub const SESSION_TTL_KEY: &str = "SESSION_TTL";
	pub const SESSION_EXPIRY_INTERVAL_KEY: &str = "SESSION_EXPIRY_CLEANUP_INTERVAL";
	pub const SCANNER_CHUNK_SIZE_KEY: &str = "STUMP_SCANNER_CHUNK_SIZE";
}
use env_keys::*;

pub mod defaults {
	pub const DEFAULT_PASSWORD_HASH_COST: u32 = 12;
	pub const DEFAULT_SESSION_TTL: i64 = 3600 * 24 * 3; // 3 days
	pub const DEFAULT_SESSION_EXPIRY_CLEANUP_INTERVAL: u64 = 60 * 60 * 24; // 24 hours
	pub const DEFAULT_SCANNER_CHUNK_SIZE: usize = 100;
}
use defaults::*;

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
///   /// Get config dir from environment variables.
///   let config_dir = config::bootstrap_config_dir();
///
///   // Create a StumpConfig using the config file and environment variables.
///   let config = StumpConfig::new(config_dir)
///     // Load Stump.toml file (if any)
///     .with_config_file().unwrap()
///     // Overlay environment variables
///     .with_environment().unwrap();
///
///   // Ensure that config directory exists and write Stump.toml.
///   config.write_config_dir().unwrap();
///   // Create an instance of the stump core.
///   let core = StumpCore::new(config).await;
/// }
/// ```
#[derive(StumpConfigGenerator, Serialize, Deserialize, Debug, Clone, PartialEq)]
#[config_file_location(self.get_config_dir().join("Stump.toml"))]
pub struct StumpConfig {
	/// The "release" | "debug" profile with which the application is running.
	#[default_value("debug".to_string())]
	#[env_key(PROFILE_KEY)]
	#[validator(do_validate_profile)]
	pub profile: String,

	/// The port from which to serve the application (default: 10801).
	#[default_value(10801)]
	#[env_key(PORT_KEY)]
	pub port: u16,

	/// The verbosity with which to log errors (default: 0).
	#[default_value(0)]
	#[env_key(VERBOSITY_KEY)]
	pub verbosity: u64,

	/// Whether or not to pretty print logs.
	#[default_value(true)]
	#[env_key(PRETTY_LOGS_KEY)]
	pub pretty_logs: bool,

	/// An optional custom path for the database.
	#[default_value(None)]
	#[env_key(DB_PATH_KEY)]
	pub db_path: Option<String>,

	/// The client directory.
	#[default_value("./dist".to_string())]
	#[debug_value(env!("CARGO_MANIFEST_DIR").to_string() + "/../web/dist")]
	#[env_key(CLIENT_KEY)]
	pub client_dir: String,

	/// An optional custom path for the templates directory.
	#[default_value(None)]
	#[env_key("EMAIL_TEMPLATES_DIR")]
	pub custom_templates_dir: Option<String>,

	/// The configuration root for the Stump application, contains thumbnails, cache, and logs.
	#[debug_value(super::get_default_config_dir())]
	#[env_key(CONFIG_DIR_KEY)]
	#[required_by_new]
	pub config_dir: String,

	/// A list of origins for CORS.
	#[default_value(vec![])]
	#[env_key(ORIGINS_KEY)]
	pub allowed_origins: Vec<String>,

	/// Path to the PDFium binary for PDF support.
	#[default_value(None)]
	#[env_key(PDFIUM_KEY)]
	pub pdfium_path: Option<String>,

	/// Indicates if the Swagger UI should be disabled.
	#[default_value(false)]
	#[env_key(DISABLE_SWAGGER_KEY)]
	pub disable_swagger: bool,

	/// Password hash cost
	#[default_value(DEFAULT_PASSWORD_HASH_COST)]
	#[env_key(HASH_COST_KEY)]
	pub password_hash_cost: u32,

	/// The time in seconds that a login session will be valid for.
	#[default_value(DEFAULT_SESSION_TTL)]
	#[env_key(SESSION_TTL_KEY)]
	pub session_ttl: i64,

	/// The interval at which automatic deleted session cleanup is performed.
	#[default_value(DEFAULT_SESSION_EXPIRY_CLEANUP_INTERVAL)]
	#[env_key(SESSION_EXPIRY_INTERVAL_KEY)]
	pub expired_session_cleanup_interval: u64,

	/// The size of chunks to use throughout scanning the filesystem. This is used to
	/// limit the number of files that are processed at once. Realistically, you are bound
	/// by I/O constraints, but perhaps you can squeeze out some performance by tweaking this.
	#[default_value(DEFAULT_SCANNER_CHUNK_SIZE)]
	#[env_key(SCANNER_CHUNK_SIZE_KEY)]
	pub scanner_chunk_size: usize,
}

impl StumpConfig {
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
		if config_dir.is_file() {
			return Err(CoreError::InitializationError(format!(
				"Error writing config directory: {:?} is a file",
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
		let avatars_dir = self.get_avatars_dir();
		if !cache_dir.exists() {
			std::fs::create_dir(cache_dir).unwrap();
		}
		if !thumbs_dir.exists() {
			std::fs::create_dir(thumbs_dir).unwrap();
		}
		if !avatars_dir.exists() {
			std::fs::create_dir(avatars_dir).unwrap();
		}

		// Save configuration to Stump.toml
		let stump_toml = config_dir.join("Stump.toml");

		std::fs::write(
			stump_toml.as_path(),
			toml::to_string(&self).map_err(|e| {
				eprintln!("Failed to serialize StumpConfig to toml: {}", e);
				CoreError::InitializationError(e.to_string())
			})?,
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

	/// Returns a `PathBuf` to the Stump templates directory.
	pub fn get_templates_dir(&self) -> PathBuf {
		self.custom_templates_dir.clone().map_or_else(
			|| PathBuf::from(&self.config_dir).join("templates"),
			PathBuf::from,
		)
	}

	/// Returns a `PathBuf` to the Stump avatars directory
	pub fn get_avatars_dir(&self) -> PathBuf {
		PathBuf::from(&self.config_dir).join("avatars")
	}

	/// Returns a `PathBuf` to the Stump log file.
	pub fn get_log_file(&self) -> PathBuf {
		self.get_config_dir().join("Stump.log")
	}
}

fn do_validate_profile(profile: &String) -> bool {
	if profile == "release" || profile == "debug" {
		return true;
	}

	eprintln!("Invalid profile value: {}", profile);
	false
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
			pretty_logs: Some(true),
			db_path: Some("not_a_real_path".to_string()),
			client_dir: Some("not_a_real_dir".to_string()),
			config_dir: Some("also_not_a_real_dir".to_string()),
			custom_templates_dir: None,
			allowed_origins: Some(vec![
				"origin1".to_string(),
				"origin3".to_string(),
				"origin2".to_string(),
			]),
			pdfium_path: Some("not_a_path_to_pdfium".to_string()),
			disable_swagger: Some(true),
			password_hash_cost: Some(24),
			session_ttl: Some(3600 * 24),
			expired_session_cleanup_interval: Some(60 * 60 * 8),
			scanner_chunk_size: Some(300),
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
				pretty_logs: true,
				db_path: Some("not_a_real_path".to_string()),
				client_dir: "not_a_real_dir".to_string(),
				config_dir: "also_not_a_real_dir".to_string(),
				custom_templates_dir: None,
				allowed_origins: vec![
					"origin1".to_string(),
					"origin2".to_string(),
					"origin3".to_string()
				],
				pdfium_path: Some("not_a_path_to_pdfium".to_string()),
				disable_swagger: true,
				password_hash_cost: 24,
				session_ttl: 3600 * 24,
				expired_session_cleanup_interval: 60 * 60 * 8,
				scanner_chunk_size: 300,
			}
		);
	}

	#[test]
	fn test_getting_config_from_environment() {
		temp_env::with_vars(
			[
				(PROFILE_KEY, Some("release")),
				(PORT_KEY, Some("1337")),
				(VERBOSITY_KEY, Some("2")),
				(DB_PATH_KEY, Some("not_a_real_path")),
				(CLIENT_KEY, Some("not_a_real_dir")),
				(CONFIG_DIR_KEY, Some("also_not_a_real_dir")),
				(DISABLE_SWAGGER_KEY, Some("true")),
				(HASH_COST_KEY, Some("24")),
				(SESSION_TTL_KEY, Some(&(3600 * 24).to_string())),
				(
					SESSION_EXPIRY_INTERVAL_KEY,
					Some(&(60 * 60 * 8).to_string()),
				),
			],
			|| {
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
						verbosity: 2,
						pretty_logs: true,
						db_path: Some("not_a_real_path".to_string()),
						client_dir: "not_a_real_dir".to_string(),
						config_dir: "also_not_a_real_dir".to_string(),
						allowed_origins: vec![],
						pdfium_path: None,
						disable_swagger: true,
						password_hash_cost: 24,
						session_ttl: 3600 * 24,
						expired_session_cleanup_interval: 60 * 60 * 8,
						scanner_chunk_size: DEFAULT_SCANNER_CHUNK_SIZE,
						custom_templates_dir: None,
					}
				);
			},
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
				pretty_logs: true,
				db_path: Some("not_a_real_path".to_string()),
				client_dir: "not_a_real_dir".to_string(),
				config_dir: "also_not_a_real_dir".to_string(),
				custom_templates_dir: None,
				allowed_origins: vec!["origin1".to_string(), "origin2".to_string()],
				pdfium_path: Some("not_a_path_to_pdfium".to_string()),
				disable_swagger: false,
				password_hash_cost: DEFAULT_PASSWORD_HASH_COST,
				session_ttl: DEFAULT_SESSION_TTL,
				expired_session_cleanup_interval: DEFAULT_SESSION_EXPIRY_CLEANUP_INTERVAL,
				scanner_chunk_size: DEFAULT_SCANNER_CHUNK_SIZE,
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
			pretty_logs: Some(true),
			db_path: Some("not_a_real_path".to_string()),
			client_dir: Some("not_a_real_dir".to_string()),
			custom_templates_dir: None,
			config_dir: None,
			allowed_origins: Some(vec!["origin1".to_string(), "origin2".to_string()]),
			pdfium_path: Some("not_a_path_to_pdfium".to_string()),
			disable_swagger: Some(false),
			password_hash_cost: None,
			session_ttl: None,
			expired_session_cleanup_interval: None,
			scanner_chunk_size: None,
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
				pretty_logs: Some(true),
				db_path: Some("not_a_real_path".to_string()),
				client_dir: Some("not_a_real_dir".to_string()),
				config_dir: Some(config_dir),
				custom_templates_dir: None,
				allowed_origins: Some(vec!["origin1".to_string(), "origin2".to_string()]),
				pdfium_path: Some("not_a_path_to_pdfium".to_string()),
				disable_swagger: Some(false),
				password_hash_cost: Some(DEFAULT_PASSWORD_HASH_COST),
				session_ttl: Some(DEFAULT_SESSION_TTL),
				expired_session_cleanup_interval: Some(
					DEFAULT_SESSION_EXPIRY_CLEANUP_INTERVAL
				),
				scanner_chunk_size: Some(DEFAULT_SCANNER_CHUNK_SIZE),
			}
		);

		// Ensure that the temporary directory is deleted
		tempdir
			.close()
			.expect("Failed to delete temporary directory");
	}

	#[test]
	fn test_simulate_first_boot() {
		temp_env::with_vars(
			[
				(PORT_KEY, Some("1337")),
				(VERBOSITY_KEY, Some("2")),
				(DISABLE_SWAGGER_KEY, Some("true")),
				(HASH_COST_KEY, Some("1")),
			],
			|| {
				let tempdir =
					tempfile::tempdir().expect("Failed to create temporary directory");
				// Now we can create a StumpConfig rooted at the temporary directory
				let config_dir = tempdir.path().to_string_lossy().to_string();
				let generated = StumpConfig::new(config_dir.clone())
					.with_config_file()
					.expect("Failed to generate StumpConfig from Stump.toml")
					.with_environment()
					.expect("Failed to generate StumpConfig from environment");

				assert_eq!(
					generated,
					StumpConfig {
						profile: "debug".to_string(),
						port: 1337,
						verbosity: 2,
						pretty_logs: true,
						db_path: None,
						client_dir: "./dist".to_string(),
						config_dir,
						allowed_origins: vec![],
						pdfium_path: None,
						disable_swagger: true,
						password_hash_cost: 1,
						session_ttl: DEFAULT_SESSION_TTL,
						expired_session_cleanup_interval:
							DEFAULT_SESSION_EXPIRY_CLEANUP_INTERVAL,
						scanner_chunk_size: DEFAULT_SCANNER_CHUNK_SIZE,
						custom_templates_dir: None,
					}
				);
			},
		);
	}

	fn get_mock_config_file() -> String {
		let mock_config_path = PathBuf::from(env!("CARGO_MANIFEST_DIR"))
			.join("integration-tests/data/mock-stump.toml");

		fs::read_to_string(mock_config_path).expect("Failed to fetch mock config file")
	}
}

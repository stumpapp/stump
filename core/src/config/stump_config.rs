//! Contains the [`StumpConfig`] struct and related functions for loading and saving configuration
//! values for a Stump application.
//!
//! Note: [`StumpConfig`] is constructed _before_ tracing is initializing. This is because the
//! configuration is used to determine the log file path and verbosity level. This means that any
//! logging that occurs during the construction of the [`StumpConfig`] should be done using the
//! standard `println!` or `eprintln!` macros.

use std::{env, path::PathBuf};

use async_graphql::SimpleObject;
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
	pub const ENABLE_SWAGGER_KEY: &str = "ENABLE_SWAGGER_UI";
	pub const ENABLE_KOREADER_SYNC_KEY: &str = "ENABLE_KOREADER_SYNC";
	pub const HASH_COST_KEY: &str = "HASH_COST";
	pub const SESSION_TTL_KEY: &str = "SESSION_TTL";
	pub const SESSION_EXPIRY_INTERVAL_KEY: &str = "SESSION_EXPIRY_CLEANUP_INTERVAL";
	pub const MAX_SCANNER_CONCURRENCY_KEY: &str = "STUMP_MAX_SCANNER_CONCURRENCY";
	pub const MAX_THUMBNAIL_CONCURRENCY_KEY: &str = "STUMP_MAX_THUMBNAIL_CONCURRENCY";
	pub const MAX_IMAGE_UPLOAD_SIZE_KEY: &str = "STUMP_MAX_IMAGE_UPLOAD_SIZE";
	pub const ENABLE_UPLOAD_KEY: &str = "STUMP_ENABLE_UPLOAD";
	pub const MAX_FILE_UPLOAD_SIZE_KEY: &str = "STUMP_MAX_FILE_UPLOAD_SIZE";
}
use env_keys::*;

pub mod defaults {
	pub const DEFAULT_PASSWORD_HASH_COST: u32 = 12;
	pub const DEFAULT_SESSION_TTL: i64 = 3600 * 24 * 3; // 3 days
	pub const DEFAULT_ACCESS_TOKEN_TTL: i64 = 3600 * 24; // 1 days
	pub const DEFAULT_REFRESH_TOKEN_TTL: i64 = 3600 * 24 * 30; // 30 days
	pub const DEFAULT_SESSION_EXPIRY_CLEANUP_INTERVAL: u64 = 60 * 60 * 24; // 24 hours
	pub const DEFAULT_MAX_SCANNER_CONCURRENCY: usize = 200;
	pub const DEFAULT_MAX_THUMBNAIL_CONCURRENCY: usize = 10;
	pub const DEFAULT_MAX_IMAGE_UPLOAD_SIZE: usize = 20 * 1024 * 1024; // 20 MB
	pub const DEFAULT_ENABLE_UPLOAD: bool = false;
	pub const DEFAULT_MAX_FILE_UPLOAD_SIZE: usize = 20 * 1024 * 1024; // 20 MB
}
use defaults::*;

/// Represents the configuration of a Stump application. This struct is generated at startup
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
#[derive(
	StumpConfigGenerator,
	Serialize,
	Deserialize,
	Debug,
	Clone,
	PartialEq,
	specta::Type,
	SimpleObject,
)]
#[graphql(name = "StumpConfig")]
#[config_file_location(self.get_config_dir().join("Stump.toml"))]
pub struct StumpConfig {
	/// The "release" | "debug" profile with which the application is running.
	#[default_value("release".to_string())]
	#[debug_value("debug".to_string())]
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
	#[default_value("./client".to_string())]
	#[debug_value(env!("CARGO_MANIFEST_DIR").to_string() + "/../web/dist")]
	#[env_key(CLIENT_KEY)]
	pub client_dir: String,

	/// An optional custom path for the templates directory.
	#[default_value(None)]
	#[debug_value(Some(env!("CARGO_MANIFEST_DIR").to_string() + "/../../crates/email/templates"))]
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
	#[env_key(ENABLE_SWAGGER_KEY)]
	pub enable_swagger: bool,

	/// Indicates if the KoReader sync feature should be enabled.
	#[default_value(false)]
	#[env_key(ENABLE_KOREADER_SYNC_KEY)]
	pub enable_koreader_sync: bool,

	/// Password hash cost
	#[default_value(DEFAULT_PASSWORD_HASH_COST)]
	#[env_key(HASH_COST_KEY)]
	pub password_hash_cost: u32,

	/// The time in seconds that a login session will be valid for.
	#[default_value(DEFAULT_SESSION_TTL)]
	#[env_key(SESSION_TTL_KEY)]
	pub session_ttl: i64,

	#[default_value(DEFAULT_ACCESS_TOKEN_TTL)]
	#[env_key("ACCESS_TOKEN_TTL")]
	pub access_token_ttl: i64,

	#[default_value(DEFAULT_REFRESH_TOKEN_TTL)]
	#[env_key("REFRESH_TOKEN_TTL")]
	pub refresh_token_ttl: i64,

	/// The interval at which automatic deleted session cleanup is performed.
	#[default_value(DEFAULT_SESSION_EXPIRY_CLEANUP_INTERVAL)]
	#[env_key(SESSION_EXPIRY_INTERVAL_KEY)]
	pub expired_session_cleanup_interval: u64,

	/// The maximum number of concurrent files which may be processed by a scanner. This is used
	/// to limit/increase the number of files that are processed at once. This may be useful for those
	/// with high or low performance systems to configure to their needs.
	#[default_value(DEFAULT_MAX_SCANNER_CONCURRENCY)]
	#[env_key(MAX_SCANNER_CONCURRENCY_KEY)]
	pub max_scanner_concurrency: usize,

	/// The maximum number of concurrent files which may be processed by a thumbnail generator. This is used
	/// to limit/increase the number of images that are processed at once. Image generation can be
	/// resource intensive, so this may be useful for those with high or low performance systems to
	/// configure to their needs.
	#[default_value(DEFAULT_MAX_THUMBNAIL_CONCURRENCY)]
	#[env_key(MAX_THUMBNAIL_CONCURRENCY_KEY)]
	pub max_thumbnail_concurrency: usize,

	/// The maximum file size, in bytes, of images that can be uploaded, e.g., as thumbnails for users,
	/// libraries, series, or media.
	#[default_value(DEFAULT_MAX_IMAGE_UPLOAD_SIZE)]
	#[env_key(MAX_IMAGE_UPLOAD_SIZE_KEY)]
	pub max_image_upload_size: usize,

	/// Whether or not the server will allow users with the appropriate permissions to upload books and series.
	#[default_value(DEFAULT_ENABLE_UPLOAD)]
	#[env_key(ENABLE_UPLOAD_KEY)]
	pub enable_upload: bool,

	/// The maximum size, in bytes, of files that can be uploaded to be included in libraries.
	#[default_value(DEFAULT_MAX_FILE_UPLOAD_SIZE)]
	#[env_key(MAX_FILE_UPLOAD_SIZE_KEY)]
	pub max_file_upload_size: usize,
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
				"Error writing config directory: {config_dir:?} is a file",
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
				eprintln!("Failed to serialize StumpConfig to toml: {e}");
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

	eprintln!("Invalid profile value: {profile}");
	false
}

#[cfg(test)]
mod tests {
	use tempfile;

	use super::*;

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
			enable_swagger: Some(false),
			enable_koreader_sync: Some(false),
			password_hash_cost: None,
			session_ttl: None,
			access_token_ttl: None,
			refresh_token_ttl: None,
			expired_session_cleanup_interval: None,
			max_scanner_concurrency: None,
			max_thumbnail_concurrency: None,
			max_image_upload_size: None,
			enable_upload: None,
			max_file_upload_size: None,
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
				enable_swagger: Some(false),
				enable_koreader_sync: Some(false),
				password_hash_cost: Some(DEFAULT_PASSWORD_HASH_COST),
				session_ttl: Some(DEFAULT_SESSION_TTL),
				access_token_ttl: Some(DEFAULT_ACCESS_TOKEN_TTL),
				refresh_token_ttl: Some(DEFAULT_REFRESH_TOKEN_TTL),
				expired_session_cleanup_interval: Some(
					DEFAULT_SESSION_EXPIRY_CLEANUP_INTERVAL
				),
				max_scanner_concurrency: Some(DEFAULT_MAX_SCANNER_CONCURRENCY),
				max_thumbnail_concurrency: Some(DEFAULT_MAX_THUMBNAIL_CONCURRENCY),
				max_image_upload_size: Some(DEFAULT_MAX_IMAGE_UPLOAD_SIZE),
				enable_upload: Some(DEFAULT_ENABLE_UPLOAD),
				max_file_upload_size: Some(DEFAULT_MAX_FILE_UPLOAD_SIZE)
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
				(ENABLE_SWAGGER_KEY, Some("true")),
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
						profile: "release".to_string(),
						port: 1337,
						verbosity: 2,
						pretty_logs: true,
						db_path: None,
						client_dir: "./client".to_string(),
						config_dir,
						allowed_origins: vec![],
						pdfium_path: None,
						enable_swagger: true,
						enable_koreader_sync: false,
						password_hash_cost: 1,
						session_ttl: DEFAULT_SESSION_TTL,
						access_token_ttl: DEFAULT_ACCESS_TOKEN_TTL,
						refresh_token_ttl: DEFAULT_REFRESH_TOKEN_TTL,
						expired_session_cleanup_interval:
							DEFAULT_SESSION_EXPIRY_CLEANUP_INTERVAL,
						custom_templates_dir: None,
						max_scanner_concurrency: DEFAULT_MAX_SCANNER_CONCURRENCY,
						max_thumbnail_concurrency: DEFAULT_MAX_THUMBNAIL_CONCURRENCY,
						max_image_upload_size: DEFAULT_MAX_IMAGE_UPLOAD_SIZE,
						enable_upload: DEFAULT_ENABLE_UPLOAD,
						max_file_upload_size: DEFAULT_MAX_FILE_UPLOAD_SIZE,
					}
				);
			},
		);
	}
}

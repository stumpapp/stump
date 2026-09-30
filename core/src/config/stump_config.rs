//! Contains the [`StumpConfig`] struct and related functions for loading and saving configuration
//! values for a Stump application.
//!
//! Note: [`StumpConfig`] is constructed _before_ tracing is initializing. This is because the
//! configuration is used to determine the log file path and verbosity level. This means that any
//! logging that occurs during the construction of the [`StumpConfig`] should be done using the
//! standard `println!` or `eprintln!` macros.

use std::path::{Path, PathBuf};

use async_graphql::SimpleObject;
use schematic::{Config, ConfigLoader};
use serde::Serialize;

use crate::{
	config::{get_default_config_dir, OidcConfig, PartialOidcConfig},
	CoreError, CoreResult,
};

pub const CONFIG_DIR_KEY: &str = "STUMP_CONFIG_DIR";
pub const IN_DOCKER_KEY: &str = "STUMP_IN_DOCKER";

const DEFAULT_SESSION_TTL: i64 = 3600 * 24 * 3; // 3 days
const DEFAULT_ACCESS_TOKEN_TTL: i64 = 3600 * 24; // 1 day
const DEFAULT_REFRESH_TOKEN_TTL: i64 = 3600 * 24 * 30; // 30 days
const DEFAULT_UPLOAD_SIZE: usize = 20 * 1024 * 1024; // 20 MB

// TODO(env): i think DatabaseConfig enum with e.g. SQLite and Postgres variants would be nice
// TODO(postgres): the vars are not toml-supported atm, not sure if this really matters. i kept it
// like that bc idk what to do about the password, and having all of the config except password in toml
// felt funny? idk ill wait until someone complains maybe >:)

#[derive(Config, Serialize, Debug, Clone, PartialEq, SimpleObject)]
#[config(env_prefix = "STUMP_")]
pub struct StumpConfig {
	/// The IP address on which to listen on (default: "0.0.0.0")
	#[setting(default = "0.0.0.0")]
	pub ip: String,

	/// The port from which to serve the application (default: 10801)
	#[setting(default = 10801)]
	pub port: u16,

	/// The verbosity with which system logs are visible (default: 1)
	/// 0 = none at all, 1 = info, 2 = debug, 3 = trace
	#[setting(default = 1)]
	pub verbosity: u64,

	/// Whether or not to pretty print logs
	#[setting(default = true)]
	pub pretty_logs: bool,

	/// Whether or not to include ANSI color codes in log files
	#[setting(default = false)]
	pub colorful_logs: bool,

	/// The directory where the applicaiton logs will be stored. If unspecified,
	/// logs will be stored in the config_dir
	pub log_dir: Option<String>,

	/// An optional custom path for the database. If set, this assumes SQLite.
	pub db_path: Option<String>,

	/// The timeout in seconds for database connections
	#[setting(default = 30)]
	pub db_timeout_secs: u64,

	/// The directory where the web app bundle lives, which the server will serve as
	/// static files
	#[setting(default = "./client")]
	pub client_dir: String,

	// due to the way schematic works, this field will be loaded first and used
	// to kick off the rest of the config loading process
	/// The configuration root for the Stump application
	#[setting(default = "super::get_default_config_dir()")]
	pub config_dir: String,

	/// A comma-separated list of origins for CORS
	#[setting(
		default = vec![],
		parse_env = schematic::env::split_comma
	)]
	pub allowed_origins: Vec<String>,

	/// Path to the PDFium binary for enabling PDF support
	pub pdfium_path: Option<String>,

	/// Indicates if the GraphQL playground should be enabled. If true, the server
	/// will allow GET requests to the GraphQL endpoint and serve the playground UI
	#[setting(default = false)]
	pub enable_playground: bool,

	/// Indicates if the KoReader sync feature should be enabled
	#[setting(default = false)]
	pub enable_koreader_sync: bool,

	/// Indicates if the Kobo sync feature should be enabled
	#[setting(default = false)]
	pub enable_kobo_sync: bool,

	/// Indicates if OPDS page access should automatically track reading progression.
	/// When disabled, clients loading/preloading pages won't trigger progress updates.
	#[setting(default = false)]
	pub enable_opds_progression: bool,

	/// Password hash cost
	#[setting(default = 12)]
	pub password_hash_cost: u32,

	/// The time in seconds that a login session will be valid for
	#[setting(default = DEFAULT_SESSION_TTL)]
	pub session_ttl: i64,

	/// The time in seconds that an access token will be valid for
	#[setting(default = DEFAULT_ACCESS_TOKEN_TTL)]
	pub access_token_ttl: i64,

	/// The time in seconds that a refresh token will be valid for
	#[setting(default = DEFAULT_REFRESH_TOKEN_TTL)]
	pub refresh_token_ttl: i64,

	/// The interval in seconds at which expired sessions will be cleaned up
	#[setting(default = 86400)]
	pub expired_session_cleanup_interval: u64,

	/// A multiplier applied to the number of logical CPUs to derive the default scanner concurrency
	/// limit. Increasing can speed things up but will increase resource usage
	#[setting(default = 2)]
	pub parallelism_multiplier: usize,

	/// The maximum size in bytes of an image upload
	#[setting(default = DEFAULT_UPLOAD_SIZE)]
	pub max_image_upload_size: usize,

	/// Whether or not the server will allow users with the appropriate permissions
	/// to upload books, series, or other valid uploadable content
	#[setting(default = false)]
	pub enable_upload: bool,

	/// The maximum size in bytes of a file upload
	#[setting(default = DEFAULT_UPLOAD_SIZE)]
	pub max_file_upload_size: usize,

	/// The DPI (dots per inch) to use when rendering PDF pages as images
	#[setting(default = 150)]
	pub pdf_render_dpi: u32,

	/// The maximum width or height dimension for rendered PDF pages
	#[setting(default = 1200)]
	pub pdf_max_dimension: u32,

	/// The image format to use for rendered PDF pages (webp, png, jpeg)
	#[setting(default = "webp")]
	pub pdf_render_format: String,

	/// Whether to enable disk caching for rendered PDF pages
	#[setting(default = true)]
	pub pdf_cache_pages: bool,

	/// Number of pages to pre-render before and after the current page
	#[setting(default = 5)]
	pub pdf_prerender_range: u32,

	/// Whether to enable high-quality rendering with smoothing (slower but better quality)
	#[setting(default = true)]
	pub pdf_high_quality: bool,

	/// OIDC authentication configuration
	#[setting(nested)]
	#[graphql(skip)]
	pub oidc: Option<OidcConfig>,

	/// Whether to trust proxy headers for determining client IP and scheme (e.g., X-Forwarded-For)
	#[setting(default = false)]
	pub trust_proxy_headers: bool,
}

impl StumpConfig {
	/// Load the config with the following precedence:
	/// env vars > Stump.toml > defaults
	pub fn load(path: impl AsRef<Path>) -> CoreResult<Self> {
		let config_dir = path.as_ref().to_path_buf();
		let toml_path = config_dir.join("Stump.toml");

		let config_dir_snippet = format!("config_dir = {:?}", config_dir);

		let mut loader = ConfigLoader::<StumpConfig>::new();
		loader
			.code(config_dir_snippet, "base.toml")
			.map_err(|e| CoreError::InitializationError(e.to_string()))?;

		if toml_path.exists() {
			loader
				.file(toml_path)
				.map_err(|e| CoreError::InitializationError(e.to_string()))?;
		}

		let result = loader
			.load()
			.map_err(|e| CoreError::InitializationError(e.to_string()))?;

		let config = result.config;

		Ok(config)
	}

	pub fn debug() -> Self {
		Self {
			client_dir: env!("CARGO_MANIFEST_DIR").to_string() + "/../web/dist",
			config_dir: get_default_config_dir(),
			enable_koreader_sync: true,
			enable_kobo_sync: true,
			..Default::default()
		}
	}

	pub fn config_directory(&self) -> PathBuf {
		PathBuf::from(&self.config_dir)
	}

	pub fn log_directory(&self) -> PathBuf {
		match &self.log_dir {
			Some(v) => PathBuf::from(v),
			None => self.config_directory(),
		}
	}

	pub fn cache_directory(&self) -> PathBuf {
		self.config_directory().join("cache")
	}

	pub fn thumbnails_directory(&self) -> PathBuf {
		self.config_directory().join("thumbnails")
	}

	pub fn avatars_directory(&self) -> PathBuf {
		self.config_directory().join("avatars")
	}

	pub fn emojis_directory(&self) -> PathBuf {
		self.config_directory().join("emojis")
	}

	pub fn pdf_cache_directory(&self) -> PathBuf {
		self.cache_directory().join("pdf_pages")
	}

	pub fn log_file(&self) -> PathBuf {
		self.config_directory().join("Stump.log")
	}

	pub fn cpu_concurrency_limit(&self) -> usize {
		let multiplier = self.parallelism_multiplier.max(1);
		std::thread::available_parallelism()
			.map(|n| n.get() * multiplier)
			.unwrap_or(multiplier)
	}

	pub fn get_pdf_render_format(
		&self,
	) -> models::shared::image_processor_options::SupportedImageFormat {
		use models::shared::image_processor_options::SupportedImageFormat;

		match self.pdf_render_format.to_lowercase().as_str() {
			"webp" => SupportedImageFormat::Webp,
			"jpeg" | "jpg" => SupportedImageFormat::Jpeg,
			"png" => SupportedImageFormat::Png,
			_ => {
				tracing::warn!(
					format = self.pdf_render_format,
					"Invalid PDF render format, falling back to WebP"
				);
				SupportedImageFormat::Webp
			},
		}
	}

	/// Write the current config to Stump.toml and ensure all subdirectories exist.
	pub fn write_config(&self) -> CoreResult<()> {
		let config_dir = self.config_directory();

		if config_dir.is_file() {
			return Err(CoreError::InitializationError(format!(
				"config_dir {config_dir:?} is a file, not a directory"
			)));
		}

		if !config_dir.exists() {
			std::fs::create_dir_all(&config_dir).map_err(|e| {
				CoreError::InitializationError(format!(
					"failed to create config directory at {config_dir:?}: {e}"
				))
			})?;
		}

		for dir in [
			self.cache_directory(),
			self.thumbnails_directory(),
			self.avatars_directory(),
			self.emojis_directory(),
			self.pdf_cache_directory(),
		] {
			if !dir.exists() {
				std::fs::create_dir_all(&dir).map_err(|e| {
					CoreError::InitializationError(format!(
						"failed to create directory at {dir:?}: {e}"
					))
				})?;
			}
		}

		let content = toml::to_string(self).map_err(|e| {
			CoreError::InitializationError(format!("failed to serialize config: {e}"))
		})?;
		std::fs::write(config_dir.join("Stump.toml"), content)?;

		Ok(())
	}
}

#[cfg(test)]
mod tests {
	use super::*;
	use tempfile;

	#[test]
	fn test_defaults_and_basic_env_override() {
		temp_env::with_vars(
			[
				("STUMP_PORT", Some("1337")),
				("STUMP_VERBOSITY", Some("2")),
				("STUMP_ENABLE_PLAYGROUND", Some("true")),
				("STUMP_PASSWORD_HASH_COST", Some("1")),
			],
			|| {
				let dir = tempfile::tempdir().expect("should create temp dir");
				let config_dir = dir.path().to_path_buf();

				let config =
					StumpConfig::load(config_dir.clone()).expect("should load config");

				assert_eq!(config.config_dir, config_dir.to_string_lossy().to_string());
				assert_eq!(config.port, 1337);
				assert_eq!(config.verbosity, 2);
				assert!(config.enable_playground);
				assert_eq!(config.password_hash_cost, 1);
				assert_eq!(config.ip, "0.0.0.0");
				assert_eq!(config.session_ttl, DEFAULT_SESSION_TTL);
				assert_eq!(config.pdf_render_format, "webp");
			},
		);
	}

	#[test]
	fn test_toml_loaded_and_env_overrides() {
		temp_env::with_vars(
			[
				("STUMP_PORT", None::<&str>),
				("STUMP_VERBOSITY", None::<&str>),
				("STUMP_ENABLE_PLAYGROUND", None::<&str>),
				("STUMP_ALLOWED_ORIGINS", None::<&str>),
				("STUMP_PASSWORD_HASH_COST", None::<&str>),
			],
			|| {
				let dir = tempfile::tempdir().expect("should create temp dir");
				let config_dir = dir.path().to_path_buf();

				std::fs::write(
					config_dir.join("Stump.toml"),
					r#"
port = 9000
verbosity = 3
enable_playground = true
allowed_origins = ["http://localhost:3000"]
"#,
				)
				.expect("should write toml");

				let config =
					StumpConfig::load(config_dir.clone()).expect("should load config");
				assert_eq!(config.port, 9000);
				assert_eq!(config.verbosity, 3);
				assert!(config.enable_playground);
				assert_eq!(config.allowed_origins, vec!["http://localhost:3000"]);

				temp_env::with_vars([("STUMP_PORT", Some("4242"))], || {
					let config = StumpConfig::load(config_dir.clone())
						.expect("should load config");
					assert_eq!(config.port, 4242);
					assert_eq!(config.verbosity, 3); // toml value
				});
			},
		);
	}
}

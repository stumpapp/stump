use std::{env, path::Path};

use serde::{Deserialize, Serialize};
use tracing::debug;

use crate::{
	config::get_config_dir,
	prelude::{errors::CoreError, CoreResult},
};

/// [`StumpEnvironment`] is the the representation of the Stump configuration file.
/// Each field is an [`Option`] because the configuration file is not guaranteed
/// to have all fields, and the paths are
///
/// Example:
/// ```rust
/// use std::fs;
/// use stump_core::config::env::StumpEnvironment;
///
/// fn read_toml() {
///    let toml_str = r#"
/// profile = "debug"
/// port = 8080
/// verbosity = 3
/// client_dir = "client"
/// "#;
///    let stump_toml = toml::from_str::<StumpEnvironment>(toml_str);
///
///    assert!(stump_toml.is_ok());
///    let stump_toml = stump_toml.unwrap();
///    println!("{:?}", stump_toml);
///    assert_eq!(stump_toml.profile, Some("debug".to_string()));
///    assert_eq!(stump_toml.port, Some(8080));
///    assert_eq!(stump_toml.verbosity, Some(3));
///    assert_eq!(stump_toml.client_dir, Some(String::from("client")));
/// }
/// ```
#[derive(Serialize, Deserialize, Debug, Clone)]
pub struct StumpEnvironment {
	pub profile: Option<String>,
	pub port: Option<u16>,
	pub verbosity: Option<u64>,
	pub client_dir: Option<String>,
	pub config_dir: Option<String>,
	pub allowed_origins: Option<Vec<String>>,
}

impl Default for StumpEnvironment {
	fn default() -> Self {
		Self {
			profile: Some(String::from("debug")),
			port: Some(10801),
			// TODO: change default back to 0
			verbosity: Some(1),
			client_dir: Some(String::from("client")),
			config_dir: None,
			allowed_origins: None,
		}
	}
}

// TODO: error handling
// FIXME: I don't believe this will work very well, but it requires some testing.
impl StumpEnvironment {
	/// Will try to create a new [StumpEnvironment] object from set environment variables. If none are set,
	/// will return the default [StumpEnvironment] object.
	///
	/// ## Example
	/// ```rust
	/// use std::env;
	/// use stump_core::config::env::StumpEnvironment;
	///
	/// env::set_var("STUMP_PORT", "8080");
	/// env::set_var("STUMP_VERBOSITY", "3");
	///
	/// let env = StumpEnvironment::from_env(None);
	/// assert!(env.is_ok());
	/// let env = env.unwrap();
	/// assert_eq!(env.port, Some(8080));
	/// assert_eq!(env.verbosity, Some(3));
	/// ```
	pub fn from_env(existing: Option<Self>) -> CoreResult<Self> {
		let mut env = match existing {
			Some(env) => env,
			None => Self::default(),
		};

		if let Ok(port) = env::var("STUMP_PORT") {
			env.port = Some(port.parse().unwrap());
		}

		if let Ok(profile) = env::var("STUMP_PROFILE") {
			if profile == "release" || profile == "debug" {
				env.profile = Some(profile);
			} else {
				debug!("Invalid PROFILE value: {}", profile);

				env.profile = Some(String::from("debug"));
			}
		}

		if let Ok(verbosity) = env::var("STUMP_VERBOSITY") {
			env.verbosity = Some(verbosity.parse().unwrap());
		}

		if let Ok(client_dir) = env::var("STUMP_CLIENT_DIR") {
			env.client_dir = Some(client_dir);
		}

		if let Ok(config_dir) = env::var("STUMP_CONFIG_DIR") {
			if !config_dir.is_empty() {
				if Path::new(&config_dir).exists() {
					env.config_dir = Some(config_dir);
				} else {
					debug!(
						"Invalid STUMP_CONFIG_DIR value, cannot find on file system: {}",
						config_dir
					);
				}
			} else {
				debug!("Invalid STUMP_CONFIG_DIR value: EMPTY");
			}
		}

		env.config_dir = Some(get_config_dir().to_string_lossy().to_string());

		env.write()?;

		Ok(env)
	}

	/// Will set the environment variables to the values in the [StumpEnvironment] object.
	/// If the values are not set, will use the default values.
	///
	/// ## Example
	/// ```rust
	/// use std::env;
	/// use stump_core::config::env::StumpEnvironment;
	///
	/// let mut env = StumpEnvironment::default();
	/// env.port = Some(8080);
	///
	/// assert_eq!(env::var("STUMP_PORT").is_err(), true);
	/// env.set_env().unwrap();
	/// assert_eq!(env::var("STUMP_PORT").unwrap(), "8080");
	/// ```
	pub fn set_env(&self) -> CoreResult<()> {
		if let Some(profile) = &self.profile {
			if profile != "debug" {
				env::set_var("STUMP_PROFILE", "release");
			} else {
				env::set_var("STUMP_PROFILE", "debug");
			}
		}

		let port = &self.port.unwrap_or(10801);

		env::set_var("STUMP_PORT", port.to_string());
		env::set_var("STUMP_VERBOSITY", self.verbosity.unwrap_or(1).to_string());

		if let Some(config_dir) = &self.config_dir {
			if !config_dir.is_empty() {
				env::set_var("STUMP_CONFIG_DIR", config_dir);
			}
		}

		if let Some(client_dir) = &self.client_dir {
			if !client_dir.is_empty() {
				env::set_var("STUMP_CLIENT_DIR", client_dir);
			}
		}

		if let Some(allowed_origins) = &self.allowed_origins {
			if !allowed_origins.is_empty() {
				env::set_var("STUMP_ALLOWED_ORIGINS", allowed_origins.join(","));
			}
		}

		Ok(())
	}

	/// Will load the [StumpEnvironment] object from the Stump.toml file. If the file does not exist,
	/// it will create it with the default values. Internally, it will call `StumpEnvironment::from_env`
	/// to override the toml values with newly set environment variables. This is done so that a user
	/// can set an environment variable if they prefer to not manually edit the toml.
	///
	/// ## Example
	/// ```rust
	/// use stump_core::config::env::StumpEnvironment;
	/// use std::env;
	///
	/// env::set_var("STUMP_PORT", "8080");
	/// let env = StumpEnvironment::load().unwrap();
	/// assert_eq!(env.port, Some(8080));
	/// ```
	pub fn load() -> CoreResult<StumpEnvironment> {
		let config_dir = get_config_dir();
		let stump_toml = config_dir.join("Stump.toml");

		let environment = if stump_toml.exists() {
			let toml_str = std::fs::read_to_string(stump_toml)?;
			toml::from_str::<StumpEnvironment>(&toml_str)
				.map_err(|e| CoreError::InitializationError(e.to_string()))?
		} else {
			debug!("Stump.toml does not exist, creating it");
			std::fs::File::create(stump_toml)?;
			debug!("Stump.toml created");

			Self::default()
		};

		// I reassign the env here to make sure it picks up changes when a user manually sets a value
		let environment = Self::from_env(Some(environment))?;
		// I then reassign the env here to make sure the vars it previously set are correct
		environment.set_env()?;

		Ok(environment)
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

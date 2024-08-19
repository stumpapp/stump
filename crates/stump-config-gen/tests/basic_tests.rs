// Because the macro expects these to exist at the crate root
use thiserror::Error;

type CoreResult<T> = Result<T, CoreError>;

#[derive(Error, Debug)]
enum CoreError {
	#[error("Failed to initialize: {0}")]
	InitializationError(String),
	#[error("Failed to read file: {0}")]
	IoError(#[from] std::io::Error),
}

use std::{env, path::PathBuf};

use itertools::Itertools;
use serde::Deserialize;

use stump_config_gen::StumpConfigGenerator;

#[derive(StumpConfigGenerator, Deserialize)]
#[config_file_location(get_mock_config_file())]
struct EmptyConfig {}

mod env_keys {
	pub const PORT_ENV_KEY: &str = "PORT_ENV_KEY";
	pub const LIST_OF_NAMES_KEY: &str = "LIST_OF_NAMES_KEY";
	pub const MAYBE_BOO_KEY: &str = "MAYBE_BOO_KEY";
}
use env_keys::*;

#[derive(StumpConfigGenerator, Deserialize, PartialEq, Debug)]
#[config_file_location(get_mock_config_file())]
struct BasicConfig {
	#[default_value(3000)]
	#[env_key(PORT_ENV_KEY)]
	pub port: u32,

	#[default_value(vec![])]
	#[debug_value(vec!["Alice".to_string(), "Bob".to_string()])]
	#[env_key(LIST_OF_NAMES_KEY)]
	pub list_of_names: Vec<String>,

	#[default_value(None)]
	#[env_key(MAYBE_BOO_KEY)]
	pub maybe_boo: Option<String>,
}

#[test]
fn test_create_new() {
	let config = BasicConfig::new();

	assert_eq!(
		config,
		BasicConfig {
			port: 3000,
			list_of_names: vec![],
			maybe_boo: None,
		}
	);
}

#[test]
fn test_apply_partial_to_debug() {
	let mut config = BasicConfig::debug();

	let partial_config = PartialBasicConfig {
		port: Some(3333),
		list_of_names: Some(vec!["Carmen".to_string()]),
		maybe_boo: Some("Boo".to_string()),
	};

	partial_config.apply_to_config(&mut config);

	assert_eq!(
		config,
		BasicConfig {
			port: 3333,
			list_of_names: vec![
				"Alice".to_string(),
				"Bob".to_string(),
				"Carmen".to_string(),
			],
			maybe_boo: Some("Boo".to_string()),
		}
	);
}

#[test]
fn test_getting_config_from_environment() {
	temp_env::with_vars(
		[
			(PORT_ENV_KEY, Some("1337")),
			(LIST_OF_NAMES_KEY, Some("Alice,Bob")),
			(MAYBE_BOO_KEY, Some("Boo")),
		],
		|| {
			let config = BasicConfig::new()
				.with_environment()
				.expect("Failed to fetch config from environment");

			assert_eq!(
				config,
				BasicConfig {
					port: 1337,
					list_of_names: vec!["Alice".to_string(), "Bob".to_string(),],
					maybe_boo: Some("Boo".to_string()),
				}
			);
		},
	)
}

#[test]
fn test_getting_config_from_toml() {
	let config = BasicConfig::new()
		.with_config_file()
		.expect("Failed to fetch config from file");

	assert_eq!(
		config,
		BasicConfig {
			port: 2222,
			list_of_names: vec!["Bob".to_string(), "Carmen".to_string(),],
			maybe_boo: Some("Boo".to_string()),
		}
	);
}

#[allow(unused)]
fn get_mock_config_file() -> PathBuf {
	PathBuf::from(env!("CARGO_MANIFEST_DIR")).join("tests/data/basic-config.toml")
}

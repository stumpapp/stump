use std::path::{Path, PathBuf};

pub(crate) mod context;
pub use context::Ctx;

pub mod env;
pub mod logging;

/// Gets the home directory of the system running Stump
fn home() -> PathBuf {
	dirs::home_dir().expect("Could not determine your home directory")
}

fn check_configuration_dir(path: &Path) {
	if !path.exists() {
		std::fs::create_dir_all(path).unwrap_or_else(|e| {
			panic!(
				"Failed to create Stump configuration directory at {:?}: {:?}",
				path,
				e.to_string()
			)
		});
	}

	if !path.is_dir() {
		panic!(
			"Invalid Stump configuration, the item located at {:?} must be a directory.",
			path
		);
	}
}

/// Gets the Stump config directory. If the directory does not exist, it will be created. If
/// the path is not a directory (only possible if overridden using STUMP_CONFIG_DIR) it will
/// panic.
pub fn get_config_dir() -> PathBuf {
	let config_dir = std::env::var("STUMP_CONFIG_DIR")
		.and_then(|val| {
			if val.len() < 1 {
				Ok(home().join(".stump"))
			} else {
				Ok(PathBuf::from(val))
			}
		})
		.unwrap_or_else(|_| home().join(".stump"));

	check_configuration_dir(&config_dir);

	config_dir
}

pub fn get_cache_dir() -> PathBuf {
	let cache_dir = get_config_dir().join("cache");

	check_configuration_dir(&cache_dir);

	cache_dir
}

pub fn get_thumbnails_dir() -> PathBuf {
	let thumbnails_dir = get_config_dir().join("thumbnails");

	check_configuration_dir(&thumbnails_dir);

	thumbnails_dir
}

pub fn stump_in_docker() -> bool {
	std::env::var("STUMP_IN_DOCKER").is_ok()
}

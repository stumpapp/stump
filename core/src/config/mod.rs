use std::path::{Path, PathBuf};

pub mod env;
pub mod logging;
mod stump_config;

pub use stump_config::*;

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
		.map(|val| {
			if val.is_empty() {
				home().join(".stump")
			} else {
				PathBuf::from(val)
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
	let env_set = std::env::var("STUMP_IN_DOCKER").is_ok();
	if env_set {
		return true;
	}

	let container_env = std::fs::metadata("/run/.containerenv").is_ok();
	let docker_env = std::fs::metadata("/.dockerenv").is_ok();
	if container_env || docker_env {
		return true;
	}

	// NOTE: this should never hit, since I manually set the env var in the Dockerfile... However,
	// in case someone decides to run Stump in a container while overriding that var, this should
	// prevent any issues.
	let cgroup = std::fs::read_to_string("/proc/self/cgroup")
		.map(|cgroup| {
			cgroup
				.lines()
				.any(|line| line.contains("docker") || line.contains("containerd"))
		})
		.unwrap_or(false);

	cgroup
}

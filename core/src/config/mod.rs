pub mod logging;
mod stump_config;

use std::env;

pub use stump_config::StumpConfig;

pub fn get_default_config_dir() -> String {
	let home = dirs::home_dir().expect("Could not determine user home directory");
	let config_dir = home.join(".stump");

	config_dir.to_string_lossy().into_owned()
}

pub fn bootstrap_config_dir() -> String {
	match env::var("STUMP_CONFIG_DIR") {
		Ok(config_dir) => {
			if config_dir.is_empty() {
				get_default_config_dir()
			} else {
				config_dir
			}
		},
		Err(_) => get_default_config_dir(),
	}
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
	std::fs::read_to_string("/proc/self/cgroup")
		.map(|cgroup| {
			cgroup
				.lines()
				.any(|line| line.contains("docker") || line.contains("containerd"))
		})
		.unwrap_or(false)
}

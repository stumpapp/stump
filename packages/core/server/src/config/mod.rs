use std::path::PathBuf;

pub mod context;
pub mod cors;
pub mod helmet;
pub mod logging;
pub mod session;

// TODO: look into this
// https://api.rocket.rs/v0.5-rc/rocket/struct.Config.html#method.figment

pub fn get_config_dir() -> PathBuf {
	match std::env::var("STUMP_CONFIG_DIR") {
		Ok(path) => PathBuf::from(&path),
		_ => dirs::home_dir()
			.expect("Could not determine your home directory, required for config")
			.join(".stump"),
	}
}

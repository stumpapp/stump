use std::path::PathBuf;

pub mod context;
pub mod cors;
pub mod env;
pub mod helmet;
pub mod logging;
pub mod session;

// TODO: look into this
// https://api.rocket.rs/v0.5-rc/rocket/struct.Config.html#method.figment

fn home() -> PathBuf {
	dirs::home_dir().expect("Could not determine your home directory")
}

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

	if !config_dir.exists() {
		// TODO: error handling
		std::fs::create_dir_all(&config_dir).unwrap();
	}

	config_dir
}

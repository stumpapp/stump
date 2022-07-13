use std::path::PathBuf;

pub mod context;
pub mod cors;
pub mod env;
pub mod helmet;
pub mod logging;
pub mod session;

// TODO: look into this
// https://api.rocket.rs/v0.5-rc/rocket/struct.Config.html#method.figment

/// Gets the home directory of the system running Stump
fn home() -> PathBuf {
	dirs::home_dir().expect("Could not determine your home directory")
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

	if !config_dir.exists() {
		// TODO: error handling
		std::fs::create_dir_all(&config_dir).unwrap();
	}

	// Not having as an else statement so it checks validity after creating
	// the directory (in above if statement)
	if !config_dir.is_dir() {
		panic!(
			"Invalid config directory, {} is not a directory.",
			config_dir.to_str().unwrap_or("")
		);
	}

	config_dir
}

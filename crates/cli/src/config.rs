use std::path::PathBuf;

use clap::Parser;
use stump_core::config::StumpConfig;

#[derive(Default, Parser)]
pub struct CliConfig {
	/// The path to the configuration directory
	#[clap(long)]
	pub config_dir: Option<PathBuf>,
	/// The desired cost for password hashing. Defaults to 12.
	#[clap(long)]
	pub password_hash_cost: Option<u32>,
}

impl CliConfig {
	/// Consume both a [CliConfig] and [StumpConfig] to produce a [StumpConfig] with
	/// any values set in the [CliConfig] overriding the [StumpConfig]'s values.
	pub fn merge_stump_config(self, mut config: StumpConfig) -> StumpConfig {
		if let Some(config_dir) = self.config_dir {
			config.config_dir = config_dir.to_string_lossy().to_string();
		}
		if let Some(hash_cost) = self.password_hash_cost {
			config.password_hash_cost = hash_cost;
		}

		config
	}
}

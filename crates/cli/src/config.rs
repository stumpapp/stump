use std::path::PathBuf;

use clap::Parser;

#[derive(Default, Parser)]
pub struct CliConfig {
	/// The path to the configuration directory
	#[clap(long, env = "STUMP_CONFIG_DIR")]
	pub config_dir: Option<PathBuf>,
	/// The desired cost for password hashing. Defaults to 12.
	#[clap(long, env = "HASH_COST", default_value = "12")]
	pub password_hash_cost: u32,
}

use cli::{handle_command, Cli, Parser};
use errors::EntryError;
use stump_core::{
	config::bootstrap_config_dir, config::logging::init_tracing, StumpCore,
};

mod config;
mod errors;
mod http_server;
mod middleware;
mod routers;
mod utils;

#[cfg(debug_assertions)]
fn debug_setup() {
	std::env::set_var(
		"STUMP_CLIENT_DIR",
		env!("CARGO_MANIFEST_DIR").to_string() + "/../web/dist",
	);
	std::env::set_var("STUMP_PROFILE", "debug");
}

#[tokio::main(flavor = "multi_thread")]
async fn main() -> Result<(), EntryError> {
	#[cfg(debug_assertions)]
	debug_setup();

	// Get STUMP_CONFIG_DIR to bootstrap startup
	let config_dir = bootstrap_config_dir();

	let config = StumpCore::init_config(config_dir)
		.map_err(|e| EntryError::InvalidConfig(e.to_string()))?;

	let cli = Cli::parse();

	if let Some(command) = cli.command {
		Ok(handle_command(command, &cli.config.merge_stump_config(config)).await?)
	} else {
		// Note: init_tracing after loading the environment so the correct verbosity
		// level is used for logging.
		init_tracing(&config);

		if config.verbosity >= 3 {
			tracing::trace!(?config, "App config");
		}

		Ok(http_server::run_http_server(config).await?)
	}
}

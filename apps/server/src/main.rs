use cli::{handle_command, Cli, Parser};
use errors::EntryError;
use stump_core::{config::logging::init_tracing, StumpCore};

mod config;
mod errors;
mod http_server;
mod middleware;
mod routers;
mod utils;

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

	let config = StumpCore::init_environment()
		.map_err(|e| EntryError::InvalidConfig(e.to_string()))?;

	let cli = Cli::parse();

	if let Some(command) = cli.command {
		Ok(handle_command(command, cli.config).await?)
	} else {
		let port = config.port.unwrap_or(10801);
		// Note: init_tracing after loading the environment so the correct verbosity
		// level is used for logging.
		init_tracing();

		if config.verbosity.unwrap_or(1) >= 3 {
			tracing::trace!(?config, "App config");
		}

		Ok(http_server::run_http_server(port).await?)
	}
}

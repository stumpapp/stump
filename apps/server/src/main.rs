use cli::{handle_command, Cli, Parser};
use errors::EntryError;
use stump_core::{
	config::bootstrap_config_dir, config::logging::init_tracing, StumpCore,
};

mod config;
mod errors;
mod filter;
mod http_server;
mod middleware;
mod routers;
mod utils;

#[cfg(debug_assertions)]
fn debug_setup() {
	use stump_core::config::env_keys;

	std::env::set_var(
		env_keys::CLIENT_KEY,
		env!("CARGO_MANIFEST_DIR").to_string() + "/../web/dist",
	);
	std::env::set_var(
		env_keys::EMAIL_TEMPLATES_DIR_KEY,
		env!("CARGO_MANIFEST_DIR").to_string() + "/../../crates/email/templates",
	);
	std::env::set_var(env_keys::PROFILE_KEY, "debug");
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

#[cfg(test)]
mod tests {
	use axum::Router;
	use axum_test::TestServer;
	use stump_core::config::StumpConfig;
	use tower_http::trace::TraceLayer;

	use super::*;

	#[tokio::test]
	async fn test_server() {
		let tempdir = tempfile::tempdir().expect("Failed to create temporary directory");

		// Create Stump config with the config directory in a tempdir.
		let mut config = StumpConfig::debug();
		config.config_dir = tempdir.path().to_string_lossy().to_string();

		// Create the Stump core
		let core = StumpCore::new(config.clone()).await;

		core.run_migrations().await.unwrap();

		core.get_job_controller().initialize().await.unwrap();

		// Initialize the server configuration. If it already exists, nothing will happen.
		core.init_server_config().await.unwrap();

		// Initialize the encryption key, if it doesn't exist
		core.init_encryption().await.unwrap();

		core.init_journal_mode().await.unwrap();

		// Initialize the scheduler
		core.init_scheduler().await.unwrap();

		// Create Axum app
		let server_ctx = core.get_context();
		let app_state: std::sync::Arc<stump_core::Ctx> = server_ctx.arced();
		let cors_layer = config::cors::get_cors_layer(config.clone());

		let app = Router::new()
			.merge(routers::mount(app_state.clone()))
			.with_state(app_state.clone())
			.layer(config::session::get_session_layer(app_state.clone()))
			.layer(cors_layer)
			.layer(TraceLayer::new_for_http());

		let server = TestServer::new(app).unwrap();

		// Now that we have a TestServer, we can issue requests to it.
	}
}

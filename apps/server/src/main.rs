use std::net::SocketAddr;

use axum::{Extension, Router};
use errors::{ServerError, ServerResult};
use stump_core::{config::logging::init_tracing, StumpCore};
use tracing::{error, info};

mod config;
mod errors;
mod middleware;
mod routers;
mod utils;

use config::{cors, session};

fn debug_setup() {
	std::env::set_var(
		"STUMP_CLIENT_DIR",
		env!("CARGO_MANIFEST_DIR").to_string() + "/dist",
	);
	std::env::set_var("STUMP_PROFILE", "debug");
}

// https://docs.rs/tokio/latest/tokio/attr.main.html#using-the-multi-thread-runtime
// TODO: Do I need to annotate with flavor?? I don't ~think~ so, but I'm not sure.
#[tokio::main(flavor = "multi_thread")]
async fn main() -> ServerResult<()> {
	#[cfg(debug_assertions)]
	debug_setup();

	let stump_environment = StumpCore::init_environment();
	if let Err(err) = stump_environment {
		error!("Failed to load environment variables: {:?}", err);
		return Err(ServerError::ServerStartError(err.to_string()));
	}
	let stump_environment = stump_environment.unwrap();

	// Note: init_tracing after loading the environment so the correct verbosity
	// level is used for logging.
	init_tracing();

	let core = StumpCore::new().await;
	if let Err(err) = core.run_migrations().await {
		error!("Failed to run migrations: {:?}", err);
		return Err(ServerError::ServerStartError(err.to_string()));
	}

	let server_ctx = core.get_context();

	info!("{}", core.get_shadow_text());

	let app = Router::new()
		.merge(routers::mount())
		.layer(Extension(server_ctx.arced()))
		.layer(session::get_session_layer())
		.layer(cors::get_cors_layer());

	let addr = SocketAddr::from(([0, 0, 0, 0], stump_environment.port.unwrap_or(10801)));
	info!("⚡️ Stump HTTP server starting on http://{}", addr);

	axum::Server::bind(&addr)
		.serve(app.into_make_service())
		.await
		.expect("Failed to start Stump HTTP server!");

	Ok(())
}

use std::net::SocketAddr;

use axum::{Extension, Router};
use errors::{ServerError, ServerResult};
use stump_core::StumpCore;
use tracing::error;

mod config;
mod errors;
mod middleware;
mod routers;
mod utils;

use config::{cors, session};

fn debug_setup() {
	std::env::set_var(
		"STUMP_CLIENT_DIR",
		env!("CARGO_MANIFEST_DIR").to_string() + "/client",
	);
	std::env::set_var(
		"ROCKET_CONFIG",
		env!("CARGO_MANIFEST_DIR").to_string() + "/Rocket.toml",
	);
	// TODO: remove this
	std::env::set_var("ROCKET_PROFILE", "debug");
}

#[tokio::main]
async fn main() -> ServerResult<()> {
	#[cfg(debug_assertions)]
	debug_setup();

	// TODO: refactor `load_env` to return StumpEnv, so I can use the values (like port) here.
	if let Err(err) = StumpCore::load_env() {
		error!("Failed to load environment variables: {:?}", err);

		return Err(ServerError::ServerStartError(err.to_string()));
	}

	// TODO: init logging
	let core = StumpCore::new().await;
	let server_ctx = core.get_context();
	// let server_state = ServerState::new(core);

	let app = Router::new()
		.merge(routers::mount())
		.layer(Extension(server_ctx.arced()))
		.layer(session::get_session_layer())
		.layer(cors::get_cors_layer());

	// TODO: set ip based on env var
	// TODO: set port based on env var
	let addr = SocketAddr::from(([0, 0, 0, 0], 10801));

	axum::Server::bind(&addr)
		.serve(app.into_make_service())
		.await
		.expect("Failed to start HTTP server!");

	Ok(())
}

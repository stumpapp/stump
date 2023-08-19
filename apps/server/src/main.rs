use std::net::SocketAddr;

use axum::Router;
use errors::{ServerError, ServerResult};
use stump_core::{config::logging::init_tracing, event::InternalCoreTask, StumpCore};
use tokio::sync::oneshot;
use tower_http::trace::TraceLayer;
use tracing::{error, info, trace};

mod config;
mod errors;
mod macros;
mod middleware;
mod routers;
mod utils;

use config::{cors, session};
use utils::shutdown_signal_with_cleanup;

fn debug_setup() {
	std::env::set_var(
		"STUMP_CLIENT_DIR",
		env!("CARGO_MANIFEST_DIR").to_string() + "/../web/dist",
	);
	std::env::set_var("STUMP_PROFILE", "debug");
}

// FIXME: ever since bumping rust, I get false postive errors on this line:
// no method `expect` on type `<Graceful<AddrIncoming, IntoMakeService<Router<(), Body>>, impl Future<Output = ()>, Exec> as IntoFuture>::Output`
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
	let port = stump_environment.port.unwrap_or(10801);

	// Note: init_tracing after loading the environment so the correct verbosity
	// level is used for logging.
	init_tracing();

	if stump_environment.verbosity.unwrap_or(1) >= 3 {
		trace!("Environment configuration: {:?}", stump_environment);
	}

	let core = StumpCore::new().await;
	if let Err(err) = core.run_migrations().await {
		error!("Failed to run migrations: {:?}", err);
		return Err(ServerError::ServerStartError(err.to_string()));
	}

	let server_ctx = core.get_context();
	let app_state = server_ctx.arced();
	let cors_layer = cors::get_cors_layer(port);

	info!("{}", core.get_shadow_text());

	let app = Router::new()
		.merge(routers::mount(app_state.clone()))
		.with_state(app_state.clone())
		.layer(session::get_session_layer())
		.layer(cors_layer)
		// TODO: not sure if it needs to be done in here or stump_core::config::logging,
		// but I want to ignore traces for asset requests, e.g. /assets/chunk-SRMZVY4F.02115dd3.js lol
		.layer(TraceLayer::new_for_http());

	let addr = SocketAddr::from(([0, 0, 0, 0], port));
	info!("⚡️ Stump HTTP server starting on http://{}", addr);

	// TODO: might need to refactor to use https://docs.rs/async-shutdown/latest/async_shutdown/
	let cleanup = || async move {
		println!("Initializing graceful shutdown...");

		let (shutdown_tx, shutdown_rx) = oneshot::channel();

		let _ = core
			.get_context()
			.dispatch_task(InternalCoreTask::Shutdown {
				return_sender: shutdown_tx,
			});

		shutdown_rx
			.await
			.expect("Failed to successfully handle shutdown");
	};

	axum::Server::bind(&addr)
		.serve(app.into_make_service())
		.with_graceful_shutdown(shutdown_signal_with_cleanup(Some(cleanup)))
		.await
		.expect("Failed to start Stump HTTP server!");

	Ok(())
}

use std::net::SocketAddr;

use axum::{extract::connect_info::Connected, serve::IncomingStream, Router};
use stump_core::{
	config::{bootstrap_config_dir, logging::init_tracing},
	job::JobControllerCommand,
	StumpCore,
};
use tokio::{net::TcpListener, sync::oneshot};
use tower_http::trace::TraceLayer;

use crate::{
	config::{cors, session::get_session_layer},
	errors::{EntryError, ServerError, ServerResult},
	routers,
	utils::shutdown_signal_with_cleanup,
};
use stump_core::config::StumpConfig;

pub async fn run_http_server(config: StumpConfig) -> ServerResult<()> {
	let core = StumpCore::new(config.clone()).await;

	// TODO: These need reorganizing, the core-specific initializations should just be
	// in some initialization function. The server-specific things, e.g. watcher, scheduler,
	// should be fully managed by the server and removed from the core...

	core.get_job_controller()
		.initialize()
		.await
		.map_err(|e| ServerError::ServerStartError(e.to_string()))?;

	// Initialize the server configuration. If it already exists, nothing will happen.
	core.init_server_config()
		.await
		.map_err(|e| ServerError::ServerStartError(e.to_string()))?;

	// Initialize the encryption key, if it doesn't exist
	core.init_encryption()
		.await
		.map_err(|e| ServerError::ServerStartError(e.to_string()))?;

	core.init_journal_mode()
		.await
		.map_err(|e| ServerError::ServerStartError(e.to_string()))?;

	// Initialize the scheduler
	core.init_scheduler()
		.await
		.map_err(|e| ServerError::ServerStartError(e.to_string()))?;

	core.init_library_watcher()
		.await
		.map_err(|e| ServerError::ServerStartError(e.to_string()))?;

	let server_ctx = core.get_context();
	let app_state = server_ctx.arced();
	let cors_layer = cors::get_cors_layer(config.clone());

	println!("{}", core.get_shadow_text());

	let app_router = routers::mount(app_state.clone()).await;
	let app = Router::new()
		.merge(app_router)
		.with_state(app_state.clone())
		.layer(get_session_layer(app_state.clone()))
		.layer(cors_layer)
		.layer(TraceLayer::new_for_http());

	// TODO: Refactor to use https://docs.rs/async-shutdown/latest/async_shutdown/
	let cleanup = || async move {
		println!("Initializing graceful shutdown...");

		let (shutdown_tx, shutdown_rx) = oneshot::channel();

		let _ = core
			.get_context()
			.send_job_controller_command(JobControllerCommand::Shutdown(shutdown_tx));

		let _ = core.get_context().library_watcher.stop().await;

		shutdown_rx
			.await
			.expect("Failed to successfully handle shutdown");
	};

	let addr = SocketAddr::from(([0, 0, 0, 0], config.port));
	let listener = tokio::net::TcpListener::bind(&addr)
		.await
		.map_err(|e| ServerError::ServerStartError(e.to_string()))?;

	tracing::info!("⚡️ Stump HTTP server starting on http://{}", addr);

	axum::serve(
		listener,
		app.into_make_service_with_connect_info::<StumpRequestInfo>(),
	)
	.with_graceful_shutdown(shutdown_signal_with_cleanup(Some(cleanup)))
	.await
	.expect("Failed to start Stump HTTP server!");

	Ok(())
}

#[allow(dead_code)]
pub async fn bootstrap_http_server_config() -> Result<StumpConfig, EntryError> {
	// Get STUMP_CONFIG_DIR to bootstrap startup
	let config_dir = bootstrap_config_dir();

	let config = StumpCore::init_config(config_dir)
		.map_err(|e| EntryError::InvalidConfig(e.to_string()))?;

	// Note: init_tracing after loading the environment so the correct verbosity
	// level is used for logging.
	init_tracing(&config);

	if config.verbosity >= 3 {
		tracing::trace!(?config, "App config");
	}

	Ok(config)
}

#[derive(Clone, Debug)]
pub struct StumpRequestInfo {
	pub ip_addr: std::net::IpAddr,
}

impl Connected<IncomingStream<'_, TcpListener>> for StumpRequestInfo {
	fn connect_info(target: IncomingStream<'_, TcpListener>) -> Self {
		StumpRequestInfo {
			ip_addr: target.remote_addr().ip(),
		}
	}
}

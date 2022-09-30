use std::{io, net::SocketAddr};

use axum::{
	http::StatusCode,
	response::{Html, IntoResponse},
	routing::{get, get_service},
	Extension, Router,
};
use axum_extra::routing::SpaRouter;
use errors::{ServerError, ServerResult};
use stump_core::StumpCore;
use tower_http::services::{ServeDir, ServeFile};
use tracing::error;

mod errors;
mod routers;

fn debug_setup() {
	std::env::set_var(
		"STUMP_CLIENT_DIR",
		env!("CARGO_MANIFEST_DIR").to_string() + "/client",
	);
	std::env::set_var(
		"ROCKET_CONFIG",
		env!("CARGO_MANIFEST_DIR").to_string() + "/Rocket.toml",
	);
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

	// lmao as you can see, ive had some issues with SPA routing
	let app = Router::new()
		.layer(Extension(server_ctx.arced()))
		.merge(SpaRouter::new("/assets", "dist"))
		.merge(routers::mount());
	// .fallback(get_service(ServeDir::new("dist")).handle_error(handle_error));
	// .fallback(get_service(ServeFile::new("dist/index.html")).handle_error(
	// 	|e| async move { (StatusCode::INTERNAL_SERVER_ERROR, format!("Error: {}", e)) },
	// ))
	// .nest(
	// 	"/dist",
	// 	get_service(ServeDir::new("dist")).handle_error(|e| async move {
	// 		(StatusCode::INTERNAL_SERVER_ERROR, format!("Error: {}", e))
	// 	}),
	// );
	// .merge(SpaRouter::new("/assets", "dist"))
	// .fallback_service(get_service(ServeDir::new("dist")).handle_error(handle_error));
	// .route(
	// 	"/",
	// 	get_service(ServeDir::new("./static/index.html")).handle_error(handle_error),
	// )
	// .merge(
	// 	axum_extra::routing::SpaRouter::new("/dist", "./dist/assets")
	// 		.index_file("./dist/index.html"),
	// );
	// .fallback(get(|| async { Html(include_str!("../dist/index.html")) }))
	// .fallback(
	// 	get_service(ServeDir::new("dist")).handle_error(|e| async move {
	// 		(StatusCode::INTERNAL_SERVER_ERROR, format!("Error: {}", e))
	// 	}),
	// );

	let addr = SocketAddr::from(([0, 0, 0, 0], 10801));

	// TODO: set ip based on env var
	// addr.set_ip()
	// TODO: set port based on env var
	// add.set_port(..);

	axum::Server::bind(&addr)
		.serve(app.into_make_service())
		.await
		.expect("Failed to start HTTP server!");

	Ok(())
}

async fn handle_error(_err: io::Error) -> impl IntoResponse {
	(StatusCode::INTERNAL_SERVER_ERROR, "Something went wrong...")
}

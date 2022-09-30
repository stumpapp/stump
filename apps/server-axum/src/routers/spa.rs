use std::path::Path;

use axum::{
	handler::Handler,
	http::StatusCode,
	response::Html,
	routing::{get, get_service, MethodRouter},
	Router,
};
use tower_http::services::ServeDir;

// #[axum_macros::debug_handler]
// async fn handler() -> MethodRouter<()> {
// 	let index = Path::new(&std::env::var("STUMP_CLIENT_DIR").unwrap_or("client".into()))
// 		.join("index.html");

// 	get_service(ServeDir::new(index)).handle_error(|e| async move {
// 		(StatusCode::INTERNAL_SERVER_ERROR, format!("Error: {}", e))
// 	})
// }

pub(crate) fn mount() -> Router {
	Router::new()
}

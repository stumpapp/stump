use std::path::Path;

use axum::Router;
use tower_http::services::{ServeDir, ServeFile};

use crate::config::state::AppState;

pub(crate) fn mount(app_state: AppState) -> Router<AppState> {
	let dist_path = Path::new(&app_state.config.client_dir);

	Router::new()
		.nest_service("/assets", ServeDir::new(dist_path.join("assets")))
		.nest_service("/dist", ServeDir::new(dist_path))
		.fallback_service(ServeFile::new(dist_path.join("index.html")))
}

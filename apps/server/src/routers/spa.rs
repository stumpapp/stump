use std::path::Path;

use axum::{
	body::Body,
	extract::State,
	http::{HeaderMap, Request},
	response::IntoResponse,
	routing::get,
	Router,
};
use tower_http::services::{ServeDir, ServeFile};

use crate::{
	config::state::AppState,
	errors::{APIError, APIResult},
};

pub const FAVICON: &str = "/favicon.ico";
const ASSETS: &str = "/assets";
const DIST: &str = "/dist";

pub(crate) fn mount(app_state: AppState) -> Router<AppState> {
	let dist_path = Path::new(&app_state.config.client_dir);

	Router::new()
		.route(FAVICON, get(favicon))
		.nest_service(ASSETS, ServeDir::new(dist_path.join("assets")))
		.nest_service(DIST, ServeDir::new(dist_path))
		.fallback_service(ServeFile::new(dist_path.join("index.html")))
}

pub(crate) fn relative_favicon_path() -> String {
	format!("{ASSETS}{FAVICON}")
}

// https://github.com/tokio-rs/axum/discussions/608#discussioncomment-7772294
async fn favicon(
	State(ctx): State<AppState>,
	headers: HeaderMap,
) -> APIResult<impl IntoResponse> {
	let mut req = Request::new(Body::empty());
	*req.headers_mut() = headers;
	match ServeFile::new(Path::new(&ctx.config.client_dir).join("favicon.ico"))
		.try_call(req)
		.await
	{
		Ok(res) => Ok(res),
		Err(e) => {
			tracing::error!(error = ?e, "Error serving favicon");
			Err(APIError::InternalServerError(e.to_string()))
		},
	}
}

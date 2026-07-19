use std::path::Path;

use axum::{
	body::Body,
	extract::State,
	http::{header, HeaderMap, HeaderValue, Request},
	response::IntoResponse,
	response::Response,
	routing::get,
	Router,
};
use tower::ServiceBuilder;
use tower_http::services::{ServeDir, ServeFile};
use tower_http::set_header::SetResponseHeaderLayer;

use crate::{
	config::state::AppState,
	errors::{APIError, APIResult},
};

pub const FAVICON: &str = "/favicon.ico";
const SW: &str = "/sw.js";
const INDEX: &str = "/";
const INDEX_HTML: &str = "/index.html";
const ASSETS: &str = "/assets";
const DIST: &str = "/dist";

pub(crate) fn mount(app_state: AppState) -> Router<AppState> {
	let dist_path = Path::new(&app_state.config.client_dir);
	let static_assets = ServiceBuilder::new()
		.layer(SetResponseHeaderLayer::if_not_present(
			header::VARY,
			HeaderValue::from_static("Accept-Encoding"),
		))
		.layer(SetResponseHeaderLayer::overriding(
			header::CACHE_CONTROL,
			HeaderValue::from_static("public, max-age=31536000, immutable, no-transform"),
		))
		.service(
			ServeDir::new(dist_path.join("assets"))
				.precompressed_br()
				.precompressed_gzip(),
		);

	let dist_files = ServiceBuilder::new()
		.layer(SetResponseHeaderLayer::if_not_present(
			header::VARY,
			HeaderValue::from_static("Accept-Encoding"),
		))
		.layer(SetResponseHeaderLayer::if_not_present(
			header::CACHE_CONTROL,
			HeaderValue::from_static("no-cache"),
		))
		.service(
			ServeDir::new(dist_path)
				.precompressed_br()
				.precompressed_gzip(),
		);

	let spa_fallback = ServiceBuilder::new()
		.layer(SetResponseHeaderLayer::if_not_present(
			header::CACHE_CONTROL,
			HeaderValue::from_static("no-cache"),
		))
		.service(ServeFile::new(dist_path.join("index.html")));

	Router::new()
		.route(INDEX, get(index_html))
		.route(INDEX_HTML, get(index_html))
		.route(FAVICON, get(favicon))
		.route(SW, get(serve_sw))
		.nest_service(ASSETS, static_assets)
		.nest_service(DIST, dist_files)
		.fallback_service(spa_fallback)
}

pub(crate) fn relative_favicon_path() -> String {
	format!("{ASSETS}{FAVICON}")
}

// https://github.com/tokio-rs/axum/discussions/608#discussioncomment-7772294
async fn favicon(
	State(ctx): State<AppState>,
	headers: HeaderMap,
) -> APIResult<impl IntoResponse> {
	let mut response = serve_dist_file(ctx, headers, "favicon.ico").await?;
	response.headers_mut().insert(
		header::CACHE_CONTROL,
		HeaderValue::from_static("public, max-age=86400"),
	);

	Ok(response)
}

async fn index_html(
	State(ctx): State<AppState>,
	headers: HeaderMap,
) -> APIResult<impl IntoResponse> {
	serve_with_no_cache(ctx, headers, "index.html").await
}

async fn serve_sw(
	State(ctx): State<AppState>,
	headers: HeaderMap,
) -> APIResult<impl IntoResponse> {
	serve_with_no_cache(ctx, headers, "sw.js").await
}

async fn serve_with_no_cache(
	ctx: AppState,
	headers: HeaderMap,
	path: &str,
) -> APIResult<Response> {
	let mut response = serve_dist_file(ctx, headers, path).await?;
	response
		.headers_mut()
		.insert(header::CACHE_CONTROL, HeaderValue::from_static("no-cache"));

	Ok(response)
}

async fn serve_dist_file(
	ctx: AppState,
	headers: HeaderMap,
	path: &str,
) -> APIResult<Response> {
	let mut req = Request::new(Body::empty());
	*req.headers_mut() = headers;

	match ServeFile::new(Path::new(&ctx.config.client_dir).join(path))
		.try_call(req)
		.await
	{
		Ok(res) => Ok(res.into_response()),
		Err(e) => {
			tracing::error!(error = ?e, path, "Error serving dist file");
			Err(APIError::InternalServerError(e.to_string()))
		},
	}
}

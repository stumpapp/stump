use axum::http::{
	header::{ACCEPT, AUTHORIZATION, CONTENT_TYPE},
	HeaderValue, Method,
};
use local_ip_address::local_ip;
use stump_core::config::StumpConfig;
use tower_http::cors::{AllowOrigin, CorsLayer};

const DEFAULT_ALLOWED_ORIGINS: &[&str] = &[
	"tauri://localhost",
	"https://tauri.localhost",
	"http://tauri.localhost",
];
const DEBUG_ALLOWED_ORIGINS: &[&str] = &[
	"tauri://localhost",
	"https://tauri.localhost",
	"http://tauri.localhost",
	"http://localhost:3000",
	"http://0.0.0.0:3000",
];

fn merge_origins(origins: &[&str], local_origins: Vec<String>) -> Vec<HeaderValue> {
	origins
		.iter()
		.map(|origin| origin.to_string())
		.chain(local_origins)
		.map(|origin| origin.parse())
		.filter_map(Result::ok)
		.collect::<Vec<HeaderValue>>()
}

pub fn get_cors_layer(config: StumpConfig) -> CorsLayer {
	let is_debug = config.is_debug();

	// Create CORS layer
	let mut cors_layer = CorsLayer::new();
	cors_layer = cors_layer
		.allow_methods([
			Method::GET,
			Method::PUT,
			Method::POST,
			Method::PATCH,
			Method::DELETE,
			Method::OPTIONS,
			Method::CONNECT,
		])
		.allow_headers([ACCEPT, AUTHORIZATION, CONTENT_TYPE])
		.allow_credentials(true);

	// If allowed origins include the general wildcard ("*") then we can return a permissive CORS layer and exit early.
	if config.allowed_origins.contains(&"*".to_string()) {
		cors_layer = cors_layer.allow_origin(AllowOrigin::any());

		#[cfg(debug_assertions)]
		tracing::trace!(
			?cors_layer,
			"Cors configuration completed (allowing any origin)"
		);

		return cors_layer;
	}

	// Convert allowed origins from config into `HeaderValue`s for CORS layer.
	let allowed_origins: Vec<_> = config
		.allowed_origins
		.into_iter()
		.filter_map(|origin| match origin.parse::<HeaderValue>() {
			Ok(val) => Some(val),
			Err(e) => {
				tracing::error!("Failed to parse allowed origin: {origin:?}: {e}");
				None
			},
		})
		.collect();

	let local_ip = local_ip()
		.map_err(|e| {
			tracing::error!("Failed to get local ip: {:?}", e);
			e
		})
		.map(|ip| ip.to_string())
		.unwrap_or_default();

	// Format the local IP with both http and https, and the port. If is_debug is true,
	// then also add port 3000.
	let local_origins = if local_ip.is_empty() {
		vec![]
	} else {
		let port = config.port;
		let mut base = vec![
			format!("http://{local_ip}:{port}"),
			format!("https://{local_ip}:{port}"),
		];

		if is_debug {
			base.append(&mut vec![
				format!("http://{local_ip}:3000"),
				format!("https://{local_ip}:3000"),
			]);
		}

		base
	};

	let defaults = if is_debug {
		DEBUG_ALLOWED_ORIGINS
	} else {
		DEFAULT_ALLOWED_ORIGINS
	};
	let default_allowlist = merge_origins(defaults, local_origins);

	// TODO: add new config option for fully overriding the default allowlist versus appending to it
	cors_layer = cors_layer.allow_origin(AllowOrigin::list(
		default_allowlist
			.into_iter()
			.chain(allowed_origins)
			.collect::<Vec<HeaderValue>>(),
	));

	#[cfg(debug_assertions)]
	tracing::trace!(?cors_layer, "Cors configuration complete");

	cors_layer
}

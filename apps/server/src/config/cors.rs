use axum::http::{
	header::{ACCEPT, AUTHORIZATION, CONTENT_TYPE},
	HeaderValue, Method,
};
use local_ip_address::local_ip;
use stump_core::config::StumpConfig;
use tower_http::cors::{AllowOrigin, CorsLayer};

const DEFAULT_ALLOWED_ORIGINS: &[&str] =
	&["tauri://localhost", "https://tauri.localhost"];
const DEBUG_ALLOWED_ORIGINS: &[&str] = &[
	"tauri://localhost",
	"https://tauri.localhost",
	"http://localhost:3000",
	"http://0.0.0.0:3000",
];

fn merge_origins(origins: &[&str], local_origins: Vec<String>) -> Vec<HeaderValue> {
	origins
		.iter()
		.map(|origin| origin.to_string())
		.chain(local_origins)
		.map(|origin| origin.parse())
		.filter_map(|res| res.ok())
		.collect::<Vec<HeaderValue>>()
}

pub fn get_cors_layer(config: StumpConfig) -> CorsLayer {
	let is_debug = config.is_debug();

	let mut allowed_origins = Vec::new();
	for origin in config.allowed_origins {
		match origin.parse::<HeaderValue>() {
			Ok(val) => allowed_origins.push(val),
			Err(_) => tracing::error!("Failed to parse allowed origin: {:?}", origin),
		}
	}

	let local_ip = local_ip()
		.map_err(|e| {
			tracing::error!("Failed to get local ip: {:?}", e);
			e
		})
		.map(|ip| ip.to_string())
		.unwrap_or_default();

	// Format the local IP with both http and https, and the port. If is_debug is true,
	// then also add port 3000.
	let local_orgins = if !local_ip.is_empty() {
		let port = config.port;
		let mut base = vec![
			format!("http://{local_ip}:{port}"),
			format!("https://{local_ip}:{port}"),
		];

		if is_debug {
			base.append(&mut vec![
				format!("http://{local_ip}:3000",),
				format!("https://{local_ip}:3000"),
			]);
		}

		base
	} else {
		vec![]
	};

	let mut cors_layer = CorsLayer::new();

	if !allowed_origins.is_empty() {
		// TODO: consider adding some config to allow for this list to be appended to defaults, rather than
		// completely overriding them.
		cors_layer = cors_layer.allow_origin(AllowOrigin::list(allowed_origins));
	} else if is_debug {
		let debug_origins = merge_origins(DEBUG_ALLOWED_ORIGINS, local_orgins);
		cors_layer = cors_layer.allow_origin(debug_origins);
	} else {
		let release_origins = merge_origins(DEFAULT_ALLOWED_ORIGINS, local_orgins);
		cors_layer = cors_layer.allow_origin(release_origins);
	}

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

	#[cfg(debug_assertions)]
	tracing::trace!(?cors_layer, "Cors configuration complete");

	cors_layer
}

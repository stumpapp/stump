use std::env;

use axum::http::{
	header::{ACCEPT, AUTHORIZATION, CONTENT_TYPE},
	HeaderValue, Method,
};
use local_ip_address::local_ip;
use tower_http::cors::{AllowOrigin, CorsLayer};
use tracing::{error, trace};

const DEBUG_ALLOWED_ORIGINS: &[&str] = &["http://localhost:3000", "http://0.0.0.0:3000"];
const DEFAULT_ALLOWED_ORIGINS: &[&str] =
	&["tauri://localhost", "https://tauri.localhost"];

pub fn get_cors_layer(port: u16) -> CorsLayer {
	let is_debug =
		env::var("STUMP_PROFILE").unwrap_or_else(|_| "release".into()) == "debug";

	let allowed_origins = match env::var("STUMP_ALLOWED_ORIGINS") {
		Ok(val) => {
			if val.is_empty() {
				None
			} else {
				Some(
					val.split(',')
						.map(|val| val.trim().to_string().parse::<HeaderValue>())
						// Note: doing this the more verbose way so I can log errors...
						.filter_map(|res| {
							if let Ok(val) = res {
								Some(val)
							} else {
								error!("Failed to parse allowed origin: {:?}", res);
								None
							}
						})
						.collect::<Vec<HeaderValue>>(),
				)
			}
		},
		Err(_) => None,
	};

	let local_ip = local_ip()
		.map_err(|e| {
			error!("Failed to get local ip: {:?}", e);
			e
		})
		.map(|ip| ip.to_string())
		.unwrap_or_default();

	// Format the local IP with both http and https, and the port. If is_debug is true,
	// then also add port 3000.
	let local_orgins = if !local_ip.is_empty() {
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

	if let Some(origins_list) = allowed_origins {
		cors_layer = cors_layer.allow_origin(AllowOrigin::list(origins_list));
	} else if is_debug {
		cors_layer = cors_layer.allow_origin(
			DEBUG_ALLOWED_ORIGINS
				.iter()
				.map(|origin| origin.to_string())
				.chain(local_orgins.into_iter())
				.map(|origin| origin.parse())
				.filter_map(|res| res.ok())
				.collect::<Vec<HeaderValue>>(),
		);
	} else {
		cors_layer = cors_layer.allow_origin(
			DEFAULT_ALLOWED_ORIGINS
				.iter()
				.map(|origin| origin.to_string())
				.chain(local_orgins.into_iter())
				.map(|origin| origin.parse())
				.filter_map(|res| res.ok())
				.collect::<Vec<HeaderValue>>(),
		);
	}

	#[cfg(debug_assertions)]
	trace!(?cors_layer, "Cors configuration complete");

	// TODO: finalize what cors should be... fucking hate cors lmao
	cors_layer
		.allow_methods([
			Method::GET,
			Method::PUT,
			Method::POST,
			Method::DELETE,
			Method::OPTIONS,
			Method::CONNECT,
		])
		.allow_headers([ACCEPT, AUTHORIZATION, CONTENT_TYPE])
		.allow_credentials(true)
}

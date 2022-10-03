use std::env;

use axum::http::{
	header::{ACCEPT, AUTHORIZATION, CONTENT_TYPE},
	HeaderValue, Method,
};
use tower_http::cors::{AllowOrigin, CorsLayer};
use tracing::error;

const DEFAULT_ALLOWED_ORIGINS: &[&str] =
	&["http://localhost:3000", "http://0.0.0.0:3000"];

pub fn get_cors_layer() -> CorsLayer {
	let allowed_origins = match env::var("STUMP_ALLOWED_ORIGINS") {
		Ok(val) => {
			if val.is_empty() {
				None
			} else {
				Some(
					val.split(",")
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

	let mut cors_layer = CorsLayer::new();

	if let Some(origins_list) = allowed_origins {
		cors_layer = cors_layer.allow_origin(AllowOrigin::list(origins_list));
	} else if env::var("STUMP_PROFILE").unwrap_or("release".into()) == "debug" {
		cors_layer = cors_layer.allow_origin(
			DEFAULT_ALLOWED_ORIGINS
				.into_iter()
				.map(|origin| origin.parse())
				.filter_map(|res| res.ok())
				.collect::<Vec<HeaderValue>>(),
		);
	}

	// TODO: finalize what cors should be... fucking hate cors lmao
	cors_layer
		// .allow_methods(Any)
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

use std::env;

use axum::http::{
	header::{ACCEPT, AUTHORIZATION},
	HeaderValue, Method,
};
use tower_http::cors::{AllowHeaders, AllowOrigin, CorsLayer};
use tracing::error;

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
	}

	cors_layer
		.allow_methods([Method::GET, Method::PUT, Method::POST, Method::DELETE])
		// TODO: tighten
		.allow_headers([AUTHORIZATION, ACCEPT])
		.allow_credentials(true)
}

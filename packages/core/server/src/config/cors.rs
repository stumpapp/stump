use std::env;

use rocket::http::Method;
use rocket_cors::{AllowedHeaders, AllowedOrigins, Cors};

pub fn get_cors() -> Cors {
	let exact_origins = match env::var("STUMP_ALLOWED_ORIGINS") {
		Ok(val) => {
			if val.is_empty() {
				None
			} else {
				Some(
					val.split(",")
						.map(|val| val.trim().to_string())
						.collect::<Vec<String>>(),
				)
			}
		},
		Err(_) => None,
	};

	let allowed_origins = match exact_origins {
		Some(val) => AllowedOrigins::some_exact(&val),
		None => AllowedOrigins::all(),
	};

	rocket_cors::CorsOptions {
		allowed_origins,
		allowed_methods: vec![Method::Get, Method::Put, Method::Post, Method::Delete]
			.into_iter()
			.map(From::from)
			.collect(),
		// allowed_headers: AllowedHeaders::some(&["Authorization", "Accept"]),
		allowed_headers: AllowedHeaders::All,
		allow_credentials: true,
		..Default::default()
	}
	.to_cors()
	.expect("Could not instantiate CORS configuration.")
}

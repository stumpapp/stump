use std::env;

use rocket::http::Method;
use rocket_cors::{AllowedHeaders, AllowedOrigins, Cors};

pub fn get_cors() -> Cors {
	let origin_strings = match env::var("STUMP_ALLOWED_ORIGINS") {
		Ok(val) => val
			.split(",")
			.map(|val| val.trim().to_string())
			.collect::<Vec<String>>(),
		Err(_) => vec![
			"http://localhost:3000".to_string(),
			"http://localhost:6969".to_string(),
			"http://0.0.0.0:6969".to_string(),
		],
	};

	// println!("Allowed origins: {:?}", origin_strings);

	let allowed_origins = AllowedOrigins::some_exact(&origin_strings);

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

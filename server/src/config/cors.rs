use rocket::http::Method;
use rocket_cors::{AllowedHeaders, AllowedOrigins, Cors};

pub fn get_cors() -> Cors {
    let allowed_origins =
        AllowedOrigins::some_exact(&["http://localhost:3000", "http://localhost:6969"]);

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

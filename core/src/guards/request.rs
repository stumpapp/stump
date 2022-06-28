use std::collections::HashMap;

use rocket::request::{FromRequest, Outcome, Request as RocketRequest};
use rocket_okapi::OpenApiFromRequest;

use crate::types::errors::ApiError;

#[derive(OpenApiFromRequest)]
pub struct Request {
	pub path: String,
	pub query_string: Option<String>,
	pub query_map: Option<HashMap<String, String>>,
}

#[rocket::async_trait]
impl<'r> FromRequest<'r> for Request {
	type Error = ApiError;

	async fn from_request(req: &'r RocketRequest<'_>) -> Outcome<Self, Self::Error> {
		let uri = req.uri();

		// uri!("/a/b/c?var=false").path() -> /a/b/c
		let path = uri.path().to_string();
		// uri!("/a/b/c?var=false").path() -> var=false
		let query_string = uri.query().and_then(|q| Some(q.to_string()));

		let query_map = match query_string.clone() {
			Some(query) => {
				let mut map = HashMap::new();

				for param in query.split("&") {
					let mut pair = param.split("=");
					let key = pair.next().and_then(|k| Some(k.to_string()));
					let value = pair.next().and_then(|k| Some(k.to_string()));

					if let (Some(key), Some(value)) = (key, value) {
						map.insert(key, value);
					}
				}

				Some(map)
			},
			None => None,
		};

		Outcome::Success(Request {
			path,
			query_string,
			query_map,
		})
	}
}

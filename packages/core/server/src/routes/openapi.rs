use rocket::Route;
use rocket_okapi::openapi_get_routes;

use super::{api, opds};

// https://github.com/GREsau/okapi/blob/master/examples/secure_request_guard/src/http_auth.rs
// Have to do this for Auth guard before I can really do this. Not the most important
// feature at the moment, so will leave this shell I've started for now.

pub fn openapi() -> Vec<Route> {
	let mut routes = openapi_get_routes![];

	// Add the routes from the `api` crate.
	routes.append(&mut api::api());

	// Add the routes from `opds` crate.
	routes.append(&mut opds::opds());

	routes
}

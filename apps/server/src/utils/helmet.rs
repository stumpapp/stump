use rocket::{
	fairing::{Fairing, Info, Kind},
	http::Header,
	Build, Request, Response, Rocket,
};

pub struct HelmetFairing {}

#[rocket::async_trait]
impl Fairing for HelmetFairing {
	fn info(&self) -> rocket::fairing::Info {
		Info {
			name: "Helmet",
			kind: Kind::Ignite | Kind::Response | Kind::Singleton,
		}
	}

	async fn on_ignite(
		&self,
		rocket: Rocket<Build>,
	) -> Result<Rocket<Build>, Rocket<Build>> {
		Ok(rocket)
	}

	async fn on_response<'r>(
		&self,
		_request: &'r Request<'_>,
		response: &mut Response<'r>,
	) {
		response.adjoin_header(Header::new(
			"Content-Security-Policy",
			format!("frame-ancestors {}", "http://localhost:3000"),
		));
	}
}

/// I am doing this because the rocket_contrib one is way to dated, won't work with the
/// latest version of rocket, and the goal is to be able to embed a cool little demo on the
/// stump landing site.
pub struct Helmet {}

impl Helmet {
	pub fn default() -> Self {
		Helmet {}
	}

	pub fn fairing(self) -> HelmetFairing {
		HelmetFairing {}
	}
}

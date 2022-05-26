use std::io::Cursor;

use rocket::{
	http::ContentType,
	request::{self, FromRequest},
	response::{self, Responder},
	Request, Response,
};
use rocket_okapi::{
	gen::OpenApiGenerator,
	request::{OpenApiFromRequest, RequestHeaderInput},
};

use super::models::AuthenticatedUser;

#[derive(Responder)]
#[response(content_type = "xml")]
pub struct XmlResponse(pub String);

pub struct UnauthorizedResponse;

impl<'r> Responder<'r, 'static> for UnauthorizedResponse {
	fn respond_to(self, _: &'r Request<'_>) -> response::Result<'static> {
		println!("Responding to request");
		Response::build()
			// .sized_body(self.0.len(), Cursor::new(self.0))
			// .header(ContentType::XML)
			.raw_header("Authorization", "Basic")
			.raw_header("WWW-Authenticate", "Basic realm=\"stump\"")
			.ok()
	}
}

pub type ImageResponse = (ContentType, Vec<u8>);

pub struct ImageResponseCached {
	// size: u64,
	pub data: Vec<u8>,
	pub content_type: ContentType,
}

impl<'r> Responder<'r, 'static> for ImageResponseCached {
	fn respond_to(self, _: &'r Request<'_>) -> response::Result<'static> {
		Response::build()
			.sized_body(self.data.len(), Cursor::new(self.data))
			// 10 minutes
			.raw_header("Cache-Control", "private,max-age=600")
			.header(self.content_type)
			.ok()
	}
}

// #[derive(OpenApiFromRequest)]
// pub struct StumpSession<'r>(rocket_session_store::Session<'r, AuthenticatedUser>);

// #[rocket::async_trait]
// impl<'a> FromRequest<'a> for StumpSession<'_> {
// 	type Error = ();

// 	async fn from_request(
// 		req: &'a request::Request<'_>,
// 	) -> request::Outcome<Self, Self::Error> {
// 		// Outcome::Success(NoSpecialAuthentication)

// 		let session: StumpSession<'_> = req.guard().await.expect("TODO");

// 		// session.0.from_request(req).await
// 	}
// }
// pub struct StumpSession(String);

// impl<'r> OpenApiFromRequest<'r> for StumpSession<'_> {
// 	fn from_request_input(
// 		_gen: &mut OpenApiGenerator,
// 		_name: String,
// 		_required: bool,
// 	) -> rocket_okapi::Result<RequestHeaderInput> {
// 		Ok(RequestHeaderInput::None)
// 	}
// }

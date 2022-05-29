use std::io::Cursor;

use rocket::{
	http::{ContentType, Status},
	request::{self, FromRequest},
	response::{self, Responder},
	serde::json::Json,
	Request, Response,
};
use rocket_okapi::{
	gen::OpenApiGenerator,
	request::{OpenApiFromRequest, RequestHeaderInput},
};
use serde::Serialize;

use super::{models::AuthenticatedUser, pageable::Pageable};

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

// TODO: figure out if this is best method for this, and if so make it :)
// impl<'r, T> Responder<'r, 'static> for Pageable<T>
// where
// 	T: Serialize,
// {
// 	fn respond_to(self, req: &'r Request<'_>) -> response::Result<'static> {
// 		let _links = &self._links;

// 		let unpaged = req.query_value::<bool>("unpaged").unwrap_or(Ok(true));

// 		if unpaged.is_err() {
// 			let e = format!("{:?}", unpaged.err().unwrap());

// 			log::debug!("Error in Pageable Response: {:?}", e);

// 			return Response::build()
// 				.status(Status::InternalServerError)
// 				.sized_body(e.len(), Cursor::new(e))
// 				.ok();
// 		}

// 		let unpaged = unpaged.unwrap();

// 		if unpaged {
// 			// Response::from(self)
// 			return Response::build_from(Json(self));
// 		}

// 		todo!()
// 	}
// }

// use crate::database::entities::{media, series};

use rocket::http::ContentType;
use std::io::Cursor;

use rocket::request::Request;
use rocket::response::{self, Responder, Response};

#[derive(Responder)]
#[response(content_type = "xml")]
pub struct XmlResponse(pub String);

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

// use crate::database::entities::{media, series};

#[derive(Responder)]
#[response(content_type = "xml")]
pub struct XmlResponse(pub String);

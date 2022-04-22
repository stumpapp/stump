use rocket::{
    response::{self, Responder},
    Request, Response,
};

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

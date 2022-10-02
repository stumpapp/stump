use axum::{
	http::{header, HeaderValue},
	response::{IntoResponse, Response},
};

pub struct Xml(pub String);

impl IntoResponse for Xml {
	fn into_response(self) -> Response {
		// initialize the response based on axum's default for strings
		let mut base_response = self.0.into_response();

		// only real difference is that we set the content type to xml
		base_response.headers_mut().insert(
			header::CONTENT_TYPE,
			HeaderValue::from_static("application/xml"),
		);

		base_response
	}
}

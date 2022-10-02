use axum::{
	headers::ContentType,
	http::{header, HeaderValue},
	response::{IntoResponse, Response},
};

pub struct ImageResponse {
	pub content_type: ContentType,
	pub data: Vec<u8>,
}

impl IntoResponse for ImageResponse {
	fn into_response(self) -> Response {
		let mut base_response = self.data.into_response();

		base_response.headers_mut().insert(
			header::CONTENT_TYPE,
			HeaderValue::from_str(self.content_type.to_string().as_str())
				.unwrap_or(HeaderValue::from_static("image/png")),
		);

		// 10 minutes
		// .raw_header("Cache-Control", "private,max-age=600")
		base_response
	}
}

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

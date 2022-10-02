use axum::{
	extract::Query,
	headers::ContentType,
	http::{header, HeaderValue},
	response::{IntoResponse, Response},
};
use stump_core::types::{PageParams, PagedRequestParams};

// TODO: remove in favor of BufferResponse, which is more generic.
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

pub struct BufferResponse {
	pub content_type: ContentType,
	pub data: Vec<u8>,
}

impl IntoResponse for BufferResponse {
	fn into_response(self) -> Response {
		let mut base_response = self.data.into_response();

		base_response.headers_mut().insert(
			header::CONTENT_TYPE,
			HeaderValue::from_str(self.content_type.to_string().as_str())
				.expect("Failed to parse content type"),
		);

		base_response
	}
}

pub struct UnknownBufferResponse {
	pub content_type: String,
	pub data: Vec<u8>,
}

impl IntoResponse for UnknownBufferResponse {
	fn into_response(self) -> Response {
		let mut base_response = self.data.into_response();

		base_response.headers_mut().insert(
			header::CONTENT_TYPE,
			HeaderValue::from_str(self.content_type.as_str())
				.expect("Failed to parse content type"),
		);

		base_response
	}
}

pub trait PageableTrait {
	fn page_params(self) -> PageParams;
}

impl PageableTrait for Query<PagedRequestParams> {
	fn page_params(self) -> PageParams {
		let params = self.0;

		let zero_based = params.zero_based.unwrap_or(false);

		PageParams {
			zero_based,
			page: params.page.unwrap_or(if zero_based { 0 } else { 1 }),
			page_size: params.page_size.unwrap_or(20),
			order_by: params.order_by.unwrap_or("name".to_string()),
			direction: params.direction.unwrap_or_default(),
		}
	}
}

use axum::{
	extract::Query,
	http::{header, HeaderValue},
	response::{IntoResponse, Response},
};
use stump_core::types::{ContentType, PageParams, PagedRequestParams};

/// [ImageResponse] is a thin wrapper struct to return an image correctly in Axum.
/// It contains a subset of actual Content-Type's (using [ContentType] enum from
/// stump_core), as well as the raw image data. This is mostly the same as [BufferResponse],
/// but adds the Cache-Control header.
pub struct ImageResponse {
	pub content_type: ContentType,
	pub data: Vec<u8>,
}

impl From<(ContentType, Vec<u8>)> for ImageResponse {
	fn from((content_type, data): (ContentType, Vec<u8>)) -> Self {
		Self { content_type, data }
	}
}

impl IntoResponse for ImageResponse {
	fn into_response(self) -> Response {
		let mut base_response = self.data.into_response();

		base_response.headers_mut().insert(
			header::CONTENT_TYPE,
			HeaderValue::from_str(self.content_type.to_string().as_str())
				.unwrap_or(HeaderValue::from_static("image/png")),
		);
		base_response.headers_mut().insert(
			header::CACHE_CONTROL,
			// 10 minutes
			HeaderValue::from_static("private,max-age=600"),
		);

		base_response
	}
}

/// [Xml] is a wrapper struct to return XML correctly in Axum. It really just
/// sets the content type to application/xml.
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

/// [BufferResponse] is a wrapper struct to return a buffer of any Stump-compliant (see [ContentType])
/// Content-Type correctly in Axum.
pub struct BufferResponse {
	pub content_type: ContentType,
	pub data: Vec<u8>,
}

impl From<(ContentType, Vec<u8>)> for BufferResponse {
	fn from((content_type, data): (ContentType, Vec<u8>)) -> Self {
		Self { content_type, data }
	}
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

/// [UnknownBufferResponse] is the same as [BufferResponse], but takes a string instead of a [ContentType].
/// This makes it useful for returning a buffer with a content type that Stump doesn't know about. I don't
/// anticipate this being used much, but it's here just in case.
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

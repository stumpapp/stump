use axum::{
	body::{BoxBody, StreamBody},
	extract::Query,
	http::{header, HeaderValue, StatusCode},
	response::{IntoResponse, Response},
};
use std::{
	io,
	path::{Path, PathBuf},
};
use stump_core::prelude::{ContentType, PageParams, PagedRequestParams};
use tokio::fs::File;
use tokio_util::io::ReaderStream;

/// A helper function to send an error response when something breaks *hard*. I only
/// anticipate this being used when an error occurs when building custom [Response]
/// objects.
pub(crate) fn unexpected_error<E: std::error::Error>(err: E) -> impl IntoResponse {
	(
		StatusCode::INTERNAL_SERVER_ERROR,
		format!("An unknown error occurred: {}", err),
	)
}
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
			page: params.page.unwrap_or_else(|| u32::from(!zero_based)),
			page_size: params.page_size.unwrap_or(20),
			order_by: params.order_by.unwrap_or_else(|| "name".to_string()),
			direction: params.direction.unwrap_or_default(),
		}
	}
}

// TODO: I think it would be cool to support some variant of a named file with
// range request support. I'm not sure how to do that yet, but it would be cool.
// maybe something here -> https://docs.rs/tower-http/latest/tower_http/services/fs/index.html
/// [NamedFile] is a struct used for serving 'named' files from the server. As
/// opposed to the static files handled by Stump's SPA router, this is used for
/// dynamic files outside of the server's static directory.
pub struct NamedFile {
	pub path_buf: PathBuf,
	pub file: File,
}

impl NamedFile {
	pub async fn open<P: AsRef<Path>>(path: P) -> io::Result<Self> {
		let file = File::open(path.as_ref()).await?;

		Ok(Self {
			path_buf: path.as_ref().to_path_buf(),
			file,
		})
	}
}

impl IntoResponse for NamedFile {
	fn into_response(self) -> Response {
		let stream = ReaderStream::new(self.file);
		let body = StreamBody::new(stream);

		// FIXME: unsafe unwraps
		let filename = self.path_buf.file_name().unwrap().to_str().unwrap();

		Response::builder()
			.header(
				header::CONTENT_TYPE,
				ContentType::from_infer(&self.path_buf).to_string(),
			)
			.header(
				header::CONTENT_DISPOSITION,
				format!("attachment; filename=\"{}\"", filename),
			)
			.body(BoxBody::new(body))
			.unwrap_or_else(|e| unexpected_error(e).into_response())
	}
}

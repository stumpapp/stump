use std::io::Cursor;

use rocket::{
	http::ContentType,
	response::{self, Responder},
	Request, Response,
};
use serde::Serialize;

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

// Note: I am not sure if I am going to use the below or not. I want to guage what the demand for
// paginatable APIs is, at least for this community. I'm definitely going to allow paging of the
// main endpoints, but whether or not to wrap every response in the `Pageable` struct I am unsure.
// Example might be something like:
/*
{
   "data": [{
	   "id": "",
	   "name": "",
	   ...
   }],
   "_page": {
	   "totalPages": 4,
	   "currentPage": 2,
	   "pageSize": 20,
	   "pageOffset": 40
   },
   "_links": {
	   "base": "api/series",
	   "self": "api/series?page=2",
	   "start": "api/series?page=0",
	   "prev": "api/series?page=1",
	   "next": "api/series?page=3",
   }
}
*/

#[derive(Serialize)]
pub struct PageLinks {
	/// The current request URL. E.g. http://example.com/api/v1/users?page=2
	#[serde(rename = "self")]
	pub itself: String,
	/// The start URL, relative to current paginated request URL. E.g. http://example.com/api/v1/users?page=0
	pub start: String,
	/// The prev URL, relative to current paginated request URL. E.g. http://example.com/api/v1/users?page=1
	pub prev: Option<String>,
	/// The next URL, relative to current paginated request URL. E.g. http://example.com/api/v1/users?page=3
	pub next: Option<String>,
}

#[derive(Serialize)]
#[serde(rename_all = "camelCase")]
pub struct PageInfo {
	/// The number of pages available.
	pub total_pages: u32,
	/// The current page, zero-indexed.
	pub current_page: u32,
	/// The number of elements per page.
	pub page_size: u32,
	/// The offset of the current page. E.g. if current page is 1, and pageSize is 10, the offset is 20.
	pub page_offset: u32,
}

#[derive(Serialize)]
pub struct Pageable<T: Serialize> {
	/// The target data being returned.
	data: T,
	/// The pagination information (if paginated).
	_page: Option<PageInfo>,
	/// The links to other pages (if paginated).
	_links: Option<PageLinks>,
}

impl<T: Serialize> Pageable<T> {
	pub fn unpaged(data: T) -> Self {
		Pageable {
			data,
			_page: None,
			_links: None,
		}
	}
}

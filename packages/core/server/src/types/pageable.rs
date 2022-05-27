use rocket_okapi::JsonSchema;
use serde::Serialize;

use crate::prisma::library;

use super::models::library::Library;
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

#[derive(Serialize, JsonSchema)]
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

#[derive(Serialize, JsonSchema)]
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

#[derive(Serialize, JsonSchema)]
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

// (libraries, page_size, total_pages, current_page)
impl Into<Pageable<Vec<Library>>> for (Vec<library::Data>, usize, usize, usize) {
	fn into(self) -> Pageable<Vec<Library>> {
		// let (libraries, page_size, total_pages, current_page) = self;
		// Pageable::unpaged(self)

		unimplemented!()
	}
}

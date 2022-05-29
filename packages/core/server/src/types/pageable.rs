// use rocket::form::Form;
use rocket_okapi::JsonSchema;
use serde::Serialize;

use crate::prisma::library;

use super::models::library::Library;

#[derive(Serialize, FromForm, JsonSchema)]
pub struct PagedRequestParams {
	pub page: Option<u32>,
	pub page_size: Option<u32>,
}

#[derive(Debug, Serialize, JsonSchema)]
pub struct PageParams {
	pub page: u32,
	pub page_size: u32,
}

impl Default for PageParams {
	fn default() -> Self {
		PageParams {
			page: 0,
			page_size: 20,
		}
	}
}

impl From<Option<PagedRequestParams>> for PageParams {
	fn from(req_params: Option<PagedRequestParams>) -> Self {
		match req_params {
			Some(params) => {
				let page_size = params.page_size.unwrap_or(20);
				let page = params.page.unwrap_or(0);

				PageParams { page, page_size }
			},
			None => PageParams::default(),
		}
	}
}

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

impl PageInfo {
	pub fn new(page_params: PageParams, total_pages: u32) -> Self {
		let current_page = page_params.page.try_into().unwrap();
		let page_size = page_params.page_size.try_into().unwrap();

		PageInfo {
			total_pages,
			current_page,
			page_size,
			page_offset: current_page * page_size,
		}
	}
}

#[derive(Serialize, JsonSchema)]
pub struct Pageable<T: Serialize> {
	/// The target data being returned.
	pub data: T,
	/// The pagination information (if paginated).
	pub _page: Option<PageInfo>,
	// NOTE: removing for now.
	// /// The links to other pages (if paginated).
	// pub _links: Option<PageLinks>,
}

impl<T: Serialize> Pageable<T> {
	pub fn unpaged(data: T) -> Self {
		Pageable {
			data,
			_page: None,
			// _links: None,
		}
	}

	pub fn new(data: T, page_info: PageInfo) -> Self {
		Pageable {
			data,
			_page: Some(page_info),
		}
	}
}

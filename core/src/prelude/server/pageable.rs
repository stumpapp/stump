use serde::{Deserialize, Serialize};
use specta::Type;
use tracing::trace;

use crate::prelude::DirectoryListing;

use super::Direction;

#[derive(Debug, Deserialize, Serialize, Type)]
pub struct PagedRequestParams {
	pub unpaged: Option<bool>,
	pub zero_based: Option<bool>,
	pub page: Option<u32>,
	pub page_size: Option<u32>,
	pub order_by: Option<String>,
	pub direction: Option<Direction>,
}

pub struct PageBounds {
	pub skip: i64,
	pub take: i64,
}

#[derive(Debug, Serialize, Clone, Type)]
pub struct PageParams {
	pub zero_based: bool,
	pub page: u32,
	pub page_size: u32,
	pub order_by: String,
	pub direction: Direction,
}

impl Default for PageParams {
	fn default() -> Self {
		PageParams {
			zero_based: false,
			page: 0,
			page_size: 20,
			order_by: "name".to_string(),
			direction: Direction::Asc,
		}
	}
}

impl PageParams {
	/// Returns a tuple of (skip, take) for use in Prisma queries.
	pub fn get_skip_take(&self) -> (i64, i64) {
		let start = if self.zero_based {
			self.page * self.page_size
		} else {
			(self.page - 1) * self.page_size
		} as i64;

		// let end = start + self.page_size;
		let take = self.page_size as i64;

		(start, take)
	}

	pub fn get_page_bounds(&self) -> PageBounds {
		let (skip, take) = self.get_skip_take();

		PageBounds { skip, take }
	}
}

impl From<Option<PagedRequestParams>> for PageParams {
	fn from(req_params: Option<PagedRequestParams>) -> Self {
		match req_params {
			Some(params) => {
				let zero_based = params.zero_based.unwrap_or(false);
				let page_size = params.page_size.unwrap_or(20);

				let default_page = u32::from(!zero_based);

				let page = params.page.unwrap_or(default_page);

				PageParams {
					page,
					page_size,
					zero_based,
					order_by: params.order_by.unwrap_or_else(|| "name".to_string()),
					direction: params.direction.unwrap_or_default(),
				}
			},
			None => PageParams::default(),
		}
	}
}

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

#[derive(Serialize, Type)]
pub struct PageInfo {
	/// The number of pages available.
	pub total_pages: u32,
	/// The current page, zero-indexed.
	pub current_page: u32,
	/// The number of elements per page.
	pub page_size: u32,
	/// The offset of the current page. E.g. if current page is 1, and pageSize is 10, the offset is 20.
	pub page_offset: u32,
	/// Whether or not the page is zero-indexed.
	pub zero_based: bool,
}

impl PageInfo {
	pub fn new(page_params: PageParams, total_pages: u32) -> Self {
		let current_page = page_params.page;
		let page_size = page_params.page_size;
		let zero_based = page_params.zero_based;

		PageInfo {
			total_pages,
			current_page,
			page_size,
			page_offset: current_page * page_size,
			zero_based,
		}
	}
}

#[derive(Serialize, Type)]
pub struct Pageable<T: Serialize> {
	/// The target data being returned.
	pub data: T,
	/// The pagination information (if paginated).
	pub _page: Option<PageInfo>,
	// FIXME: removing for now.
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

	// TODO: rename this terribly named function lol
	/// Generates a Pageable instance using an explicitly provided count and page params. This is useful for
	/// when the data provided is not the full set available, but rather a subset of the data (e.g. a query with
	/// a limit).
	pub fn from_truncated(data: T, db_count: i64, page_params: PageParams) -> Self {
		let total_pages = (db_count as f32 / page_params.page_size as f32).ceil() as u32;

		Pageable::new(data, PageInfo::new(page_params, total_pages))
	}
}

impl<T> From<Vec<T>> for Pageable<Vec<T>>
where
	T: Serialize + Clone,
{
	fn from(vec: Vec<T>) -> Pageable<Vec<T>> {
		Pageable::unpaged(vec)
	}
}

impl<T> From<(Vec<T>, PageParams)> for Pageable<Vec<T>>
where
	T: Serialize + Clone,
{
	fn from(tuple: (Vec<T>, PageParams)) -> Pageable<Vec<T>> {
		let (mut data, page_params) = tuple;

		let total_pages =
			(data.len() as f32 / page_params.page_size as f32).ceil() as u32;

		let start = match page_params.zero_based {
			true => page_params.page * page_params.page_size,
			false => (page_params.page - 1) * page_params.page_size,
		};

		// let start = page_params.page * page_params.page_size;
		let end = start + page_params.page_size;

		// println!("len:{}, start: {}, end: {}", data.len(), start, end);

		if start > data.len() as u32 {
			data = vec![];
		} else if end < data.len() as u32 {
			data = data
				.get((start as usize)..(end as usize))
				.ok_or("Invalid page")
				.unwrap()
				.to_vec();
		} else {
			data = data
				.get((start as usize)..)
				.ok_or("Invalid page")
				.unwrap()
				.to_vec();
		}

		Pageable::new(data, PageInfo::new(page_params, total_pages))
	}
}

impl<T> From<(Vec<T>, Option<PagedRequestParams>)> for Pageable<Vec<T>>
where
	T: Serialize + Clone,
{
	fn from(tuple: (Vec<T>, Option<PagedRequestParams>)) -> Pageable<Vec<T>> {
		(tuple.0, PageParams::from(tuple.1)).into()
	}
}

// Note: this is used when you have to query the database for the total number of pages.
impl<T> From<(Vec<T>, i64, PageParams)> for Pageable<Vec<T>>
where
	T: Serialize + Clone,
{
	fn from(tuple: (Vec<T>, i64, PageParams)) -> Pageable<Vec<T>> {
		let (data, db_total, page_params) = tuple;

		let total_pages = (db_total as f32 / page_params.page_size as f32).ceil() as u32;

		Pageable::new(data, PageInfo::new(page_params, total_pages))
	}
}

impl From<(DirectoryListing, u32, u32)> for Pageable<DirectoryListing> {
	fn from(tuple: (DirectoryListing, u32, u32)) -> Pageable<DirectoryListing> {
		let (data, page, page_size) = tuple;

		let total_pages = (data.files.len() as f32 / page_size as f32).ceil() as u32;
		// directory listing will always be zero-based.
		let start = (page - 1) * page_size;
		let end = start + page_size;

		let mut truncated_files = data.files;

		if start > truncated_files.len() as u32 {
			truncated_files = vec![];
		} else if end < truncated_files.len() as u32 {
			truncated_files = truncated_files
				.get((start as usize)..(end as usize))
				.ok_or("Invalid page")
				.unwrap()
				.to_vec();
		} else {
			truncated_files = truncated_files
				.get((start as usize)..)
				.ok_or("Invalid page")
				.unwrap()
				.to_vec();
		}

		trace!(
			"{} total pages of size {}. Returning truncated data of size {}.",
			total_pages,
			page_size,
			truncated_files.len()
		);

		let truncated_data = DirectoryListing {
			parent: data.parent,
			files: truncated_files,
		};

		Pageable::new(
			truncated_data,
			PageInfo {
				total_pages,
				current_page: page,
				page_size,
				page_offset: page * page_size,
				zero_based: false,
			},
		)
	}
}

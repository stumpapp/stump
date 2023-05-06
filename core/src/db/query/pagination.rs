use serde::{Deserialize, Serialize};
use specta::Type;
use tracing::trace;
use utoipa::ToSchema;

use crate::{
	db::entity::{Cursor, Library, Media, Series},
	filesystem::DirectoryListing,
};

// TODO: this entire file belongs in server app, not here. It is currently used by DAOs, which are
// very much going BYE BYE

#[derive(
	Clone, Default, Debug, Deserialize, Serialize, PartialEq, Eq, Type, ToSchema,
)]
pub struct PageQuery {
	pub zero_based: Option<bool>,
	pub page: Option<u32>,
	pub page_size: Option<u32>,
}

#[derive(
	Clone, Default, Debug, Deserialize, Serialize, PartialEq, Eq, Type, ToSchema,
)]
pub struct CursorQuery {
	pub cursor: Option<String>,
	pub limit: Option<i64>,
}

#[derive(Default, Debug, Deserialize, Serialize, Type, ToSchema)]
pub struct PaginationQuery {
	pub zero_based: Option<bool>,
	pub page: Option<u32>,
	pub page_size: Option<u32>,
	pub cursor: Option<String>,
	pub limit: Option<i64>,
}

impl PaginationQuery {
	pub fn get(self) -> Pagination {
		Pagination::from(self)
	}
}

impl From<PaginationQuery> for Pagination {
	fn from(p: PaginationQuery) -> Self {
		if p.cursor.is_some() || p.limit.is_some() {
			Pagination::Cursor(CursorQuery {
				cursor: p.cursor,
				limit: p.limit,
			})
		} else if p.page.is_some() || p.page_size.is_some() || p.zero_based.is_some() {
			Pagination::Page(PageQuery {
				page: p.page,
				page_size: p.page_size,
				zero_based: p.zero_based,
			})
		} else {
			Pagination::None
		}
	}
}

// FIXME: , ToSchema, not working...
#[derive(Clone, Default, Debug, Deserialize, Serialize, PartialEq, Eq, Type)]
#[serde(untagged)]
pub enum Pagination {
	#[default]
	None,
	Page(PageQuery),
	Cursor(CursorQuery),
}

impl Pagination {
	/// Returns true if pagination is None
	pub fn is_unpaged(&self) -> bool {
		matches!(self, Pagination::None)
	}

	/// Returns true if pagination is Page(..)
	pub fn is_paged(&self) -> bool {
		matches!(self, Pagination::Page(..))
	}

	/// Returns true if pagination is Cursor(..)
	pub fn is_cursor(&self) -> bool {
		matches!(self, Pagination::Cursor(..))
	}
}

impl PageQuery {
	/// Returns a tuple of (skip, take) for use in Prisma queries.
	pub fn get_skip_take(&self) -> (i64, i64) {
		let zero_based = self.zero_based.unwrap_or(false);
		let page_size = self.page_size.unwrap_or(20);
		let default_page = u32::from(!zero_based);
		let mut page = self.page.unwrap_or(default_page);

		if !zero_based && page == 0 {
			page = 1;
		}

		let start = if zero_based {
			page * page_size
		} else {
			(page - 1) * page_size
		} as i64;

		let take = page_size as i64;

		(start, take)
	}

	pub fn page_params(self) -> PageParams {
		let zero_based = self.zero_based.unwrap_or(false);

		PageParams {
			zero_based,
			page: self.page.unwrap_or_else(|| u32::from(!zero_based)),
			page_size: self.page_size.unwrap_or(20),
		}
	}
}

pub struct PageBounds {
	pub skip: i64,
	pub take: i64,
}

#[derive(Debug, Serialize, Clone, Type, ToSchema)]
pub struct PageParams {
	pub zero_based: bool,
	pub page: u32,
	pub page_size: u32,
}

impl Default for PageParams {
	fn default() -> Self {
		PageParams {
			zero_based: false,
			page: 0,
			page_size: 20,
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

impl From<Option<PageQuery>> for PageParams {
	fn from(req_params: Option<PageQuery>) -> Self {
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

#[derive(Serialize, Type, ToSchema)]
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

#[derive(Default, Debug, Deserialize, Serialize, PartialEq, Eq, Type, ToSchema)]
pub struct CursorInfo {
	current_cursor: Option<String>,
	limit: Option<i64>,
	next_cursor: Option<String>,
}

impl From<CursorQuery> for CursorInfo {
	fn from(cursor_query: CursorQuery) -> Self {
		Self {
			current_cursor: cursor_query.cursor,
			limit: cursor_query.limit,
			next_cursor: None,
		}
	}
}

#[derive(Serialize, Type, ToSchema)]
// OK, this is SO annoying...
#[aliases(PageableDirectoryListing = Pageable<DirectoryListing>)]
pub struct Pageable<T: Serialize> {
	/// The target data being returned.
	pub data: T,
	/// The pagination information (if paginated).
	pub _page: Option<PageInfo>,
	/// The cursor information (if cursor-baesd paginated).
	pub _cursor: Option<CursorInfo>,
}

// NOTE: this is an infuriating workaround for getting Pageable<Vec<T>> to work with utoipa
#[derive(Serialize, Type, ToSchema)]
#[aliases(PageableLibraries = PageableArray<Library>, PageableSeries = PageableArray<Series>, PageableMedia = PageableArray<Media>)]
pub struct PageableArray<T: Serialize> {
	/// The target data being returned.
	pub data: Vec<T>,
	/// The pagination information (if paginated).
	pub _page: Option<PageInfo>,
	/// The cursor information (if cursor-baesd paginated).
	pub _cursor: Option<CursorInfo>,
}

impl<T: Serialize> Pageable<T> {
	pub fn unpaged(data: T) -> Self {
		Pageable {
			data,
			_page: None,
			_cursor: None,
		}
	}

	pub fn page_paginated(data: T, page_info: PageInfo) -> Self {
		Self::new(data, Some(page_info), None)
	}

	pub fn cursor_paginated(data: T, cursor_info: CursorInfo) -> Self {
		Self::new(data, None, Some(cursor_info))
	}

	pub fn new(
		data: T,
		page_info: Option<PageInfo>,
		cursor_info: Option<CursorInfo>,
	) -> Self {
		Pageable {
			data,
			_page: page_info,
			_cursor: cursor_info,
		}
	}

	/// Generates a Pageable instance using an explicitly provided count and page params. This is useful for
	/// when the data provided is not the full set available, but rather a subset of the data (e.g. a query with
	/// a limit).
	pub fn with_count(data: T, db_count: i64, page_params: PageParams) -> Self {
		let total_pages = (db_count as f32 / page_params.page_size as f32).ceil() as u32;

		Pageable::page_paginated(data, PageInfo::new(page_params, total_pages))
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

		Pageable::page_paginated(data, PageInfo::new(page_params, total_pages))
	}
}

impl<T> From<(Vec<T>, Option<PageQuery>)> for Pageable<Vec<T>>
where
	T: Serialize + Clone,
{
	fn from(tuple: (Vec<T>, Option<PageQuery>)) -> Pageable<Vec<T>> {
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

		Pageable::page_paginated(data, PageInfo::new(page_params, total_pages))
	}
}

// Note: this is used when you have to query the database for the total number of pages.
impl<T> From<(Vec<T>, i64, Pagination)> for Pageable<Vec<T>>
where
	T: Serialize + Clone + Cursor,
{
	fn from(tuple: (Vec<T>, i64, Pagination)) -> Pageable<Vec<T>> {
		let (data, db_total, pagination) = tuple;

		match pagination {
			Pagination::Page(page_query) => {
				let page_params = page_query.page_params();
				let total_pages =
					(db_total as f32 / page_params.page_size as f32).ceil() as u32;
				Pageable::page_paginated(data, PageInfo::new(page_params, total_pages))
			},
			Pagination::Cursor(cursor_query) => {
				let next_cursor = if data.len() == db_total as usize {
					None
				} else {
					data.last().map(|item| item.cursor())
				};

				Pageable::cursor_paginated(
					data,
					CursorInfo {
						next_cursor,
						..cursor_query.into()
					},
				)
			},
			_ => Pageable::unpaged(data),
		}
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

		Pageable::page_paginated(
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

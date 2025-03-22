use async_graphql::{
	CustomValidator, InputObject, InputValueError, OneofObject, OutputType, SimpleObject,
	Union,
};

/// A simple cursor-based pagination input object
#[derive(Debug, Clone, InputObject)]
pub struct CursorPagination {
	pub after: Option<String>,
	pub limit: u64,
}

fn default_page_size() -> Option<u64> {
	Some(20)
}

fn default_zero_based() -> Option<bool> {
	Some(false)
}

/// A simple offset-based pagination input object
#[derive(Debug, Clone, InputObject)]
pub struct OffsetPagination {
	pub page: u64,
	#[graphql(default_with = "default_page_size()")]
	pub page_size: Option<u64>,
	#[graphql(default_with = "default_zero_based()")]
	pub zero_based: Option<bool>,
}

impl OffsetPagination {
	pub fn offset(&self) -> u64 {
		if self.zero_based.unwrap_or(false) {
			self.page * self.page_size.unwrap_or(20)
		} else {
			(self.page - 1) * self.page_size.unwrap_or(20)
		}
	}

	pub fn limit(&self) -> u64 {
		self.page_size.unwrap_or(20)
	}
}

#[derive(Debug, Clone, OneofObject)]
pub enum Pagination {
	Cursor(CursorPagination),
	Offset(OffsetPagination),
}

impl Default for Pagination {
	fn default() -> Self {
		Pagination::Offset(OffsetPagination {
			page: 1,
			page_size: default_page_size(),
			zero_based: default_zero_based(),
		})
	}
}

/// A custom validator for the Pagination enum that ensures that the input is valid
/// for the given pagination type
#[derive(Default)]
pub struct PaginationValidator;

impl CustomValidator<Pagination> for PaginationValidator {
	fn check(&self, input: &Pagination) -> Result<(), InputValueError<Pagination>> {
		match input {
			Pagination::Offset(offset) => {
				if !offset.zero_based.unwrap_or(false) && offset.page == 0 {
					Err(InputValueError::custom("Page must be greater than 0"))
				} else if offset.page_size.is_some_and(|x| x == 0) {
					Err(InputValueError::custom("Page size must be greater than 0"))
				} else {
					Ok(())
				}
			},
			_ => Ok(()),
		}
	}
}

/// Information about the current cursor pagination state
#[derive(Debug, SimpleObject)]
pub struct CursorPaginationInfo {
	/// The cursor of the current page. This should only be None if there are no results,
	/// since there is no cursor present to pull from. This technically deviates from
	/// popular (read: Relay) specs, but it works better for Stump
	pub current_cursor: Option<String>,
	/// The cursor the next page should use, if it exists.
	pub next_cursor: Option<String>,
}

/// Information about the current offset pagination state
#[derive(Debug, SimpleObject)]
pub struct OffsetPaginationInfo {
	/// The number of pages available. This is **not** affected by the zero-based flag,
	/// so a client requesting zero-based pagination will need to adjust their pagination
	/// logic accordingly.
	pub total_pages: u64,
	/// The current page, zero-indexed.
	pub current_page: u64,
	/// The number of elements per page.
	pub page_size: u64,
	/// The offset of the current page. E.g. if current page is 1, and pageSize is 10, the offset is 20.
	pub page_offset: u64,
	/// Whether or not the page is zero-indexed.
	pub zero_based: bool,
}

impl OffsetPaginationInfo {
	pub fn new(input: OffsetPagination, count: u64) -> Self {
		let zero_based = input.zero_based.unwrap_or(false);
		let page_size = input.page_size.unwrap_or(20);
		let current_page = input.page;

		let total_pages = (count as f64 / page_size as f64).ceil() as u64;
		// If zero-based, we don't need to subtract 1 from the current page
		let modifier = if zero_based { 0 } else { 1 };
		let page_offset = (current_page - modifier) * page_size;

		Self {
			current_page,
			page_size,
			total_pages,
			page_offset,
			zero_based,
		}
	}
}

#[derive(Debug, SimpleObject)]
pub struct CursorPaginatedResponse<T>
where
	T: OutputType,
{
	pub nodes: Vec<T>,
	pub cursor_info: CursorPaginationInfo,
}

#[derive(Debug, SimpleObject)]
pub struct OffsetPaginatedResponse<T>
where
	T: OutputType,
{
	pub nodes: Vec<T>,
	pub offset_info: OffsetPaginationInfo,
}

#[derive(Debug, Union)]
pub enum PaginationInfo {
	Cursor(CursorPaginationInfo),
	Offset(OffsetPaginationInfo),
}

#[derive(Debug, SimpleObject)]
pub struct PaginatedResponse<T>
where
	T: OutputType,
{
	pub nodes: Vec<T>,
	pub page_info: PaginationInfo,
}

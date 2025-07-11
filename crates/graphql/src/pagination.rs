use crate::object::{
	directory_listing::DirectoryListing, job::Job, library::Library, log::Log,
	media::Media, reading_list::ReadingList, series::Series, user::User,
};
use async_graphql::{
	CustomValidator, InputObject, InputValueError, OneofObject, OutputType, Result,
	SimpleObject, Union,
};
use sea_orm::{prelude::*, FromQueryResult, QuerySelect, Select};
use serde::{Deserialize, Serialize};
use std::fmt::Debug;

/// A simple cursor-based pagination input object
#[derive(Debug, Clone, InputObject)]
pub struct CursorPagination {
	pub after: Option<String>,
	#[graphql(default_with = "default_limit()")]
	pub limit: u64,
}

impl Default for CursorPagination {
	fn default() -> Self {
		Self {
			after: None,
			limit: 20,
		}
	}
}

fn default_restful_page() -> u64 {
	1
}

fn default_page_size() -> Option<u64> {
	Some(20)
}

fn default_limit() -> u64 {
	20
}

fn default_zero_based() -> Option<bool> {
	Some(false)
}

/// A simple offset-based pagination input object
#[derive(Debug, Clone, InputObject, Serialize, Deserialize)]
pub struct OffsetPagination {
	/// The page to start from. This is 1-based by default, but can be
	/// changed to 0-based by setting the `zero_based` field to true.
	#[serde(default = "default_restful_page")]
	pub page: u64,
	/// The number of items to return per page. This is 20 by default.
	#[graphql(default_with = "default_page_size()")]
	#[serde(default = "default_page_size")]
	pub page_size: Option<u64>,
	/// Whether or not the page is zero-based. This is false by default.
	#[graphql(default_with = "default_zero_based()")]
	#[serde(default = "default_zero_based")]
	pub zero_based: Option<bool>,
}

impl Default for OffsetPagination {
	fn default() -> Self {
		Self {
			page: 1,
			page_size: default_page_size(),
			zero_based: default_zero_based(),
		}
	}
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

	pub fn next_page(&self) -> u64 {
		if self.zero_based.unwrap_or(false) {
			self.page + 1
		} else {
			self.page
		}
	}

	pub fn previous_page(&self) -> Option<u64> {
		if self.zero_based.unwrap_or(false) {
			if self.page > 0 {
				Some(self.page - 1)
			} else {
				None
			}
		} else if self.page > 1 {
			Some(self.page - 1)
		} else {
			None
		}
	}
}

/// A simple pagination input object which does not paginate. An explicit struct is
/// required as a limitation of async_graphql's [OneofObject], which doesn't allow
/// for empty variants.
#[derive(Debug, Clone, InputObject)]
pub struct Unpaginated {
	unpaginated: bool,
}

/// A union of the supported pagination flavors which Stump supports. The resulting
/// response will be dependent on the pagination type used, e.g. a [CursorPaginatedResponse]
/// will be returned if the [CursorPagination] type is used.
///
/// You may use a conditional fragment in your GraphQL query for type-specific fields:
/// ```graphql
/// query MyQuery {
///     media(pagination: { offset: { page: 1, pageSize: 20 } }) {
///         ... on OffsetPaginationInfo {
///            totalPages
///            currentPage
///         }
///     }
/// }
/// ```
///
/// A special case is the `None` variant, which will return an offset-based pagination info
/// object based on the size of the result set. This will not paginate the results, so be
/// cautious when using this with large result sets.
///
/// **Note**: Be sure to call [Pagination::resolve] before using the pagination object
/// to ensure that the pagination object is in a valid state.
#[derive(Debug, Clone, OneofObject)]
pub enum Pagination {
	Cursor(CursorPagination),
	Offset(OffsetPagination),
	None(Unpaginated),
}

impl Pagination {
	/// Resolves the pagination object, ensuring that the pagination object is in a valid state. This
	/// primarily ensures that the `None` variant is converted to an offset-based pagination object
	/// when an invalid-but-non-error state of unpaginated=false is present.
	pub fn resolve(self) -> Pagination {
		match self {
			Pagination::None(input) if !input.unpaginated => {
				Pagination::Offset(OffsetPagination {
					page: 1,
					page_size: default_page_size(),
					zero_based: default_zero_based(),
				})
			},
			_ => self,
		}
	}
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
	/// The limit used when querying the database
	pub limit: u64,
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

	pub fn unpaged(count: u64) -> Self {
		Self {
			current_page: 1,
			page_size: count,
			total_pages: 1,
			page_offset: 0,
			zero_based: false,
		}
	}
}

#[derive(Debug, SimpleObject)]
#[graphql(concrete(name = "CursorPaginatedMediaResponse", params(Media)))]
pub struct CursorPaginatedResponse<T>
where
	T: OutputType,
{
	pub nodes: Vec<T>,
	pub cursor_info: CursorPaginationInfo,
}

#[derive(Debug, SimpleObject)]
#[graphql(concrete(
	name = "OffsetPaginatedDirectoryListingResponse",
	params(DirectoryListing)
))]
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
#[graphql(concrete(
	name = "PaginatedDirectoryListingResponse",
	params(DirectoryListing)
))]
#[graphql(concrete(name = "PaginatedJobResponse", params(Job)))]
#[graphql(concrete(name = "PaginatedLogResponse", params(Log)))]
#[graphql(concrete(name = "PaginatedMediaResponse", params(Media)))]
#[graphql(concrete(name = "PaginatedLibraryResponse", params(Library)))]
#[graphql(concrete(name = "PaginatedSeriesResponse", params(Series)))]
#[graphql(concrete(name = "PaginatedReadingListResponse", params(ReadingList)))]
#[graphql(concrete(name = "PaginatedUserResponse", params(User)))]
pub struct PaginatedResponse<T>
where
	T: OutputType,
{
	pub nodes: Vec<T>,
	pub page_info: PaginationInfo,
}

async fn get_paginated_offset_results<
	EntityType: EntityTrait<Model: Debug + FromQueryResult + Sized + Send + Sync>,
	GraphqlOutputType: From<EntityType::Model> + OutputType,
>(
	query: Select<EntityType>,
	conn: &DbConn,
	info: OffsetPagination,
) -> Result<PaginatedResponse<GraphqlOutputType>> {
	let count = query.clone().count(conn).await?;

	let models = query
		.offset(info.offset())
		.limit(info.limit())
		.into_model::<EntityType::Model>()
		.all(conn)
		.await?;

	Ok(PaginatedResponse {
		nodes: models.into_iter().map(GraphqlOutputType::from).collect(),
		page_info: OffsetPaginationInfo::new(info, count).into(),
	})
}

async fn get_paginated_cursor_results<
	EntityType: EntityTrait<Model: Debug + FromQueryResult + Sized + Send + Sync>,
	GraphqlOutputType: From<EntityType::Model> + OutputType,
>(
	query: Select<EntityType>,
	cursor_column: EntityType::Column,
	conn: &DbConn,
	info: CursorPagination,
	get_cursor: impl Fn(&EntityType::Model) -> String,
) -> Result<PaginatedResponse<GraphqlOutputType>> {
	let mut cursor = query.clone().cursor_by(cursor_column);
	if let Some(ref id) = info.after {
		let last_row = query
			.filter(cursor_column.eq(id.clone()))
			.into_model::<EntityType::Model>()
			.one(conn)
			.await?
			.ok_or("Cursor not found")?;
		cursor.after(last_row.get(cursor_column));
	}
	cursor.first(info.limit);

	let models = cursor.into_model::<EntityType::Model>().all(conn).await?;
	let current_cursor = info.after.or_else(|| models.first().map(&get_cursor));
	let next_cursor = match models.last().map(get_cursor) {
		Some(cursor) if models.len() == info.limit as usize => Some(cursor),
		_ => None,
	};

	Ok(PaginatedResponse {
		nodes: models.into_iter().map(GraphqlOutputType::from).collect(),
		page_info: CursorPaginationInfo {
			current_cursor,
			next_cursor,
			limit: info.limit,
		}
		.into(),
	})
}

async fn get_paginated_none_results<
	EntityType: EntityTrait<Model: Debug + FromQueryResult + Sized + Send + Sync>,
	GraphqlOutputType: From<EntityType::Model> + OutputType,
>(
	query: Select<EntityType>,
	conn: &DbConn,
) -> Result<PaginatedResponse<GraphqlOutputType>> {
	let models = query.into_model::<EntityType::Model>().all(conn).await?;
	let count = models.len().try_into()?;

	Ok(PaginatedResponse {
		nodes: models.into_iter().map(GraphqlOutputType::from).collect(),
		page_info: OffsetPaginationInfo::unpaged(count).into(),
	})
}

/// A helper function to get paginated results based on the pagination type, reducing
/// boilerplate in the resolver functions.
pub async fn get_paginated_results<
	EntityType: EntityTrait<Model: Debug + FromQueryResult + Sized + Send + Sync>,
	GraphqlOutputType: From<EntityType::Model> + OutputType,
>(
	query: Select<EntityType>,
	cursor_column: EntityType::Column,
	conn: &DbConn,
	pagination: Pagination,
	get_cursor: impl Fn(&EntityType::Model) -> String,
) -> Result<PaginatedResponse<GraphqlOutputType>> {
	match pagination {
		Pagination::Cursor(info) => {
			get_paginated_cursor_results(query, cursor_column, conn, info, get_cursor)
				.await
		},
		Pagination::Offset(info) => get_paginated_offset_results(query, conn, info).await,
		Pagination::None(_) => get_paginated_none_results(query, conn).await,
	}
}

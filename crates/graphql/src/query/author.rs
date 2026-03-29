use std::collections::HashMap;

use async_graphql::{Context, Object, Result};
use models::entity::{media, media_metadata, series};
use sea_orm::{prelude::*, sea_query::Query, QuerySelect};

use crate::{
	data::CoreContext,
	object::author::{Author, AuthorSeries},
	pagination::{
		OffsetPaginationInfo, PaginatedResponse, Pagination, PaginationValidator,
	},
};

/// Parses a comma-separated writers string into individual author names
fn parse_writers(writers: &str) -> Vec<String> {
	writers
		.split(',')
		.map(|s| s.trim().to_string())
		.filter(|s| !s.is_empty())
		.collect()
}

/// Helper to build a subquery for series IDs in a specific library
fn series_in_library_subquery(library_id: String) -> sea_orm::sea_query::SelectStatement {
	Query::select()
		.column(series::Column::Id)
		.from(series::Entity)
		.and_where(series::Column::LibraryId.eq(library_id))
		.to_owned()
}

/// Fetches all unique author names from the database, optionally scoped to a library.
/// Returns a HashMap with lowercase name as key and original casing as value.
async fn fetch_all_authors(
	conn: &DatabaseConnection,
	library_id: Option<String>,
) -> Result<HashMap<String, String>> {
	let mut query = media_metadata::Entity::find()
		.select_only()
		.column(media_metadata::Column::Writers)
		.distinct()
		.join_rev(
			sea_orm::JoinType::InnerJoin,
			media::Entity::belongs_to(media_metadata::Entity)
				.from(media::Column::Id)
				.to(media_metadata::Column::MediaId)
				.into(),
		)
		.filter(media_metadata::Column::Writers.is_not_null());

	if let Some(lib_id) = library_id {
		query = query.filter(
			media::Column::SeriesId.in_subquery(series_in_library_subquery(lib_id)),
		);
	}

	let writers: Vec<String> = query.into_tuple().all(conn).await?;

	// Deduplicate with case-insensitive key, preserving first-seen casing
	let mut unique_authors: HashMap<String, String> = HashMap::new();
	for writer_str in writers {
		for name in parse_writers(&writer_str) {
			let key = name.to_lowercase();
			unique_authors.entry(key).or_insert(name);
		}
	}

	Ok(unique_authors)
}

#[derive(Default)]
pub struct AuthorQuery;

#[Object]
impl AuthorQuery {
	/// Get a single author by name (case-insensitive exact match)
	async fn author_by_name(
		&self,
		ctx: &Context<'_>,
		name: String,
		#[graphql(desc = "Optional library ID to scope the author search")]
		library_id: Option<String>,
	) -> Result<Option<Author>> {
		let conn = ctx.data::<CoreContext>()?.conn.as_ref();

		let authors = fetch_all_authors(conn, library_id.clone()).await?;
		let search_key = name.to_lowercase();

		Ok(authors.get(&search_key).map(|original_name| Author {
			name: original_name.clone(),
			role: None,
			library_id,
		}))
	}

	/// Get a paginated list of authors with optional search filter
	async fn authors(
		&self,
		ctx: &Context<'_>,
		#[graphql(desc = "Case-insensitive substring search filter")] search: Option<
			String,
		>,
		#[graphql(desc = "Optional library ID to scope the author search")]
		library_id: Option<String>,
		#[graphql(default, validator(custom = "PaginationValidator"))]
		pagination: Pagination,
	) -> Result<PaginatedResponse<Author>> {
		let conn = ctx.data::<CoreContext>()?.conn.as_ref();

		let all_authors = fetch_all_authors(conn, library_id.clone()).await?;

		let filtered: Vec<String> = if let Some(ref search_term) = search {
			let search_lower = search_term.to_lowercase();
			all_authors
				.into_iter()
				.filter(|(key, _)| key.contains(&search_lower))
				.map(|(_, name)| name)
				.collect()
		} else {
			all_authors.into_values().collect()
		};

		let mut sorted: Vec<String> = filtered;
		sorted.sort_by_key(|a| a.to_lowercase());

		let total_count = sorted.len() as u64;

		// TODO: Pagination with large datasets NOT bound strictly to db records is a bit tricky and honestly not overly efficient
		match pagination.resolve() {
			Pagination::Cursor(_) => {
				// Cursor pagination doesn't make sense for in-memory data without stable IDs
				Err("Cursor pagination is not supported for authors".into())
			},
			Pagination::Offset(info) => {
				let offset = info.offset() as usize;
				let limit = info.limit() as usize;

				let paginated: Vec<Author> = sorted
					.into_iter()
					.skip(offset)
					.take(limit)
					.map(|name| Author {
						name,
						role: None,
						library_id: library_id.clone(),
					})
					.collect();

				Ok(PaginatedResponse {
					nodes: paginated,
					page_info: OffsetPaginationInfo::new(info, total_count).into(),
				})
			},
			Pagination::None(_) => {
				let authors: Vec<Author> = sorted
					.into_iter()
					.map(|name| Author {
						name,
						role: None,
						library_id: library_id.clone(),
					})
					.collect();

				Ok(PaginatedResponse {
					nodes: authors,
					page_info: OffsetPaginationInfo::unpaged(total_count).into(),
				})
			},
		}
	}

	/// Get a single author series by name (case-insensitive exact match)
	async fn author_series_by_name(
		&self,
		ctx: &Context<'_>,
		name: String,
		#[graphql(desc = "Optional library ID to scope the series search")]
		library_id: Option<String>,
	) -> Result<Option<AuthorSeries>> {
		let conn = ctx.data::<CoreContext>()?.conn.as_ref();

		let mut query = media_metadata::Entity::find()
			.select_only()
			.column(media_metadata::Column::Series)
			.distinct()
			.join_rev(
				sea_orm::JoinType::InnerJoin,
				media::Entity::belongs_to(media_metadata::Entity)
					.from(media::Column::Id)
					.to(media_metadata::Column::MediaId)
					.into(),
			)
			.filter(media_metadata::Column::Series.is_not_null());

		if let Some(ref lib_id) = library_id {
			query = query.filter(
				media::Column::SeriesId
					.in_subquery(series_in_library_subquery(lib_id.clone())),
			);
		}

		let series_names: Vec<String> = query.into_tuple().all(conn).await?;

		let search_lower = name.to_lowercase();
		let found = series_names
			.into_iter()
			.find(|s| s.to_lowercase() == search_lower);

		Ok(found.map(|title| AuthorSeries { title, library_id }))
	}
}

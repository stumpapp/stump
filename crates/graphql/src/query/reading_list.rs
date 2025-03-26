use async_graphql::{Context, Object, Result, ID};

use models::entity::reading_list;
use sea_orm::{prelude::*, QueryOrder, QuerySelect};

use crate::{
	data::{CoreContext, RequestContext},
	object::reading_list::ReadingList,
	pagination::{
		CursorPagination, CursorPaginationInfo, OffsetPagination, OffsetPaginationInfo,
		PaginatedResponse, Pagination, PaginationValidator,
	},
};

#[derive(Default)]
pub struct ReadingListQuery;

#[Object]
impl ReadingListQuery {
	/// Retrieves a paginated list of reading lists for the current user.
	///
	/// # Returns
	///
	/// A paginated list of reading lists.
	async fn reading_lists(
		&self,
		ctx: &Context<'_>,
		#[graphql(default, validator(custom = "PaginationValidator"))]
		pagination: Pagination,
	) -> Result<PaginatedResponse<ReadingList>> {
		let user_id = ctx.data::<RequestContext>()?.id();
		let conn = ctx.data::<CoreContext>()?.conn.as_ref();

		match pagination.resolve() {
			Pagination::Cursor(info) => get_cursor_result(user_id, conn, info).await,
			Pagination::Offset(info) => get_offset_result(user_id, conn, info).await,
			Pagination::None(_) => get_no_pagination_result(user_id, conn).await,
		}
	}

	/// Retrieves a reading list by ID for the current user.
	///
	/// # Returns
	/// A reading list with the given ID. If no reading list with this ID exists for the current user, an error will be returned.
	async fn reading_list_by_id(&self, ctx: &Context<'_>, id: ID) -> Result<ReadingList> {
		let user_id = ctx.data::<RequestContext>()?.id();
		let conn = ctx.data::<CoreContext>()?.conn.as_ref();

		let query = reading_list::Entity::find_for_user(&user_id, 1)
			.filter(reading_list::Column::Id.eq(id.to_string()))
			.into_model::<reading_list::Model>()
			.one(conn)
			.await?;

		Ok(ReadingList::from(query.ok_or("Reading list not found")?))
	}
}

async fn get_cursor_result(
	user_id: String,
	conn: &DbConn,
	info: CursorPagination,
) -> Result<PaginatedResponse<ReadingList>> {
	let query = reading_list::Entity::find_for_user(&user_id, 1);
	let mut cursor = query.cursor_by(reading_list::Column::Id);
	if let Some(ref id) = info.after {
		let reading_list = reading_list::Entity::find_for_user(&user_id, 1)
			.select_only()
			.column(reading_list::Column::Id)
			.filter(reading_list::Column::Id.eq(id.clone()))
			.order_by_asc(reading_list::Column::Id)
			.into_model::<reading_list::ReadingListIdCmpSelect>()
			.one(conn)
			.await?
			.ok_or("Cursor not found")?;
		cursor.after(reading_list.id);
	}
	cursor.first(info.limit);

	let models = cursor.into_model::<reading_list::Model>().all(conn).await?;
	let current_cursor = info.after.or_else(|| models.first().map(|m| m.id.clone()));
	let next_cursor = models.last().map(|m| m.id.clone());

	Ok(PaginatedResponse {
		nodes: models.into_iter().map(ReadingList::from).collect(),
		page_info: CursorPaginationInfo {
			current_cursor,
			next_cursor,
		}
		.into(),
	})
}

async fn get_offset_result(
	user_id: String,
	conn: &DbConn,
	info: OffsetPagination,
) -> Result<PaginatedResponse<ReadingList>> {
	let query = reading_list::Entity::find_for_user(&user_id, 1);
	let count = query.clone().count(conn).await?;

	let models = query
		.order_by_asc(reading_list::Column::Id)
		.offset(info.offset())
		.limit(info.limit())
		.into_model::<reading_list::Model>()
		.all(conn)
		.await?;

	Ok(PaginatedResponse {
		nodes: models.into_iter().map(ReadingList::from).collect(),
		page_info: OffsetPaginationInfo::new(info, count).into(),
	})
}

async fn get_no_pagination_result(
	user_id: String,
	conn: &DbConn,
) -> Result<PaginatedResponse<ReadingList>> {
	let query = reading_list::Entity::find_for_user(&user_id, 1);
	let models = query
		.order_by_asc(reading_list::Column::Id)
		.into_model::<reading_list::Model>()
		.all(conn)
		.await?;
	let count = models.len().try_into()?;

	Ok(PaginatedResponse {
		nodes: models.into_iter().map(ReadingList::from).collect(),
		page_info: OffsetPaginationInfo::unpaged(count).into(),
	})
}

#[cfg(test)]
mod tests {
	use super::*;
	use crate::pagination::PaginationInfo;
	use sea_orm::MockDatabase;

	fn get_test_model() -> reading_list::Model {
		reading_list::Model {
			id: "1".to_string(),
			name: "hello".to_string(),
			description: Some("world".to_string()),
			updated_at: "2021-08-01T00:00:00Z".parse().unwrap(),
			visibility: "PUBLIC".to_string(),
			ordering: "MANUAL".to_string(),
			creating_user_id: "42".to_string(),
		}
	}

	#[tokio::test]
	async fn test_cursor_pagination() {
		let mock_db = MockDatabase::new(sea_orm::DatabaseBackend::Sqlite)
			.append_query_results(vec![vec![get_test_model()], vec![get_test_model()]])
			.into_connection();

		let cursor_info = CursorPagination {
			after: Some("abc".to_string()),
			limit: 1,
		};
		let reading_lists = get_cursor_result("42".to_string(), &mock_db, cursor_info)
			.await
			.unwrap();

		assert_eq!(reading_lists.nodes.len(), 1);
		assert_eq!(reading_lists.nodes[0].model.id, "1");
		assert_eq!(reading_lists.nodes[0].model.name, "hello");

		match reading_lists.page_info {
			PaginationInfo::Cursor(info) => {
				assert_eq!(info.current_cursor, Some("abc".to_string()));
				assert_eq!(info.next_cursor, Some("1".to_string()));
			},
			_ => panic!("Expected Offset pagination info"),
		}
	}

	#[tokio::test]
	async fn test_cursor_pagination_cursor_not_found() {
		let mock_db = MockDatabase::new(sea_orm::DatabaseBackend::Sqlite)
			.append_query_results::<reading_list::Model, _, _>(vec![vec![]])
			.into_connection();

		let cursor_info = CursorPagination {
			after: Some("abc".to_string()),
			limit: 1,
		};
		let reading_lists =
			get_cursor_result("42".to_string(), &mock_db, cursor_info).await;

		assert!(reading_lists.is_err());
	}

	#[tokio::test]
	async fn test_cursor_pagination_no_more_results() {
		let mock_db = MockDatabase::new(sea_orm::DatabaseBackend::Sqlite)
			.append_query_results(vec![vec![get_test_model()], vec![]])
			.into_connection();

		let cursor_info = CursorPagination {
			after: Some("abc".to_string()),
			limit: 1,
		};
		let reading_lists = get_cursor_result("42".to_string(), &mock_db, cursor_info)
			.await
			.unwrap();

		assert!(reading_lists.nodes.is_empty());

		match reading_lists.page_info {
			PaginationInfo::Cursor(info) => {
				assert_eq!(info.current_cursor, Some("abc".to_string()));
				assert_eq!(info.next_cursor, None);
			},
			_ => panic!("Expected Offset pagination info"),
		}
	}

	#[tokio::test]
	async fn test_no_pagination() {
		let mock_db = MockDatabase::new(sea_orm::DatabaseBackend::Sqlite)
			.append_query_results(vec![vec![get_test_model()]])
			.into_connection();

		let reading_lists = get_no_pagination_result("42".to_string(), &mock_db)
			.await
			.unwrap();

		assert_eq!(reading_lists.nodes.len(), 1);
		assert_eq!(reading_lists.nodes[0].model, get_test_model());

		match reading_lists.page_info {
			PaginationInfo::Offset(info) => {
				assert_eq!(info.total_pages, 1);
				assert_eq!(info.current_page, 1);
				assert_eq!(info.page_size, 1);
				assert_eq!(info.page_offset, 0);
			},
			_ => panic!("Expected Offset pagination info"),
		}
	}

	#[tokio::test]
	async fn test_no_pagination_no_results() {
		let mock_db = MockDatabase::new(sea_orm::DatabaseBackend::Sqlite)
			.append_query_results::<reading_list::Model, _, _>(vec![vec![]])
			.into_connection();

		let reading_lists = get_no_pagination_result("42".to_string(), &mock_db)
			.await
			.unwrap();

		assert!(reading_lists.nodes.is_empty());

		match reading_lists.page_info {
			PaginationInfo::Offset(info) => {
				assert_eq!(info.total_pages, 1);
				assert_eq!(info.current_page, 1);
				assert_eq!(info.page_size, 0);
				assert_eq!(info.page_offset, 0);
			},
			_ => panic!("Expected Offset pagination info"),
		}
	}
}

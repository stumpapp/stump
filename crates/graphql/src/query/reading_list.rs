use async_graphql::{Context, Object, Result, ID};

use models::entity::reading_list;
use sea_orm::{prelude::*, QueryOrder, QuerySelect};

use crate::{
	data::{CoreContext, RequestContext},
	object::reading_list::ReadingList,
	pagination::{
		CursorPaginationInfo, OffsetPaginationInfo, PaginatedResponse, Pagination,
		PaginationValidator,
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
		let query = reading_list::Entity::find_for_user(&user_id, 1);

		match pagination.resolve() {
			Pagination::Cursor(info) => {
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
				let current_cursor =
					info.after.or_else(|| models.first().map(|m| m.id.clone()));
				let next_cursor = models.last().map(|m| m.id.clone());

				Ok(PaginatedResponse {
					nodes: models.into_iter().map(ReadingList::from).collect(),
					page_info: CursorPaginationInfo {
						current_cursor,
						next_cursor,
					}
					.into(),
				})
			},
			Pagination::Offset(info) => {
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
			},
			Pagination::None(_) => {
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
			},
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

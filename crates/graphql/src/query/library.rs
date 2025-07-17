use async_graphql::{Context, Object, Result, ID};
use models::{
	entity::{
		last_library_visit,
		library::{self, LibraryModelOrderBy},
	},
	shared::ordering::{OrderBy, OrderDirection},
};
use sea_orm::{prelude::*, QueryOrder, QuerySelect};

use crate::{
	data::{CoreContext, RequestContext},
	object::library::Library,
	pagination::{
		CursorPaginationInfo, OffsetPaginationInfo, PaginatedResponse, Pagination,
		PaginationValidator,
	},
};

#[derive(Default)]
pub struct LibraryQuery;

fn default_order_by_vec() -> Vec<LibraryModelOrderBy> {
	// Default ordering for libraries, can be customized as needed
	vec![LibraryModelOrderBy {
		field: library::LibraryModelOrdering::Name,
		direction: OrderDirection::Asc,
	}]
}

#[Object]
impl LibraryQuery {
	async fn libraries(
		&self,
		ctx: &Context<'_>,
		#[graphql(default_with = "default_order_by_vec()")] order_by: Vec<
			LibraryModelOrderBy,
		>,
		#[graphql(default, validator(custom = "PaginationValidator"))]
		pagination: Pagination,
	) -> Result<PaginatedResponse<Library>> {
		let RequestContext { user, .. } = ctx.data::<RequestContext>()?;
		let conn = ctx.data::<CoreContext>()?.conn.as_ref();

		let query = LibraryModelOrderBy::add_order_by(
			&order_by,
			library::Entity::find_for_user(user),
		)?;

		match pagination.resolve() {
			Pagination::Cursor(info) => {
				let mut cursor = query.cursor_by(library::Column::Name);
				if let Some(ref id) = info.after {
					let library = library::Entity::find_for_user(user)
						.select_only()
						.column(library::Column::Name)
						.filter(library::Column::Id.eq(id.clone()))
						.into_model::<library::LibraryNameCmpSelect>()
						.one(conn)
						.await?
						.ok_or("Cursor not found")?;
					cursor.after(library.name);
				}
				cursor.first(info.limit);

				let models = cursor.all(conn).await?;
				let current_cursor =
					info.after.or_else(|| models.first().map(|l| l.id.clone()));
				let next_cursor = match models.last().map(|l| l.id.clone()) {
					Some(id) if models.len() == info.limit as usize => Some(id),
					_ => None,
				};

				Ok(PaginatedResponse {
					nodes: models.into_iter().map(Library::from).collect(),
					page_info: CursorPaginationInfo {
						current_cursor,
						next_cursor,
						limit: info.limit,
					}
					.into(),
				})
			},
			Pagination::Offset(info) => {
				let count = query.clone().count(conn).await?;

				let models = query
					.offset(info.offset())
					.limit(info.limit())
					.all(conn)
					.await?;

				Ok(PaginatedResponse {
					nodes: models.into_iter().map(Library::from).collect(),
					page_info: OffsetPaginationInfo::new(info, count).into(),
				})
			},
			Pagination::None(_) => {
				let models = query.all(conn).await?;
				let count = models.len().try_into()?;
				Ok(PaginatedResponse {
					nodes: models.into_iter().map(Library::from).collect(),
					page_info: OffsetPaginationInfo::unpaged(count).into(),
				})
			},
		}
	}

	async fn library_by_id(&self, ctx: &Context<'_>, id: ID) -> Result<Option<Library>> {
		let RequestContext { user, .. } = ctx.data::<RequestContext>()?;
		let conn = ctx.data::<CoreContext>()?.conn.as_ref();

		let model = library::Entity::find_for_user(user)
			.filter(library::Column::Id.eq(id.to_string()))
			.one(conn)
			.await?;

		Ok(model.map(Library::from))
	}

	async fn number_of_libraries(&self, ctx: &Context<'_>) -> Result<u64> {
		let RequestContext { user, .. } = ctx.data::<RequestContext>()?;
		let conn = ctx.data::<CoreContext>()?.conn.as_ref();

		let count = library::Entity::find_for_user(user).count(conn).await?;

		Ok(count)
	}

	async fn last_visited_library(&self, ctx: &Context<'_>) -> Result<Option<Library>> {
		let RequestContext { user, .. } = ctx.data::<RequestContext>()?;
		let conn = ctx.data::<CoreContext>()?.conn.as_ref();

		let last_visited = last_library_visit::Entity::find()
			.filter(last_library_visit::Column::UserId.eq(user.id.to_string()))
			.find_also_related(library::Entity)
			.order_by_desc(last_library_visit::Column::Timestamp)
			.one(conn)
			.await?
			.and_then(|(_visit, library)| library.map(Library::from));

		Ok(last_visited)
	}
}

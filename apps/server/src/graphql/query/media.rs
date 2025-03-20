use async_graphql::{Context, Object, Result, ID};
use graphql::{
	data::{CoreContext, RequestContext},
	object::media::Media,
	pagination::{
		CursorPaginationInfo, OffsetPaginationInfo, PaginatedResponse, Pagination,
		PaginationValidator,
	},
};
use models::entity::media;
use sea_orm::{
	prelude::*,
	sea_query::{ExprTrait, Query},
	QueryOrder, QuerySelect,
};

#[derive(Default)]
pub struct MediaQuery;

// TODO(graphql): Filters
#[Object]
impl MediaQuery {
	async fn media(
		&self,
		ctx: &Context<'_>,
		#[graphql(default, validator(custom = "PaginationValidator"))]
		pagination: Pagination,
	) -> Result<PaginatedResponse<Media>> {
		let RequestContext { user, .. } = ctx.data::<RequestContext>()?;
		let conn = ctx.data::<CoreContext>()?.conn.as_ref();

		let query = media::ModelWithMetadata::find_for_user(user);

		match pagination {
			Pagination::Cursor(info) => {
				let mut cursor = query.cursor_by(media::Column::Name);
				if let Some(ref id) = info.after {
					let media = media::Entity::find_for_user(user)
						.select_only()
						.column(media::Column::Name)
						.filter(media::Column::Id.eq(id.clone()))
						.into_model::<media::MediaNameCmpSelect>()
						.one(conn)
						.await?
						.ok_or("Cursor not found")?;
					cursor.after(media.name);
				}
				cursor.first(info.limit);

				let models = cursor
					.into_model::<media::ModelWithMetadata>()
					.all(conn)
					.await?;
				let current_cursor = info
					.after
					.or_else(|| models.first().map(|m| m.media.id.clone()));
				let next_cursor = models.last().map(|m| m.media.id.clone());

				Ok(PaginatedResponse {
					nodes: models.into_iter().map(Media::from).collect(),
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
					.offset(info.offset())
					.limit(info.limit())
					.into_model::<media::ModelWithMetadata>()
					.all(conn)
					.await?;

				Ok(PaginatedResponse {
					nodes: models.into_iter().map(Media::from).collect(),
					page_info: OffsetPaginationInfo::new(info, count).into(),
				})
			},
		}
	}

	async fn media_by_id(&self, ctx: &Context<'_>, id: ID) -> Result<Option<Media>> {
		let conn = ctx.data::<CoreContext>()?.conn.as_ref();

		let model = media::ModelWithMetadata::find_by_id(id.to_string())
			.into_model::<media::ModelWithMetadata>()
			.one(conn)
			.await?;

		Ok(model.map(Media::from))
	}

	async fn recently_added_media(
		&self,
		ctx: &Context<'_>,
		#[graphql(default, validator(custom = "PaginationValidator"))]
		pagination: Pagination,
	) -> Result<PaginatedResponse<Media>> {
		let RequestContext { user, .. } = ctx.data::<RequestContext>()?;
		let conn = ctx.data::<CoreContext>()?.conn.as_ref();

		let query = media::ModelWithMetadata::find_for_user(user);

		match pagination {
			Pagination::Cursor(info) => {
				let mut cursor = query.cursor_by(media::Column::CreatedAt);
				if let Some(ref id) = info.after {
					let media = media::Entity::find_for_user(user)
						.select_only()
						.column(media::Column::CreatedAt)
						.filter(media::Column::Id.eq(id.clone()))
						.into_model::<media::MediaCreatedAtCmpSelect>()
						.one(conn)
						.await?
						.ok_or("Cursor not found")?;
					cursor.desc().after(media.created_at);
				}
				cursor.first(info.limit);

				let models = cursor
					.into_model::<media::ModelWithMetadata>()
					.all(conn)
					.await?;
				let current_cursor = info
					.after
					.or_else(|| models.first().map(|m| m.media.id.clone()));
				let next_cursor = models.last().map(|m| m.media.id.clone());

				Ok(PaginatedResponse {
					nodes: models.into_iter().map(Media::from).collect(),
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
					.order_by_desc(media::Column::CreatedAt)
					.offset(info.offset())
					.limit(info.limit())
					.into_model::<media::ModelWithMetadata>()
					.all(conn)
					.await?;

				Ok(PaginatedResponse {
					nodes: models.into_iter().map(Media::from).collect(),
					page_info: OffsetPaginationInfo::new(info, count).into(),
				})
			},
		}
	}

	async fn duplicate_media(&self, ctx: &Context<'_>) -> Result<Vec<Media>> {
		let RequestContext { user, .. } = ctx.data::<RequestContext>()?;
		let conn = ctx.data::<CoreContext>()?.conn.as_ref();

		let models = media::ModelWithMetadata::find_for_user(user)
			.filter(
				media::Column::Hash.in_subquery(
					Query::select()
						.column(media::Column::Hash)
						.from(media::Entity)
						.add_group_by([Expr::col(media::Column::Hash).into()])
						.and_having(Expr::col(media::Column::Id).count().gt(1))
						.to_owned(),
				),
			)
			.into_model::<media::ModelWithMetadata>()
			.all(conn)
			.await?;

		Ok(models.into_iter().map(Media::from).collect())
	}
}

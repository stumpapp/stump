use async_graphql::{Context, InputObject, Object, OneofObject, Result, ID};
use models::{
	entity::{finished_reading_session, media, media_metadata, reading_session},
	shared::ordering::{OrderBy, OrderDirection},
};
use sea_orm::{
	prelude::*,
	sea_query::{ExprTrait, Query},
	Condition, JoinType, QueryOrder, QuerySelect,
};
use std::str::FromStr;

use crate::{
	data::{CoreContext, RequestContext},
	filter::{media::MediaFilterInput, IntoFilter},
	object::media::Media,
	pagination::{
		CursorPaginationInfo, OffsetPaginationInfo, PaginatedResponse, Pagination,
		PaginationValidator,
	},
};

#[derive(InputObject, Clone)]
#[graphql(concrete(name = "MediaOrderBy", params(media::MediaModelOrdering)))]
#[graphql(concrete(
	name = "MediaMetadataOrderBy",
	params(media_metadata::MediaMetadataModelOrdering)
))]
pub struct OrderByField<OrderBy: Send + Sync + async_graphql::InputType> {
	pub field: OrderBy,
	pub direction: OrderDirection,
}

#[derive(InputObject)]
pub struct MediaWithMetadataOrderBy {
	order_bys: Vec<CombinedOrderByField>,
}

#[derive(OneofObject, Clone)]
pub enum CombinedOrderByField {
	MediaOrderBy(OrderByField<media::MediaModelOrdering>),
	MediaMetadataOrderBy(OrderByField<media_metadata::MediaMetadataModelOrdering>),
}

impl OrderBy<media::Entity> for MediaWithMetadataOrderBy {
	fn add_order_bys(
		&self,
		query: sea_orm::Select<media::Entity>,
	) -> Result<sea_orm::Select<media::Entity>, sea_orm::ColumnFromStrErr> {
		if self.order_bys.is_empty() {
			return Ok(query);
		}

		// TODO:(graphql) this is hacky, it should done as a direct column match
		self.order_bys
			.iter()
			.try_fold(query, |query, order_by| match order_by {
				CombinedOrderByField::MediaOrderBy(order_by) => {
					let order = sea_orm::Order::from(order_by.direction);
					let field = media::Column::from_str(
						&order_by.field.to_string().to_lowercase(),
					)?;
					Ok(query.order_by(field, order))
				},
				CombinedOrderByField::MediaMetadataOrderBy(order_by) => {
					let order = sea_orm::Order::from(order_by.direction);
					let field = media_metadata::Column::from_str(
						&order_by.field.to_string().to_lowercase(),
					)?;
					Ok(query.order_by(field, order))
				},
			})
	}
}

#[derive(Default)]
pub struct MediaQuery;

#[Object]
impl MediaQuery {
	async fn media(
		&self,
		ctx: &Context<'_>,
		filter: MediaFilterInput,
		order_by: Option<MediaWithMetadataOrderBy>,
		#[graphql(default, validator(custom = "PaginationValidator"))]
		pagination: Pagination,
	) -> Result<PaginatedResponse<Media>> {
		let RequestContext { user, .. } = ctx.data::<RequestContext>()?;
		let conn = ctx.data::<CoreContext>()?.conn.as_ref();

		let should_join_sessions = filter.reading_status.is_some()
			|| [&filter._and, &filter._or, &filter._not]
				.iter()
				.filter_map(|opt| opt.as_ref())
				.any(|filters| filters.iter().any(|f| f.reading_status.is_some()));

		let conditions = filter.into_filter();
		let mut query = media::ModelWithMetadata::find_for_user(user).filter(conditions);
		query = if let Some(order_by) = order_by {
			order_by.add_order_bys(query)?
		} else {
			// TODO:(graphql) default order by?
			query
		};

		if should_join_sessions {
			let user_id = user.id.clone();
			let user_id_cpy = user_id.clone();
			query = query
				.join_rev(
					JoinType::LeftJoin,
					reading_session::Entity::belongs_to(media::Entity)
						.from(reading_session::Column::MediaId)
						.to(media::Column::Id)
						.on_condition(move |_left, _right| {
							Condition::all()
								.add(reading_session::Column::UserId.eq(user_id.clone()))
						})
						.into(),
				)
				.join_rev(
					JoinType::LeftJoin,
					finished_reading_session::Entity::belongs_to(media::Entity)
						.from(finished_reading_session::Column::MediaId)
						.to(media::Column::Id)
						.on_condition(move |_left, _right| {
							Condition::all().add(
								finished_reading_session::Column::UserId
									.eq(user_id_cpy.clone()),
							)
						})
						.into(),
				)
				.group_by(media::Column::Id)
		}

		match pagination.resolve() {
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
				let next_cursor = match models.last().map(|m| m.media.id.clone()) {
					Some(id) if models.len() == info.limit as usize => Some(id),
					_ => None,
				};

				Ok(PaginatedResponse {
					nodes: models.into_iter().map(Media::from).collect(),
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
					.into_model::<media::ModelWithMetadata>()
					.all(conn)
					.await?;

				Ok(PaginatedResponse {
					nodes: models.into_iter().map(Media::from).collect(),
					page_info: OffsetPaginationInfo::new(info, count).into(),
				})
			},
			Pagination::None(_) => {
				let models = query
					.into_model::<media::ModelWithMetadata>()
					.all(conn)
					.await?;
				let count = models.len().try_into()?;

				Ok(PaginatedResponse {
					nodes: models.into_iter().map(Media::from).collect(),
					page_info: OffsetPaginationInfo::unpaged(count).into(),
				})
			},
		}
	}

	async fn media_by_id(&self, ctx: &Context<'_>, id: ID) -> Result<Option<Media>> {
		let RequestContext { user, .. } = ctx.data::<RequestContext>()?;
		let conn = ctx.data::<CoreContext>()?.conn.as_ref();

		let model = media::ModelWithMetadata::find_by_id_for_user(id.to_string(), user)
			.into_model::<media::ModelWithMetadata>()
			.one(conn)
			.await?;

		Ok(model.map(Media::from))
	}

	async fn media_by_path(
		&self,
		ctx: &Context<'_>,
		path: String,
	) -> Result<Option<Media>> {
		let RequestContext { user, .. } = ctx.data::<RequestContext>()?;
		let conn = ctx.data::<CoreContext>()?.conn.as_ref();

		let model = media::ModelWithMetadata::find_for_user(user)
			.filter(media::Column::Path.eq(path))
			.into_model::<media::ModelWithMetadata>()
			.one(conn)
			.await?;

		Ok(model.map(Media::from))
	}

	pub(crate) async fn keep_reading(
		&self,
		ctx: &Context<'_>,
		#[graphql(default, validator(custom = "PaginationValidator"))]
		pagination: Pagination,
	) -> Result<PaginatedResponse<Media>> {
		let RequestContext { user, .. } = ctx.data::<RequestContext>()?;
		let conn = ctx.data::<CoreContext>()?.conn.as_ref();

		let user_id = user.id.clone();
		let query = media::ModelWithMetadata::find_for_user(user)
			.join_rev(
				JoinType::InnerJoin,
				reading_session::Entity::belongs_to(media::Entity)
					.from(reading_session::Column::MediaId)
					.to(media::Column::Id)
					.on_condition(move |_left, _right| {
						Condition::all()
							.add(reading_session::Column::UserId.eq(user_id.clone()))
					})
					.into(),
			)
			.order_by_desc(reading_session::Column::UpdatedAt);

		match pagination.resolve() {
			Pagination::Cursor(info) => {
				let user_id = user.id.clone();
				let mut cursor = query.cursor_by(reading_session::Column::UpdatedAt);
				if let Some(ref id) = info.after {
					let id = id.clone(); // Clone for closure on_condition
					let record = media::Entity::find_for_user(user)
						.select_only()
						.column(reading_session::Column::UpdatedAt)
						.join_rev(
							JoinType::InnerJoin,
							reading_session::Entity::belongs_to(media::Entity)
								.from(reading_session::Column::MediaId)
								.to(media::Column::Id)
								.on_condition(move |_left, _right| {
									Condition::all().add(
										reading_session::Column::UserId
											.eq(user_id.clone())
											.and(
												reading_session::Column::MediaId
													.eq(id.clone()),
											),
									)
								})
								.into(),
						)
						.into_model::<media::ReadingSessionUpdatedAtCmpSelect>()
						.one(conn)
						.await?
						.ok_or("Cursor not found")?;
					cursor.desc().after(record.updated_at);
				}
				cursor.first(info.limit);

				let models = cursor
					.group_by(media::Column::Id)
					.into_model::<media::ModelWithMetadata>()
					.all(conn)
					.await?;
				let current_cursor = info
					.after
					.or_else(|| models.first().map(|m| m.media.id.clone()));
				let next_cursor = match models.last().map(|m| m.media.id.clone()) {
					Some(id) if models.len() == info.limit as usize => Some(id),
					_ => None,
				};

				Ok(PaginatedResponse {
					nodes: models.into_iter().map(Media::from).collect(),
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
					.into_model::<media::ModelWithMetadata>()
					.all(conn)
					.await?;

				Ok(PaginatedResponse {
					nodes: models.into_iter().map(Media::from).collect(),
					page_info: OffsetPaginationInfo::new(info, count).into(),
				})
			},
			Pagination::None(_) => {
				let models = query
					.into_model::<media::ModelWithMetadata>()
					.all(conn)
					.await?;
				let count = models.len().try_into()?;

				Ok(PaginatedResponse {
					nodes: models.into_iter().map(Media::from).collect(),
					page_info: OffsetPaginationInfo::unpaged(count).into(),
				})
			},
		}
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

		match pagination.resolve() {
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
				let next_cursor = match models.last().map(|m| m.media.id.clone()) {
					Some(id) if models.len() == info.limit as usize => Some(id),
					_ => None,
				};

				Ok(PaginatedResponse {
					nodes: models.into_iter().map(Media::from).collect(),
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
			Pagination::None(_) => {
				let models = query
					.order_by_desc(media::Column::CreatedAt)
					.into_model::<media::ModelWithMetadata>()
					.all(conn)
					.await?;
				let count = models.len().try_into()?;

				Ok(PaginatedResponse {
					nodes: models.into_iter().map(Media::from).collect(),
					page_info: OffsetPaginationInfo::unpaged(count).into(),
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

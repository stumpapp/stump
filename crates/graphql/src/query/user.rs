use async_graphql::{Context, Object, Result, ID};
use models::{
	entity::finished_reading_session, entity::user, entity::user_login_activity,
	shared::enums::UserPermission,
};
use sea_orm::{
	prelude::*,
	sea_query::{Alias, Expr},
	QueryOrder, QuerySelect,
};

use crate::{
	data::{AuthContext, CoreContext},
	guard::{PermissionGuard, SelfGuard, ServerOwnerGuard},
	object::{user::User, user_login_activity::UserLoginActivity},
	pagination::{
		CursorPaginationInfo, OffsetPaginationInfo, PaginatedResponse, Pagination,
		PaginationValidator,
	},
};

#[derive(Default)]
pub struct UserQuery;

#[Object]
impl UserQuery {
	async fn me(&self, ctx: &Context<'_>) -> Result<User> {
		let AuthContext { user, .. } = ctx.data::<AuthContext>()?;
		let conn = ctx.data::<CoreContext>()?.conn.as_ref();

		let first = user::Entity::find()
			.filter(user::Column::Id.eq(user.id.clone()))
			.one(conn)
			.await?
			.unwrap();

		Ok(User::from(first))
	}

	#[graphql(
		guard = "PermissionGuard::one(UserPermission::ReadUsers).or(ServerOwnerGuard)"
	)]
	async fn user_count(&self, ctx: &Context<'_>) -> Result<i64> {
		let conn = ctx.data::<CoreContext>()?.conn.as_ref();

		let count = user::Entity::find().count(conn).await?;

		Ok(count as i64)
	}

	#[graphql(
		guard = "PermissionGuard::one(UserPermission::ReadUsers).or(ServerOwnerGuard)"
	)]
	async fn top_readers(
		&self,
		ctx: &Context<'_>,
		take: Option<i64>,
	) -> Result<Vec<User>> {
		let conn = ctx.data::<CoreContext>()?.conn.as_ref();
		let limit = take.unwrap_or(10).max(1);

		let users_with_counts = user::Entity::find()
			.left_join(finished_reading_session::Entity)
			.column_as(
				finished_reading_session::Column::Id.count(),
				"session_count",
			)
			.group_by(user::Column::Id)
			.order_by_desc(Expr::col(Alias::new("session_count")))
			.limit(limit as u64)
			.all(conn)
			.await?;

		Ok(users_with_counts.into_iter().map(User::from).collect())
	}

	#[graphql(
		guard = "PermissionGuard::one(UserPermission::ReadUsers).or(ServerOwnerGuard)"
	)]
	async fn users(
		&self,
		ctx: &Context<'_>,
		#[graphql(default, validator(custom = "PaginationValidator"))]
		pagination: Pagination,
	) -> Result<PaginatedResponse<User>> {
		let conn = ctx.data::<CoreContext>()?.conn.as_ref();

		let query = user::Entity::find();

		match pagination.resolve() {
			Pagination::Cursor(info) => {
				let mut cursor = query.cursor_by(user::Column::Id);
				if let Some(ref id) = info.after {
					let user = user::Entity::find()
						.filter(user::Column::Id.eq(id))
						.one(conn)
						.await?
						.ok_or("Cursor not found")?;
					cursor.after(user.id.clone());
				}
				cursor.first(info.limit);

				let models = cursor.all(conn).await?;
				let current_cursor =
					info.after.or_else(|| models.first().map(|m| m.id.clone()));
				let next_cursor = match models.last().map(|m| m.id.clone()) {
					Some(id) if models.len() == info.limit as usize => Some(id),
					_ => None,
				};

				Ok(PaginatedResponse {
					nodes: models.into_iter().map(User::from).collect(),
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
					nodes: models.into_iter().map(User::from).collect(),
					page_info: OffsetPaginationInfo::new(info, count).into(),
				})
			},
			Pagination::None(_) => {
				let models = query.all(conn).await?;
				let count = models.len().try_into()?;

				Ok(PaginatedResponse {
					nodes: models.into_iter().map(User::from).collect(),
					page_info: OffsetPaginationInfo::unpaged(count).into(),
				})
			},
		}
	}

	#[graphql(
		guard = "SelfGuard::new(&id).or(PermissionGuard::one(UserPermission::ReadUsers)).or(ServerOwnerGuard)"
	)]
	async fn user_by_id(&self, ctx: &Context<'_>, id: ID) -> Result<User> {
		let conn = ctx.data::<CoreContext>()?.conn.as_ref();

		let first = user::Entity::find()
			.filter(user::Column::Id.eq(id.to_string()))
			.one(conn)
			.await?
			.unwrap();

		Ok(User::from(first))
	}

	#[graphql(guard = "ServerOwnerGuard")]
	async fn login_activity(&self, ctx: &Context<'_>) -> Result<Vec<UserLoginActivity>> {
		let conn = ctx.data::<CoreContext>()?.conn.as_ref();

		let activities = user_login_activity::Entity::find()
			.order_by_desc(user_login_activity::Column::Timestamp)
			.all(conn)
			.await?;

		Ok(activities
			.into_iter()
			.map(UserLoginActivity::from)
			.collect())
	}

	#[graphql(guard = "SelfGuard::new(&id).or(ServerOwnerGuard)")]
	async fn login_activity_by_id(
		&self,
		ctx: &Context<'_>,
		id: ID,
	) -> Result<Vec<UserLoginActivity>> {
		let conn = ctx.data::<CoreContext>()?.conn.as_ref();

		let activities = user_login_activity::Entity::find()
			.filter(user_login_activity::Column::UserId.eq(id.to_string()))
			.order_by_desc(user_login_activity::Column::Timestamp)
			.all(conn)
			.await?;

		Ok(activities
			.into_iter()
			.map(UserLoginActivity::from)
			.collect())
	}
}

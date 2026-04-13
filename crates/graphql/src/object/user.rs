use async_graphql::{ComplexObject, Context, Result, SimpleObject};

use chrono::{DateTime, FixedOffset, Utc};
use models::{
	entity::{
		age_restriction, finished_reading_session, session, user, user_login_activity,
		user_preferences,
	},
	shared::{enums::UserPermission, permission_set::PermissionSet},
};
use sea_orm::{prelude::*, ActiveValue, QueryOrder};

use crate::{
	data::{CoreContext, ServiceContext},
	guard::{PermissionGuard, SelfGuard, ServerOwnerGuard},
	pagination::{PaginatedResponse, Pagination, PaginationValidator},
	query::media::MediaQuery,
};

use super::{media::Media, user_preferences::UserPreferences};

#[derive(Debug, SimpleObject)]
#[graphql(complex)]
pub struct User {
	#[graphql(flatten)]
	pub model: user::Model,
}

impl From<user::Model> for User {
	fn from(entity: user::Model) -> Self {
		Self { model: entity }
	}
}

#[ComplexObject]
impl User {
	async fn avatar_url(&self, ctx: &Context<'_>) -> Result<Option<String>> {
		let service = ctx.data::<ServiceContext>()?;

		if self.model.avatar_path.is_none() {
			return Ok(None);
		}

		Ok(Some(service.format_url(format!(
			"/api/v2/users/{}/avatar",
			self.model.id
		))))
	}

	#[graphql(
		guard = "SelfGuard::new(&self.model.id).or(PermissionGuard::one(UserPermission::ManageUsers)).or(ServerOwnerGuard)"
	)]
	async fn age_restriction(
		&self,
		ctx: &Context<'_>,
	) -> Result<Option<age_restriction::Model>> {
		let conn = ctx.data::<CoreContext>()?.conn.as_ref();

		let age_restriction = age_restriction::Entity::find()
			.filter(age_restriction::Column::UserId.eq(&self.model.id))
			.one(conn)
			.await?;

		Ok(age_restriction)
	}

	#[graphql(guard = "SelfGuard::new(&self.model.id).or(ServerOwnerGuard)")]
	async fn continue_reading(
		&self,
		ctx: &Context<'_>,
		#[graphql(default, validator(custom = "PaginationValidator"))]
		pagination: Pagination,
	) -> Result<PaginatedResponse<Media>> {
		MediaQuery.keep_reading(ctx, pagination).await
	}

	#[graphql(
		guard = "SelfGuard::new(&self.model.id).or(PermissionGuard::one(UserPermission::ManageUsers))"
	)]
	async fn permissions(&self) -> Vec<UserPermission> {
		PermissionSet::from(self.model.permissions.clone().unwrap_or_default())
			.resolve_into_vec()
	}

	#[graphql(guard = "SelfGuard::new(&self.model.id).or(ServerOwnerGuard)")]
	async fn preferences(&self, ctx: &Context<'_>) -> Result<UserPreferences> {
		let conn = ctx.data::<CoreContext>()?.conn.as_ref();

		let preferences = match user_preferences::Entity::find()
			.filter(user_preferences::Column::UserId.eq(&self.model.id))
			.one(conn)
			.await?
		{
			Some(prefs) => prefs,
			None => {
				// this is a bit of an edge case, originally cropping up after an oidc account migration where the cli command
				// did not remap the preferences back to the user. this manifested in an error after login, effectively bricking the
				// account. obv not ideal, so while i don't expect this to be common id rather just recreate in this scenario and
				// let the user reconfig their preferences. worst case is a dangling preferences record
				// see https://discord.com/channels/972593831172272148/1490415985524609264/1491118111401705494
				tracing::warn!(
					user = self.model.username,
					"Failed to load preferences for user. Recreating with defaults..."
				);
				let new_preferences = user_preferences::ActiveModel {
					user_id: ActiveValue::Set(Some(self.model.id.clone())),
					..Default::default()
				}
				.insert(conn)
				.await?;

				new_preferences
			},
		};

		Ok(preferences.into())
	}

	// TODO: loader for this
	#[graphql(
		guard = "SelfGuard::new(&self.model.id).or(PermissionGuard::one(UserPermission::ReadUsers))"
	)]
	async fn last_login(
		&self,
		ctx: &Context<'_>,
	) -> Result<Option<DateTime<FixedOffset>>> {
		let conn = ctx.data::<CoreContext>()?.conn.as_ref();

		let record = user_login_activity::Entity::find()
			.filter(user_login_activity::Column::UserId.eq(&self.model.id))
			.order_by_desc(user_login_activity::Column::Timestamp)
			.one(conn)
			.await?;

		Ok(record.map(|r| r.timestamp))
	}

	#[graphql(
		guard = "SelfGuard::new(&self.model.id).or(PermissionGuard::one(UserPermission::ReadUsers))"
	)]
	async fn login_sessions_count(&self, ctx: &Context<'_>) -> Result<i64> {
		let conn = ctx.data::<CoreContext>()?.conn.as_ref();

		let count = session::Entity::find()
			.filter(session::Column::UserId.eq(&self.model.id).and(
				session::Column::ExpiryTime.gt(DateTimeWithTimeZone::from(Utc::now())),
			))
			.count(conn)
			.await?;

		Ok(count.try_into()?)
	}

	#[graphql(
		guard = "SelfGuard::new(&self.model.id).or(PermissionGuard::one(UserPermission::ReadUsers))"
	)]
	async fn finished_reading_sessions_count(&self, ctx: &Context<'_>) -> Result<i64> {
		let conn = ctx.data::<CoreContext>()?.conn.as_ref();

		let count = finished_reading_session::Entity::find()
			.filter(finished_reading_session::Column::UserId.eq(&self.model.id))
			.count(conn)
			.await?;

		Ok(count.try_into()?)
	}
}

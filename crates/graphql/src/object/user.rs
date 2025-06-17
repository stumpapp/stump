use async_graphql::{ComplexObject, Context, Result, SimpleObject};

use models::{
	entity::{age_restriction, user, user_preferences},
	shared::{enums::UserPermission, permission_set::PermissionSet},
};
use sea_orm::prelude::*;

use crate::{
	data::CoreContext,
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
	#[graphql(guard = "SelfGuard::new(&self.model.id).or(ServerOwnerGuard)")]
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

		let preferences = user_preferences::Entity::find()
			.filter(user_preferences::Column::UserId.eq(&self.model.id))
			.one(conn)
			.await?
			.ok_or("User preferences not found")?;

		Ok(preferences.into())
	}
}

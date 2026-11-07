use async_graphql::{Context, Object, Result};
use models::{entity::notifier, shared::enums::UserPermission};
use sea_orm::prelude::*;

use crate::{
	data::CoreContext,
	guard::{PermissionGuard, UnreleasedFeatureGuard},
	object::notifier::Notifier,
};

// TODO(notifier): rm the unreleased guard once i _actually_ build it out

#[derive(Default)]
pub struct NotifierQuery;

#[Object]
impl NotifierQuery {
	#[graphql(
		guard = "UnreleasedFeatureGuard.and(PermissionGuard::one(UserPermission::ReadNotifier))"
	)]
	async fn get_notifiers(&self, ctx: &Context<'_>) -> Result<Vec<Notifier>> {
		let conn = ctx.data::<CoreContext>()?.conn.as_ref();

		let notifiers = notifier::Entity::find()
			.into_model::<notifier::Model>()
			.all(conn)
			.await?;

		Ok(notifiers.into_iter().map(Notifier::from).collect())
	}

	#[graphql(
		guard = "UnreleasedFeatureGuard.and(PermissionGuard::one(UserPermission::ReadNotifier))"
	)]
	async fn get_notifier_by_id(&self, ctx: &Context<'_>, id: i32) -> Result<Notifier> {
		let conn = ctx.data::<CoreContext>()?.conn.as_ref();

		let notifier = notifier::Entity::find()
			.filter(notifier::Column::Id.eq(id))
			.into_model::<notifier::Model>()
			.one(conn)
			.await?
			.ok_or("Notifier not found")?;

		Ok(Notifier::from(notifier))
	}
}

use crate::{
	data::{AuthContext, CoreContext},
	guard::PermissionGuard,
	input::smart_lists::SaveSmartListInput,
	object::smart_lists::SmartList,
};
use async_graphql::{Context, Object, Result, ID};
use models::{entity::smart_list, shared::enums::UserPermission};
use sea_orm::{prelude::*, Set, TransactionTrait};

#[derive(Default)]
pub struct SmartListMutation;

#[Object]
impl SmartListMutation {
	#[graphql(guard = "PermissionGuard::one(UserPermission::AccessSmartList)")]
	async fn create_smart_list(
		&self,
		ctx: &Context<'_>,
		input: SaveSmartListInput,
	) -> Result<SmartList> {
		let user_id = ctx.data::<AuthContext>()?.id();
		let conn = ctx.data::<CoreContext>()?.conn.as_ref();

		let active_model = input.into_active_model(&user_id)?;
		let inserted_smart_list = smart_list::Entity::insert(active_model)
			.exec_with_returning(conn)
			.await?;

		Ok(SmartList::from(inserted_smart_list))
	}

	#[graphql(guard = "PermissionGuard::one(UserPermission::AccessSmartList)")]
	async fn update_smart_list(
		&self,
		ctx: &Context<'_>,
		id: ID,
		input: SaveSmartListInput,
	) -> Result<SmartList> {
		let AuthContext { user, .. } = ctx.data::<AuthContext>()?;
		let conn = ctx.data::<CoreContext>()?.conn.as_ref();
		let txn = conn.begin().await?;

		let _ = smart_list::Entity::find_by_id(user, id.clone())
			.one(&txn)
			.await?
			.ok_or("Smart list not found".to_string())?;

		let mut active_model = input.into_active_model(&user.id)?;
		active_model.id = Set(id.to_string());
		let updated = active_model.update(&txn).await?;
		txn.commit().await?;

		Ok(updated.into())
	}

	#[graphql(guard = "PermissionGuard::one(UserPermission::AccessSmartList)")]
	async fn delete_smart_list(&self, ctx: &Context<'_>, id: ID) -> Result<SmartList> {
		let AuthContext { user, .. } = ctx.data::<AuthContext>()?;
		let conn = ctx.data::<CoreContext>()?.conn.as_ref();
		let txn = conn.begin().await?;

		let smart_list = smart_list::Entity::find_by_id(user, id.clone())
			.one(&txn)
			.await?
			.ok_or("Smart list not found".to_string())?;

		smart_list.clone().delete(&txn).await?;
		txn.commit().await?;

		Ok(SmartList::from(smart_list))
	}
}

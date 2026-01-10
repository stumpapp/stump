use crate::{
	data::{AuthContext, CoreContext},
	guard::PermissionGuard,
	input::smart_list_view::SaveSmartListView,
	object::smart_list_view::SmartListView,
};
use async_graphql::{Context, Object, Result, ID};
use models::{
	entity::{smart_list, smart_list_view},
	shared::enums::UserPermission,
};
use sea_orm::{prelude::*, ActiveModelTrait, Set, TransactionTrait};

#[derive(Default)]
pub struct SmartListViewMutation;

#[Object]
impl SmartListViewMutation {
	#[graphql(guard = "PermissionGuard::one(UserPermission::AccessSmartList)")]
	async fn create_smart_list_view(
		&self,
		ctx: &Context<'_>,
		input: SaveSmartListView,
	) -> Result<SmartListView> {
		let AuthContext { user, .. } = ctx.data::<AuthContext>()?;
		let conn = ctx.data::<CoreContext>()?.conn.as_ref();
		let txn = conn.begin().await?;

		// Ensure the user has access to the smart list
		let _ = smart_list::Entity::find_by_id(user, input.list_id.clone())
			.one(&txn)
			.await?
			.ok_or("Smart list not found".to_string())?;

		let active_model = input.into_active_model()?;
		let inserted_smart_list_view = smart_list_view::Entity::insert(active_model)
			.exec_with_returning(&txn)
			.await?;

		txn.commit().await?;

		SmartListView::try_from(inserted_smart_list_view)
	}

	#[graphql(guard = "PermissionGuard::one(UserPermission::AccessSmartList)")]
	async fn update_smart_list_view(
		&self,
		ctx: &Context<'_>,
		original_name: String,
		input: SaveSmartListView,
	) -> Result<SmartListView> {
		let AuthContext { user, .. } = ctx.data::<AuthContext>()?;
		let conn = ctx.data::<CoreContext>()?.conn.as_ref();
		let txn = conn.begin().await?;

		let smart_list_view = smart_list_view::Entity::find_by_user_list_id_name(
			user,
			&input.list_id,
			&original_name,
		)
		.one(&txn)
		.await?
		.ok_or("Smart list view not found".to_string())?;

		let mut active_model: smart_list_view::ActiveModel = smart_list_view.into();
		let value = serde_json::to_vec(&input.config)
			.map_err(|_| "Failed to serialize view".to_string())?;
		active_model.data = Set(value);
		let updated = active_model.update(&txn).await?;
		txn.commit().await?;

		SmartListView::try_from(updated)
	}

	#[graphql(guard = "PermissionGuard::one(UserPermission::AccessSmartList)")]
	async fn delete_smart_list_view(
		&self,
		ctx: &Context<'_>,
		id: ID,
		name: String,
	) -> Result<SmartListView> {
		let AuthContext { user, .. } = ctx.data::<AuthContext>()?;
		let conn = ctx.data::<CoreContext>()?.conn.as_ref();
		let txn = conn.begin().await?;

		let smart_list_view =
			smart_list_view::Entity::find_by_user_list_id_name(user, &id, &name)
				.one(&txn)
				.await?
				.ok_or("Smart list view not found".to_string())?;

		smart_list_view.clone().delete(&txn).await?;
		txn.commit().await?;

		SmartListView::try_from(smart_list_view)
	}
}

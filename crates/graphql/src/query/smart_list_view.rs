use crate::{
	data::{AuthContext, CoreContext},
	guard::PermissionGuard,
	object::smart_list_view::SmartListView,
};
use async_graphql::{Context, Object, Result};
use models::{entity::smart_list_view, shared::enums::UserPermission};

#[derive(Default, Clone, Copy)]
pub struct SmartListViewQuery;

#[Object]
impl SmartListViewQuery {
	#[graphql(guard = "PermissionGuard::one(UserPermission::AccessSmartList)")]
	async fn smart_list_views(self, ctx: &Context<'_>) -> Result<Vec<SmartListView>> {
		let AuthContext { user, .. } = ctx.data::<AuthContext>()?;
		let conn = ctx.data::<CoreContext>()?.conn.as_ref();

		let smart_list_views = smart_list_view::Entity::find_by_user(user)
			.all(conn)
			.await?;

		smart_list_views
			.into_iter()
			.map(SmartListView::try_from)
			.collect::<Result<Vec<_>, _>>()
	}
}

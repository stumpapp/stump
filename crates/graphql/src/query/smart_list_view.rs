use crate::{
	data::{CoreContext, RequestContext},
	filter::IntoFilter,
	guard::PermissionGuard,
	input::smart_lists::{SmartListFilterInput, SmartListsInput},
	object::{
		media::Media,
		smart_list_item::{
			SmartListGrouped, SmartListGroupedItem, SmartListItemEntity, SmartListItems,
			SmartListUngrouped,
		},
		smart_list_view::SmartListView,
		smart_lists::SmartList,
	},
	query::media::{add_sessions_join_for_filter, should_add_sessions_join_for_filter},
};
use async_graphql::{Context, Object, Result, SimpleObject, ID};
use models::{
	entity::{
		library, media, series,
		smart_list::{self, SmartListGrouping},
		smart_list_view,
		user::AuthUser,
	},
	shared::enums::UserPermission,
};
use sea_orm::{
	prelude::*, Condition, DatabaseTransaction, QuerySelect, Select, TransactionTrait,
};
use std::collections::{HashMap, HashSet};

#[derive(Default, Clone, Copy)]
pub struct SmartListViewQuery;

#[Object]
impl SmartListViewQuery {
	#[graphql(guard = "PermissionGuard::one(UserPermission::AccessSmartList)")]
	async fn smart_list_views(self, ctx: &Context<'_>) -> Result<Vec<SmartListView>> {
		let RequestContext { user, .. } = ctx.data::<RequestContext>()?;
		let conn = ctx.data::<CoreContext>()?.conn.as_ref();

		let smart_list_views = smart_list_view::Entity::find_by_user(user)
			.all(conn)
			.await?;

		Ok(smart_list_views
			.into_iter()
			.map(SmartListView::from)
			.collect())
	}
}

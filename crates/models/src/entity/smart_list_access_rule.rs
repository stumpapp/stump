use async_graphql::SimpleObject;
use sea_orm::entity::prelude::*;

use super::{smart_list, user};
use crate::shared::enums::AccessRole;

#[sea_orm::model]
#[derive(Clone, Debug, PartialEq, DeriveEntityModel, Eq, SimpleObject)]
#[graphql(name = "SmartListAccessRuleModel")]
#[sea_orm(table_name = "smart_list_access_rules")]
pub struct Model {
	#[sea_orm(primary_key)]
	pub id: i32,
	pub role: AccessRole,
	#[sea_orm(column_type = "Text")]
	pub user_id: String,
	#[sea_orm(column_type = "Text")]
	pub smart_list_id: String,
	#[sea_orm(
		belongs_to,
		from = "smart_list_id",
		to = "id",
		on_update = "Cascade",
		on_delete = "Cascade"
	)]
	#[graphql(skip)]
	pub smart_list: BelongsTo<smart_list::Entity>,
	#[sea_orm(
		belongs_to,
		from = "user_id",
		to = "id",
		on_update = "Cascade",
		on_delete = "Cascade"
	)]
	#[graphql(skip)]
	pub user: BelongsTo<user::Entity>,
}

impl ActiveModelBehavior for ActiveModel {}

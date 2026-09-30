use async_graphql::SimpleObject;
use sea_orm::entity::prelude::*;

use crate::shared::enums::AccessRole;

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
}

#[derive(Copy, Clone, Debug, EnumIter, DeriveRelation)]
pub enum Relation {
	#[sea_orm(
		belongs_to = "super::smart_list::Entity",
		from = "Column::SmartListId",
		to = "super::smart_list::Column::Id",
		on_update = "Cascade",
		on_delete = "Cascade"
	)]
	SmartList,
	#[sea_orm(
		belongs_to = "super::user::Entity",
		from = "Column::UserId",
		to = "super::user::Column::Id",
		on_update = "Cascade",
		on_delete = "Cascade"
	)]
	User,
}

impl Related<super::smart_list::Entity> for Entity {
	fn to() -> RelationDef {
		Relation::SmartList.def()
	}
}

impl Related<super::user::Entity> for Entity {
	fn to() -> RelationDef {
		Relation::User.def()
	}
}

impl ActiveModelBehavior for ActiveModel {}

use async_graphql::SimpleObject;
use sea_orm::entity::prelude::*;
use serde::{Deserialize, Serialize};

#[derive(
	Clone, Debug, PartialEq, DeriveEntityModel, Eq, SimpleObject, Serialize, Deserialize,
)]
#[serde(rename_all = "camelCase")]
#[graphql(name = "AgeRestriction")]
#[sea_orm(table_name = "age_restrictions")]
pub struct Model {
	#[sea_orm(primary_key)]
	pub id: i32,
	pub age: i32,
	pub restrict_on_unset: bool,
	#[sea_orm(column_type = "Text", unique)]
	pub user_id: String,
}

#[derive(Copy, Clone, Debug, EnumIter, DeriveRelation)]
pub enum Relation {
	#[sea_orm(
		belongs_to = "super::user::Entity",
		from = "Column::UserId",
		to = "super::user::Column::Id",
		on_update = "Cascade",
		on_delete = "Cascade"
	)]
	User,
}

impl Related<super::user::Entity> for Entity {
	fn to() -> RelationDef {
		Relation::User.def()
	}
}

impl ActiveModelBehavior for ActiveModel {}

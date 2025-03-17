use sea_orm::entity::prelude::*;

#[derive(Clone, Debug, PartialEq, DeriveEntityModel, Eq)]
#[sea_orm(table_name = "smart_lists")]
pub struct Model {
	#[sea_orm(primary_key, auto_increment = false, column_type = "Text")]
	pub id: String,
	#[sea_orm(column_type = "Text")]
	pub name: String,
	#[sea_orm(column_type = "Text", nullable)]
	pub description: Option<String>,
	#[sea_orm(column_type = "Blob")]
	pub filters: Vec<u8>,
	#[sea_orm(column_type = "Text")]
	pub joiner: String,
	#[sea_orm(column_type = "Text")]
	pub default_grouping: String,
	#[sea_orm(column_type = "Text")]
	pub visibility: String,
	#[sea_orm(column_type = "Text")]
	pub creator_id: String,
}

#[derive(Copy, Clone, Debug, EnumIter, DeriveRelation)]
pub enum Relation {
	#[sea_orm(has_many = "super::smart_list_access_rule::Entity")]
	SmartListAccessRule,
	#[sea_orm(has_many = "super::smart_list_view::Entity")]
	SmartListView,
	#[sea_orm(
		belongs_to = "super::user::Entity",
		from = "Column::CreatorId",
		to = "super::user::Column::Id",
		on_update = "Cascade",
		on_delete = "Cascade"
	)]
	User,
}

impl Related<super::smart_list_access_rule::Entity> for Entity {
	fn to() -> RelationDef {
		Relation::SmartListAccessRule.def()
	}
}

impl Related<super::smart_list_view::Entity> for Entity {
	fn to() -> RelationDef {
		Relation::SmartListView.def()
	}
}

impl Related<super::user::Entity> for Entity {
	fn to() -> RelationDef {
		Relation::User.def()
	}
}

impl ActiveModelBehavior for ActiveModel {}

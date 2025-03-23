use sea_orm::entity::prelude::*;

#[derive(Clone, Debug, PartialEq, DeriveEntityModel, Eq)]
#[sea_orm(table_name = "smart_list_views")]
pub struct Model {
	#[sea_orm(primary_key)]
	pub id: i32,
	#[sea_orm(column_type = "Text")]
	pub name: String,
	#[sea_orm(column_type = "Text")]
	pub list_id: String,
	#[sea_orm(column_type = "Blob")]
	pub data: Vec<u8>,
}

#[derive(Copy, Clone, Debug, EnumIter, DeriveRelation)]
pub enum Relation {
	#[sea_orm(
		belongs_to = "super::smart_list::Entity",
		from = "Column::ListId",
		to = "super::smart_list::Column::Id",
		on_update = "Cascade",
		on_delete = "Cascade"
	)]
	SmartList,
}

impl Related<super::smart_list::Entity> for Entity {
	fn to() -> RelationDef {
		Relation::SmartList.def()
	}
}

impl ActiveModelBehavior for ActiveModel {}

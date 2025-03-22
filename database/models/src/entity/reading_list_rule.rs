use sea_orm::entity::prelude::*;

#[derive(Clone, Debug, PartialEq, DeriveEntityModel, Eq)]
#[sea_orm(table_name = "reading_list_rules")]
pub struct Model {
	#[sea_orm(primary_key)]
	pub id: i32,
	pub role: i32,
	#[sea_orm(column_type = "Text")]
	pub user_id: String,
	#[sea_orm(column_type = "Text")]
	pub reading_list_id: String,
}

#[derive(Copy, Clone, Debug, EnumIter, DeriveRelation)]
pub enum Relation {
	#[sea_orm(
		belongs_to = "super::reading_list::Entity",
		from = "Column::ReadingListId",
		to = "super::reading_list::Column::Id",
		on_update = "Cascade",
		on_delete = "Restrict"
	)]
	ReadingList,
}

impl Related<super::reading_list::Entity> for Entity {
	fn to() -> RelationDef {
		Relation::ReadingList.def()
	}
}

impl ActiveModelBehavior for ActiveModel {}

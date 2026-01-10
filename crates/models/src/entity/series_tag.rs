use sea_orm::entity::prelude::*;

#[derive(Clone, Debug, PartialEq, DeriveEntityModel, Eq)]
#[sea_orm(table_name = "series_tags")]
pub struct Model {
	#[sea_orm(primary_key)]
	pub id: i32,
	#[sea_orm(column_type = "Text")]
	pub series_id: String,
	pub tag_id: i32,
}

#[derive(Copy, Clone, Debug, EnumIter, DeriveRelation)]
pub enum Relation {
	#[sea_orm(
		belongs_to = "super::series::Entity",
		from = "Column::SeriesId",
		to = "super::series::Column::Id",
		on_update = "Cascade",
		on_delete = "Cascade"
	)]
	Series,
	#[sea_orm(
		belongs_to = "super::tag::Entity",
		from = "Column::TagId",
		to = "super::tag::Column::Id",
		on_update = "Cascade",
		on_delete = "Cascade"
	)]
	Tag,
}

impl Related<super::series::Entity> for Entity {
	fn to() -> RelationDef {
		Relation::Series.def()
	}
}

impl Related<super::tag::Entity> for Entity {
	fn to() -> RelationDef {
		Relation::Tag.def()
	}
}

impl ActiveModelBehavior for ActiveModel {}

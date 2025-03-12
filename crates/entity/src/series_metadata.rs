

use sea_orm::entity::prelude::*;

#[derive(Clone, Debug, PartialEq, DeriveEntityModel, Eq)]
#[sea_orm(table_name = "series_metadata")]
pub struct Model {
	#[sea_orm(column_type = "Text")]
	pub meta_type: String,
	#[sea_orm(column_type = "Text", nullable)]
	pub title: Option<String>,
	#[sea_orm(column_type = "Text", nullable)]
	pub summary: Option<String>,
	#[sea_orm(column_type = "Text", nullable)]
	pub publisher: Option<String>,
	#[sea_orm(column_type = "Text", nullable)]
	pub imprint: Option<String>,
	pub comicid: Option<i32>,
	pub volume: Option<i32>,
	#[sea_orm(column_type = "Text", nullable)]
	pub booktype: Option<String>,
	pub age_rating: Option<i32>,
	#[sea_orm(column_type = "Text", nullable)]
	pub status: Option<String>,
	#[sea_orm(primary_key, auto_increment = false, column_type = "Text")]
	pub series_id: String,
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
}

impl Related<super::series::Entity> for Entity {
	fn to() -> RelationDef {
		Relation::Series.def()
	}
}

impl ActiveModelBehavior for ActiveModel {}

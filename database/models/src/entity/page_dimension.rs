use sea_orm::entity::prelude::*;

use crate::shared::page_dimension::PageAnalysis;

#[derive(Clone, Debug, PartialEq, DeriveEntityModel, Eq)]
#[sea_orm(table_name = "page_dimensions")]
pub struct Model {
	#[sea_orm(primary_key, auto_increment = false, column_type = "Text")]
	pub id: String,
	#[sea_orm(column_type = "Text")]
	pub dimensions: PageAnalysis,
	#[sea_orm(column_type = "Text", unique)]
	pub metadata_id: String,
}

#[derive(Copy, Clone, Debug, EnumIter, DeriveRelation)]
pub enum Relation {
	#[sea_orm(
		belongs_to = "super::media_metadata::Entity",
		from = "Column::MetadataId",
		to = "super::media_metadata::Column::Id",
		on_update = "Cascade",
		on_delete = "Cascade"
	)]
	MediaMetadata,
}

impl Related<super::media_metadata::Entity> for Entity {
	fn to() -> RelationDef {
		Relation::MediaMetadata.def()
	}
}

impl ActiveModelBehavior for ActiveModel {}

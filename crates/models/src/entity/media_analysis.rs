use sea_orm::entity::prelude::*;

use crate::shared::analysis::MediaAnalysisData;

use super::media;

#[sea_orm::model]
#[derive(Clone, Debug, PartialEq, DeriveEntityModel, Eq)]
#[sea_orm(table_name = "media_analysis")]
pub struct Model {
	#[sea_orm(primary_key, auto_increment = true)]
	pub id: i32,

	#[sea_orm(column_type = "Json")]
	pub data: MediaAnalysisData,

	#[sea_orm(unique, column_type = "Text")]
	pub media_id: String,

	#[sea_orm(
		belongs_to,
		from = "media_id",
		to = "id",
		on_update = "Cascade",
		on_delete = "Cascade"
	)]
	pub media: BelongsTo<media::Entity>,
}

impl ActiveModelBehavior for ActiveModel {}

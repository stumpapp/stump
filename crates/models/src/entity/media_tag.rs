use sea_orm::entity::prelude::*;

use super::{media, tag};

#[sea_orm::model]
#[derive(Clone, Debug, PartialEq, DeriveEntityModel, Eq)]
#[sea_orm(table_name = "media_tags")]
pub struct Model {
	#[sea_orm(primary_key)]
	pub id: i32,
	#[sea_orm(column_type = "Text")]
	pub media_id: String,
	pub tag_id: i32,
	#[sea_orm(
		belongs_to,
		from = "media_id",
		to = "id",
		on_update = "Cascade",
		on_delete = "Cascade"
	)]
	pub media: BelongsTo<media::Entity>,
	#[sea_orm(
		belongs_to,
		from = "tag_id",
		to = "id",
		on_update = "Cascade",
		on_delete = "Cascade"
	)]
	pub tag: BelongsTo<tag::Entity>,
}

impl ActiveModelBehavior for ActiveModel {}

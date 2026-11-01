use sea_orm::entity::prelude::*;

use super::{library, tag};

#[sea_orm::model]
#[derive(Clone, Debug, PartialEq, DeriveEntityModel, Eq)]
#[sea_orm(table_name = "library_tags")]
pub struct Model {
	#[sea_orm(primary_key)]
	pub id: i32,
	#[sea_orm(column_type = "Text")]
	pub library_id: String,
	pub tag_id: i32,
	#[sea_orm(
		belongs_to,
		from = "library_id",
		to = "id",
		on_update = "Cascade",
		on_delete = "Cascade"
	)]
	pub library: BelongsTo<library::Entity>,
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

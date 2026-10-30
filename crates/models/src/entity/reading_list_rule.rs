use sea_orm::entity::prelude::*;

use super::reading_list;

#[sea_orm::model]
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
	#[sea_orm(
		belongs_to,
		from = "reading_list_id",
		to = "id",
		on_update = "Cascade",
		on_delete = "Restrict"
	)]
	pub reading_list: BelongsTo<reading_list::Entity>,
}

impl ActiveModelBehavior for ActiveModel {}

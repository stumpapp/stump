use async_graphql::SimpleObject;
use sea_orm::entity::prelude::*;

use super::{media, reading_list};

#[sea_orm::model]
#[derive(Clone, Debug, PartialEq, DeriveEntityModel, Eq, SimpleObject)]
#[graphql(name = "ReadingListItemModel")]
#[sea_orm(table_name = "reading_list_items")]
pub struct Model {
	#[sea_orm(primary_key)]
	pub id: i32,
	pub display_order: i32,
	#[sea_orm(column_type = "Text")]
	pub media_id: String,
	#[sea_orm(column_type = "Text")]
	pub reading_list_id: String,
	#[sea_orm(
		belongs_to,
		from = "media_id",
		to = "id",
		on_update = "Cascade",
		on_delete = "Restrict"
	)]
	#[graphql(skip)]
	pub media: BelongsTo<media::Entity>,
	#[sea_orm(
		belongs_to,
		from = "reading_list_id",
		to = "id",
		on_update = "Cascade",
		on_delete = "Restrict"
	)]
	#[graphql(skip)]
	pub reading_list: BelongsTo<reading_list::Entity>,
}

impl ActiveModelBehavior for ActiveModel {}

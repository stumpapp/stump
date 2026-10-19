use sea_orm::entity::prelude::*;

use super::{book_club_member, media};

#[sea_orm::model]
#[derive(Clone, Debug, PartialEq, DeriveEntityModel, Eq)]
#[sea_orm(table_name = "book_club_member_favorite_books")]
pub struct Model {
	#[sea_orm(primary_key, auto_increment = false, column_type = "Text")]
	pub id: String,
	#[sea_orm(column_type = "Text", nullable)]
	pub title: Option<String>,
	#[sea_orm(column_type = "Text", nullable)]
	pub author: Option<String>,
	#[sea_orm(column_type = "Text", nullable)]
	pub url: Option<String>,
	#[sea_orm(column_type = "Text", nullable)]
	pub notes: Option<String>,
	#[sea_orm(column_type = "Text", unique)]
	pub member_id: String,
	#[sea_orm(column_type = "Text", nullable)]
	pub book_id: Option<String>,
	#[sea_orm(column_type = "Text", nullable)]
	pub image_url: Option<String>,
	#[sea_orm(
		belongs_to,
		from = "member_id",
		to = "id",
		on_update = "Cascade",
		on_delete = "Cascade"
	)]
	pub member: BelongsTo<book_club_member::Entity>,
	#[sea_orm(
		belongs_to,
		from = "book_id",
		to = "id",
		on_update = "Cascade",
		on_delete = "Cascade"
	)]
	pub book: BelongsTo<Option<media::Entity>>,
}

impl ActiveModelBehavior for ActiveModel {}

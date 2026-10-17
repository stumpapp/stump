use sea_orm::entity::prelude::*;

use super::{book_club_book_suggestion, book_club_member};

#[sea_orm::model]
#[derive(Clone, Debug, PartialEq, DeriveEntityModel, Eq)]
#[sea_orm(table_name = "book_club_book_suggestion_likes")]
pub struct Model {
	#[sea_orm(primary_key)]
	pub id: i32,
	#[sea_orm(column_type = "custom(\"DATETIME\")")]
	pub timestamp: DateTimeWithTimeZone,
	#[sea_orm(column_type = "Text")]
	pub liked_by_id: String,
	#[sea_orm(column_type = "Text")]
	pub suggestion_id: String,
	#[sea_orm(
		belongs_to,
		from = "suggestion_id",
		to = "id",
		on_update = "Cascade",
		on_delete = "Cascade"
	)]
	pub suggestion: BelongsTo<book_club_book_suggestion::Entity>,
	#[sea_orm(
		belongs_to,
		from = "liked_by_id",
		to = "id",
		on_update = "Cascade",
		on_delete = "Cascade"
	)]
	pub liked_by: BelongsTo<book_club_member::Entity>,
}

impl ActiveModelBehavior for ActiveModel {}

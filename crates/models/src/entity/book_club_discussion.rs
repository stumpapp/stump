use sea_orm::entity::prelude::*;

#[derive(Clone, Debug, PartialEq, DeriveEntityModel, Eq)]
#[sea_orm(table_name = "book_club_discussions")]
pub struct Model {
	#[sea_orm(primary_key, auto_increment = false, column_type = "Text")]
	pub id: String,
	pub is_locked: bool,
	#[sea_orm(column_type = "Text", unique)]
	pub book_club_book_id: String,
}

#[derive(Copy, Clone, Debug, EnumIter, DeriveRelation)]
pub enum Relation {
	#[sea_orm(
		belongs_to = "super::book_club_book::Entity",
		from = "Column::BookClubBookId",
		to = "super::book_club_book::Column::Id",
		on_update = "Cascade",
		on_delete = "Cascade"
	)]
	BookClubBook,
	#[sea_orm(has_many = "super::book_club_discussion_message::Entity")]
	BookClubDiscussionMessage,
}

impl Related<super::book_club_book::Entity> for Entity {
	fn to() -> RelationDef {
		Relation::BookClubBook.def()
	}
}

impl Related<super::book_club_discussion_message::Entity> for Entity {
	fn to() -> RelationDef {
		Relation::BookClubDiscussionMessage.def()
	}
}

impl ActiveModelBehavior for ActiveModel {}

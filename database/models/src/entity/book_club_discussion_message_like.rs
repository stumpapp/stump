use sea_orm::entity::prelude::*;

#[derive(Clone, Debug, PartialEq, DeriveEntityModel, Eq)]
#[sea_orm(table_name = "book_club_discussion_message_likes")]
pub struct Model {
	#[sea_orm(primary_key, auto_increment = false, column_type = "Text")]
	pub id: String,
	#[sea_orm(column_type = "custom(\"DATETIME\")")]
	pub timestamp: DateTimeWithTimeZone,
	#[sea_orm(column_type = "Text")]
	pub liked_by_id: String,
	#[sea_orm(column_type = "Text")]
	pub message_id: String,
}

#[derive(Copy, Clone, Debug, EnumIter, DeriveRelation)]
pub enum Relation {
	#[sea_orm(
		belongs_to = "super::book_club_discussion_message::Entity",
		from = "Column::MessageId",
		to = "super::book_club_discussion_message::Column::Id",
		on_update = "Cascade",
		on_delete = "Cascade"
	)]
	BookClubDiscussionMessage,
	#[sea_orm(
		belongs_to = "super::book_club_member::Entity",
		from = "Column::LikedById",
		to = "super::book_club_member::Column::Id",
		on_update = "Cascade",
		on_delete = "Cascade"
	)]
	BookClubMember,
}

impl Related<super::book_club_discussion_message::Entity> for Entity {
	fn to() -> RelationDef {
		Relation::BookClubDiscussionMessage.def()
	}
}

impl Related<super::book_club_member::Entity> for Entity {
	fn to() -> RelationDef {
		Relation::BookClubMember.def()
	}
}

impl ActiveModelBehavior for ActiveModel {}

use sea_orm::entity::prelude::*;

#[derive(Clone, Debug, PartialEq, DeriveEntityModel, Eq)]
#[sea_orm(table_name = "book_club_discussion_message")]
pub struct Model {
	#[sea_orm(primary_key, auto_increment = false, column_type = "Text")]
	pub id: String,
	#[sea_orm(column_type = "Text")]
	pub content: String,
	#[sea_orm(column_type = "custom(\"DATETIME\")")]
	pub timestamp: DateTimeWithTimeZone,
	pub is_top_message: bool,
	#[sea_orm(column_type = "custom(\"DATETIME\")", nullable)]
	pub deleted_at: Option<String>,
	#[sea_orm(column_type = "Text", nullable)]
	pub parent_message_id: Option<String>,
	#[sea_orm(column_type = "Text")]
	pub discussion_id: String,
	#[sea_orm(column_type = "Text", nullable)]
	pub member_id: Option<String>,
}

#[derive(Copy, Clone, Debug, EnumIter, DeriveRelation)]
pub enum Relation {
	#[sea_orm(has_many = "super::book_club_discussion_message_like::Entity")]
	BookClubDiscussionMessageLike,
	#[sea_orm(
		belongs_to = "Entity",
		from = "Column::ParentMessageId",
		to = "Column::Id",
		on_update = "Cascade",
		on_delete = "SetNull"
	)]
	SelfRef,
	#[sea_orm(
		belongs_to = "super::book_club_discussion::Entity",
		from = "Column::DiscussionId",
		to = "super::book_club_discussion::Column::Id",
		on_update = "Cascade",
		on_delete = "Cascade"
	)]
	BookClubDiscussion,
	#[sea_orm(
		belongs_to = "super::book_club_member::Entity",
		from = "Column::MemberId",
		to = "super::book_club_member::Column::Id",
		on_update = "Cascade",
		on_delete = "Cascade"
	)]
	BookClubMember,
}

impl Related<super::book_club_discussion_message_like::Entity> for Entity {
	fn to() -> RelationDef {
		Relation::BookClubDiscussionMessageLike.def()
	}
}

impl Related<super::book_club_discussion::Entity> for Entity {
	fn to() -> RelationDef {
		Relation::BookClubDiscussion.def()
	}
}

impl Related<super::book_club_member::Entity> for Entity {
	fn to() -> RelationDef {
		Relation::BookClubMember.def()
	}
}

impl ActiveModelBehavior for ActiveModel {}

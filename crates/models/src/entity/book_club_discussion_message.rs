use async_graphql::SimpleObject;
use sea_orm::{
	entity::prelude::*, prelude::async_trait::async_trait, sqlx::types::chrono,
	ActiveValue,
};

#[derive(Clone, Debug, PartialEq, DeriveEntityModel, Eq, SimpleObject)]
#[graphql(name = "BookClubDiscussionMessageModel")]
#[sea_orm(table_name = "book_club_discussion_message")]
pub struct Model {
	#[sea_orm(primary_key, auto_increment = false, column_type = "Text")]
	pub id: String,
	#[sea_orm(column_type = "Text")]
	pub content: String,
	#[sea_orm(column_type = "custom(\"DATETIME\")")]
	pub timestamp: DateTimeWithTimeZone,
	#[sea_orm(column_type = "custom(\"DATETIME\")", nullable)]
	pub edited_at: Option<DateTimeWithTimeZone>,
	pub is_pinned_message: bool,
	#[sea_orm(column_type = "custom(\"DATETIME\")", nullable)]
	pub deleted_at: Option<String>,
	#[sea_orm(column_type = "Text", nullable)]
	pub parent_message_id: Option<String>,
	#[sea_orm(column_type = "Text", nullable)]
	pub reply_to_message_id: Option<String>,
	#[sea_orm(column_type = "Text")]
	pub discussion_id: String,
	#[sea_orm(column_type = "Text", nullable)]
	pub member_id: Option<String>,
	#[sea_orm(column_type = "Text")]
	pub book_club_id: String,
}

#[derive(Copy, Clone, Debug, EnumIter, DeriveRelation)]
pub enum Relation {
	#[sea_orm(
		belongs_to = "super::book_club::Entity",
		from = "Column::BookClubId",
		to = "super::book_club::Column::Id",
		on_update = "Cascade",
		on_delete = "Cascade"
	)]
	BookClub,
	#[sea_orm(has_many = "super::book_club_discussion_message_reaction::Entity")]
	BookClubDiscussionMessageReaction,
	#[sea_orm(
		belongs_to = "Entity",
		from = "Column::ParentMessageId",
		to = "Column::Id",
		on_update = "Cascade",
		on_delete = "SetNull"
	)]
	SelfRef,
	#[sea_orm(
		belongs_to = "Entity",
		from = "Column::ReplyToMessageId",
		to = "Column::Id",
		on_update = "Cascade",
		on_delete = "SetNull"
	)]
	ReplyTo,
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

impl Related<super::book_club::Entity> for Entity {
	fn to() -> RelationDef {
		Relation::BookClub.def()
	}
}

impl Related<super::book_club_discussion_message_reaction::Entity> for Entity {
	fn to() -> RelationDef {
		Relation::BookClubDiscussionMessageReaction.def()
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

#[async_trait]
impl ActiveModelBehavior for ActiveModel {
	async fn before_save<C>(mut self, _db: &C, insert: bool) -> Result<Self, DbErr>
	where
		C: ConnectionTrait,
	{
		if insert {
			self.timestamp = ActiveValue::Set(chrono::Utc::now().into());
		} else {
			self.edited_at = ActiveValue::Set(Some(chrono::Utc::now().into()));
		}
		Ok(self)
	}
}

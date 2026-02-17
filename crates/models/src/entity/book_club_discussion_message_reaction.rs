use sea_orm::{entity::prelude::*, prelude::async_trait::async_trait, ActiveValue};

#[derive(Clone, Debug, PartialEq, DeriveEntityModel, Eq)]
#[sea_orm(table_name = "book_club_discussion_message_reactions")]
pub struct Model {
	#[sea_orm(primary_key, auto_increment = false, column_type = "Text")]
	pub id: String,
	#[sea_orm(column_type = "Text", nullable)]
	pub emoji: Option<String>, // None if custom emoji
	pub custom_emoji_id: Option<i32>, // None if standard unicode emoji
	#[sea_orm(column_type = "custom(\"DATETIME\")")]
	pub created_at: DateTimeWithTimeZone,
	#[sea_orm(column_type = "Text")]
	pub member_id: String,
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
		from = "Column::MemberId",
		to = "super::book_club_member::Column::Id",
		on_update = "Cascade",
		on_delete = "Cascade"
	)]
	BookClubMember,
	#[sea_orm(
		belongs_to = "super::custom_emoji::Entity",
		from = "Column::CustomEmojiId",
		to = "super::custom_emoji::Column::Id",
		on_update = "Cascade",
		on_delete = "Cascade"
	)]
	CustomEmoji,
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

impl Related<super::custom_emoji::Entity> for Entity {
	fn to() -> RelationDef {
		Relation::CustomEmoji.def()
	}
}

#[async_trait]
impl ActiveModelBehavior for ActiveModel {
	async fn before_save<C>(mut self, _db: &C, insert: bool) -> Result<Self, DbErr>
	where
		C: ConnectionTrait,
	{
		if insert {
			self.created_at = ActiveValue::Set(chrono::Utc::now().into());
		}
		Ok(self)
	}
}

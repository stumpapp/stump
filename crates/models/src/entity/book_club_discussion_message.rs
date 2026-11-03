use async_graphql::SimpleObject;
use sea_orm::{
	entity::prelude::*, prelude::async_trait::async_trait, sqlx::types::chrono,
	ActiveValue,
};

use super::{
	book_club, book_club_discussion, book_club_discussion_message_reaction,
	book_club_member,
};

#[sea_orm::model]
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
	#[sea_orm(
		belongs_to,
		from = "book_club_id",
		to = "id",
		on_update = "Cascade",
		on_delete = "Cascade"
	)]
	#[graphql(skip)]
	pub book_club: BelongsTo<book_club::Entity>,
	#[sea_orm(has_many)]
	#[graphql(skip)]
	pub reactions: HasMany<book_club_discussion_message_reaction::Entity>,
	#[sea_orm(
		self_ref,
		relation_enum = "SelfRef",
		from = "parent_message_id",
		to = "id",
		on_update = "Cascade",
		on_delete = "SetNull"
	)]
	#[graphql(skip)]
	pub parent_message: BelongsTo<Option<Entity>>,
	#[sea_orm(
		self_ref,
		relation_enum = "ReplyTo",
		from = "reply_to_message_id",
		to = "id",
		on_update = "Cascade",
		on_delete = "SetNull"
	)]
	#[graphql(skip)]
	pub reply_to: BelongsTo<Option<Entity>>,
	#[sea_orm(
		belongs_to,
		from = "discussion_id",
		to = "id",
		on_update = "Cascade",
		on_delete = "Cascade"
	)]
	#[graphql(skip)]
	pub discussion: BelongsTo<book_club_discussion::Entity>,
	#[sea_orm(
		belongs_to,
		from = "member_id",
		to = "id",
		on_update = "Cascade",
		on_delete = "Cascade"
	)]
	#[graphql(skip)]
	pub member: BelongsTo<Option<book_club_member::Entity>>,
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

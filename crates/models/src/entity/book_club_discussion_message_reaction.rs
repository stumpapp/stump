use sea_orm::{entity::prelude::*, prelude::async_trait::async_trait, ActiveValue};

use super::{book_club_discussion_message, book_club_member, custom_emoji};

#[sea_orm::model]
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
	#[sea_orm(
		belongs_to,
		from = "message_id",
		to = "id",
		on_update = "Cascade",
		on_delete = "Cascade"
	)]
	pub message: BelongsTo<book_club_discussion_message::Entity>,
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
		from = "custom_emoji_id",
		to = "id",
		on_update = "Cascade",
		on_delete = "Cascade"
	)]
	pub custom_emoji: BelongsTo<Option<custom_emoji::Entity>>,
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

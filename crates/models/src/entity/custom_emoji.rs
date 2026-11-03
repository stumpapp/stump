use async_graphql::SimpleObject;
use sea_orm::{entity::prelude::*, prelude::async_trait::async_trait, ActiveValue};

use super::{book_club_discussion_message_reaction, user};

#[sea_orm::model]
#[derive(Clone, Debug, PartialEq, DeriveEntityModel, Eq, SimpleObject)]
#[graphql(name = "CustomEmojiModel")]
#[sea_orm(table_name = "custom_emojis")]
pub struct Model {
	#[sea_orm(primary_key)]
	pub id: i32,
	#[sea_orm(column_type = "Text")]
	pub name: String,
	pub is_animated: bool,
	#[sea_orm(column_type = "Text")]
	pub file_extension: String,
	#[sea_orm(column_type = "custom(\"DATETIME\")")]
	pub created_at: DateTimeWithTimeZone,
	#[sea_orm(column_type = "Text")]
	pub created_by_id: String,
	#[sea_orm(
		belongs_to,
		from = "created_by_id",
		to = "id",
		on_update = "Cascade",
		on_delete = "Cascade"
	)]
	#[graphql(skip)]
	pub created_by: BelongsTo<user::Entity>,
	#[sea_orm(has_many, relation_enum = "Reactions")]
	#[graphql(skip)]
	pub reactions: HasMany<book_club_discussion_message_reaction::Entity>,
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

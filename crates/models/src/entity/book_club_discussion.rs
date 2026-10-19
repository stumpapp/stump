use async_graphql::SimpleObject;
use sea_orm::{
	entity::prelude::*, prelude::async_trait::async_trait, sqlx::types::chrono,
	ActiveValue,
};

use super::{book_club, book_club_book, book_club_discussion_message};

#[sea_orm::model]
#[derive(Clone, Debug, PartialEq, DeriveEntityModel, Eq, SimpleObject)]
#[graphql(name = "BookClubDiscussionModel")]
#[sea_orm(table_name = "book_club_discussions")]
pub struct Model {
	#[sea_orm(primary_key, auto_increment = false, column_type = "Text")]
	pub id: String,
	pub is_locked: bool,
	pub is_archived: bool,
	#[sea_orm(column_type = "Text", nullable)]
	pub book_club_book_id: Option<String>,
	#[sea_orm(column_type = "Text", nullable)]
	pub title: Option<String>,
	#[sea_orm(column_type = "Text", nullable)]
	pub emoji: Option<String>,
	pub is_pinned: bool,
	pub created_at: DateTimeWithTimeZone,
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
	#[sea_orm(
		belongs_to,
		from = "book_club_book_id",
		to = "id",
		on_update = "Cascade",
		on_delete = "SetNull"
	)]
	#[graphql(skip)]
	pub book_club_book: BelongsTo<Option<book_club_book::Entity>>,
	#[sea_orm(has_many)]
	#[graphql(skip)]
	pub messages: HasMany<book_club_discussion_message::Entity>,
}

#[async_trait]
impl ActiveModelBehavior for ActiveModel {
	async fn before_save<C>(mut self, _db: &C, insert: bool) -> Result<Self, DbErr>
	where
		C: ConnectionTrait,
	{
		if insert {
			if self.id.is_not_set() {
				self.id = ActiveValue::Set(Uuid::new_v4().to_string());
			}
			self.created_at = ActiveValue::Set(chrono::Utc::now().into());
		}

		Ok(self)
	}
}

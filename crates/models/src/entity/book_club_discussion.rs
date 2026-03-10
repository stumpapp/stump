use async_graphql::SimpleObject;
use sea_orm::{
	entity::prelude::*, prelude::async_trait::async_trait, sqlx::types::chrono,
	ActiveValue,
};

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
	#[sea_orm(
		belongs_to = "super::book_club_book::Entity",
		from = "Column::BookClubBookId",
		to = "super::book_club_book::Column::Id",
		on_update = "Cascade",
		on_delete = "SetNull"
	)]
	BookClubBook,
	#[sea_orm(has_many = "super::book_club_discussion_message::Entity")]
	BookClubDiscussionMessage,
}

impl Related<super::book_club::Entity> for Entity {
	fn to() -> RelationDef {
		Relation::BookClub.def()
	}
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

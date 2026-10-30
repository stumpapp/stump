use async_graphql::SimpleObject;
use chrono::Utc;
use sea_orm::{entity::prelude::*, prelude::async_trait::async_trait, ActiveValue};

use super::{media, reading_session, user, user::AuthUser};

// note for posterity: i decided to move entries to their own table, instead of directly
// embedding them in the session table. in case there is at all a future where i decide
// to allow multiple entries per session, this lends itself to that way more easily.
// more immediately, though, this gives us stamps for entries which in and of itself is
// worth for me

#[sea_orm::model]
#[derive(Clone, Debug, PartialEq, DeriveEntityModel, Eq, SimpleObject)]
#[sea_orm(table_name = "journal_entries")]
#[graphql(name = "JournalEntryModel")]
pub struct Model {
	#[sea_orm(primary_key, auto_increment = true)]
	pub id: i32,
	pub content: String,

	pub user_id: String,
	pub media_id: String,
	pub session_id: Option<i32>,

	pub created_at: DateTimeUtc,
	pub updated_at: DateTimeUtc,
	#[sea_orm(
		belongs_to,
		from = "media_id",
		to = "id",
		on_update = "Cascade",
		on_delete = "Cascade"
	)]
	#[graphql(skip)]
	pub media: BelongsTo<media::Entity>,
	#[sea_orm(
		belongs_to,
		from = "user_id",
		to = "id",
		on_update = "Cascade",
		on_delete = "Cascade"
	)]
	#[graphql(skip)]
	pub user: BelongsTo<user::Entity>,
	#[sea_orm(
		belongs_to,
		from = "session_id",
		to = "id",
		on_update = "Cascade",
		on_delete = "SetNull"
	)]
	#[graphql(skip)]
	pub session: BelongsTo<Option<reading_session::Entity>>,
}

impl Entity {
	pub fn find_for_user(user: &AuthUser) -> Select<Entity> {
		Entity::find().filter(Column::UserId.eq(&user.id))
	}
}

#[async_trait]
impl ActiveModelBehavior for ActiveModel {
	async fn before_save<C>(mut self, _db: &C, insert: bool) -> Result<Self, DbErr>
	where
		C: ConnectionTrait,
	{
		if insert {
			self.created_at = ActiveValue::Set(Utc::now());
		}
		self.updated_at = ActiveValue::Set(Utc::now());

		Ok(self)
	}
}

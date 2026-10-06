use async_graphql::SimpleObject;
use chrono::Utc;
use sea_orm::{entity::prelude::*, prelude::async_trait::async_trait, ActiveValue};

use super::user::AuthUser;

#[derive(Clone, Debug, PartialEq, DeriveEntityModel, Eq, SimpleObject)]
#[sea_orm(table_name = "journal_entries")]
#[graphql(name = "JournalEntryModel")]
pub struct Model {
	// TODO(reading-journal): consider uuid before merge, but for now this is fine
	// my general philosophy has been if "publically" exposed in some
	// management/editing/viewing context, uuid, but it's just so easy to
	// work with int and so ive gone a bit lax on that front
	#[sea_orm(primary_key, auto_increment = true)]
	pub id: i32,
	pub content: String,

	pub user_id: String,
	pub media_id: String,
	pub session_id: Option<i32>,

	pub created_at: DateTimeUtc,
	pub updated_at: DateTimeUtc,
}

#[derive(Copy, Clone, Debug, EnumIter, DeriveRelation)]
pub enum Relation {
	#[sea_orm(
		belongs_to = "super::media::Entity",
		from = "Column::MediaId",
		to = "super::media::Column::Id",
		on_update = "Cascade",
		on_delete = "Cascade"
	)]
	Media,
	#[sea_orm(
		belongs_to = "super::user::Entity",
		from = "Column::UserId",
		to = "super::user::Column::Id",
		on_update = "Cascade",
		on_delete = "Cascade"
	)]
	User,
	#[sea_orm(
		belongs_to = "super::reading_session::Entity",
		from = "Column::SessionId",
		to = "super::reading_session::Column::Id",
		on_update = "Cascade",
		on_delete = "SetNull"
	)]
	ReadingSession,
}

impl Entity {
	pub fn find_for_user(user: &AuthUser) -> Select<Entity> {
		Entity::find().filter(Column::UserId.eq(&user.id))
	}
}

impl Related<super::media::Entity> for Entity {
	fn to() -> RelationDef {
		Relation::Media.def()
	}
}

impl Related<super::user::Entity> for Entity {
	fn to() -> RelationDef {
		Relation::User.def()
	}
}

impl Related<super::reading_session::Entity> for Entity {
	fn to() -> RelationDef {
		Relation::ReadingSession.def()
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
			// if self.id.is_not_set() {
			// 	self.id = ActiveValue::Set(Uuid::new_v4().to_string());
			// }
		}
		self.updated_at = ActiveValue::Set(Utc::now());

		Ok(self)
	}
}

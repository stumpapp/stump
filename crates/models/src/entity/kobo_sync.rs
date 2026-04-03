use sea_orm::FromJsonQueryResult;
use sea_orm::{entity::prelude::*, prelude::async_trait::async_trait, ActiveValue};
use serde::{Deserialize, Serialize};

// use super::user::AuthUser;

#[derive(Clone, Debug, PartialEq, Eq, Serialize, Deserialize, FromJsonQueryResult)]
pub struct MediaIds(pub Vec<String>);

// TODO: pluralize?
#[derive(Clone, Debug, PartialEq, Eq, DeriveEntityModel)]
#[sea_orm(table_name = "kobo_sync")]
pub struct Model {
	#[sea_orm(primary_key, auto_increment = false, column_type = "Text")]
	pub id: String,
	#[sea_orm(column_type = "Text")]
	pub user_id: String,
	#[sea_orm(column_type = "Json")]
	pub media_ids: MediaIds,
	#[sea_orm(column_type = "Text")]
	pub device_id: String,
	#[sea_orm(column_type = "Json")]
	pub device_metadata: Json,
	// TODO: DateTimeWithTimeZone?
	pub created_at: DateTimeUtc,

	// the time that the sync session before this one began.
	// or None if there was no sync session before this one.
	pub previous_sync_at: Option<DateTimeWithTimeZone>,
}

#[derive(Copy, Clone, Debug, EnumIter, DeriveRelation)]
pub enum Relation {
	#[sea_orm(
		belongs_to = "super::user::Entity",
		from = "Column::UserId",
		to = "super::user::Column::Id",
		on_update = "Cascade",
		on_delete = "Cascade"
	)]
	User,
}

impl Related<super::user::Entity> for Entity {
	fn to() -> RelationDef {
		Relation::User.def()
	}
}

impl Entity {
	// pub fn find_for_user(user: &AuthUser) -> Select<Entity> {
	// 	Entity::find().filter(Column::UserId.eq(&user.id))
	// }
	//
	// pub fn find_for_user_and_media_id(user: &AuthUser, media_id: &str) -> Select<Entity> {
	// 	Entity::find()
	// 		.filter(Column::UserId.eq(&user.id))
	// 		.filter(Column::MediaId.eq(media_id))
	// }
}

#[async_trait]
impl ActiveModelBehavior for ActiveModel {
	async fn before_save<C>(mut self, _db: &C, insert: bool) -> Result<Self, DbErr>
	where
		C: ConnectionTrait,
	{
		if insert {
			self.created_at = ActiveValue::Set(chrono::Utc::now());
			if self.id.is_not_set() {
				self.id = ActiveValue::Set(Uuid::new_v4().to_string());
			}
		}

		Ok(self)
	}
}

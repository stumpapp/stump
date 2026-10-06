use async_graphql::SimpleObject;
use async_trait::async_trait;
use chrono::Utc;
use sea_orm::{prelude::*, ActiveValue};

use crate::entity::user::AuthUser;

#[derive(Clone, Debug, PartialEq, DeriveEntityModel, Eq, SimpleObject)]
#[sea_orm(table_name = "reading_devices")]
#[graphql(name = "ReadingDeviceModel")]
pub struct Model {
	#[sea_orm(primary_key, auto_increment = false)]
	pub id: String,
	#[sea_orm(primary_key, auto_increment = false)]
	pub user_id: String,
	pub name: String,

	pub created_at: DateTimeUtc,
	pub updated_at: DateTimeUtc,
}

impl Entity {
	pub fn find_for_user(user: &AuthUser) -> Select<Entity> {
		Entity::find().filter(Column::UserId.eq(&user.id))
	}
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

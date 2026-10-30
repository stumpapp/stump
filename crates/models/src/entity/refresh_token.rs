use async_trait::async_trait;
use chrono::Utc;
use sea_orm::{entity::prelude::*, ActiveValue};

use super::user;

#[sea_orm::model]
#[derive(Clone, Debug, PartialEq, DeriveEntityModel, Eq)]
#[sea_orm(table_name = "refresh_tokens")]
pub struct Model {
	#[sea_orm(primary_key, auto_increment = false, column_type = "Text")]
	pub id: String,
	#[sea_orm(column_type = "Text")]
	pub user_id: String,
	#[sea_orm(column_type = "custom(\"DATETIME\")")]
	pub created_at: DateTimeWithTimeZone,
	#[sea_orm(column_type = "custom(\"DATETIME\")")]
	pub expires_at: DateTimeWithTimeZone,
	#[sea_orm(
		belongs_to,
		from = "user_id",
		to = "id",
		on_update = "Cascade",
		on_delete = "Cascade"
	)]
	pub user: BelongsTo<user::Entity>,
}

#[async_trait]
impl ActiveModelBehavior for ActiveModel {
	async fn before_save<C>(mut self, _db: &C, insert: bool) -> Result<Self, DbErr>
	where
		C: ConnectionTrait,
	{
		if insert {
			self.created_at = ActiveValue::Set(DateTimeWithTimeZone::from(Utc::now()));
		}

		Ok(self)
	}
}

use crate::{
	entity::{author, series},
	shared::enums::AuthorRole,
};
use sea_orm::{entity::prelude::*, ActiveValue};

#[sea_orm::model]
#[derive(Clone, Debug, PartialEq, Eq, DeriveEntityModel)]
#[sea_orm(table_name = "series_authors")]
pub struct Model {
	#[sea_orm(primary_key, auto_increment = true)]
	pub id: i32,

	pub series_id: String,
	pub author_id: String,
	pub role: AuthorRole,

	pub created_at: DateTimeUtc,

	#[sea_orm(
		belongs_to,
		from = "author_id",
		to = "id",
		on_update = "Cascade",
		on_delete = "Cascade"
	)]
	pub author: BelongsTo<author::Entity>,
	#[sea_orm(
		belongs_to,
		from = "series_id",
		to = "id",
		on_update = "Cascade",
		on_delete = "Cascade"
	)]
	pub series: BelongsTo<series::Entity>,
}

#[async_trait::async_trait]
impl ActiveModelBehavior for ActiveModel {
	async fn before_save<C>(mut self, _db: &C, insert: bool) -> Result<Self, DbErr>
	where
		C: ConnectionTrait,
	{
		if insert {
			self.created_at = ActiveValue::Set(chrono::Utc::now());
		}
		Ok(self)
	}
}

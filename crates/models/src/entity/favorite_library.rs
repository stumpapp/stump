use async_trait::async_trait;
use chrono::Utc;
use sea_orm::{prelude::*, ActiveValue, FromQueryResult};

use super::{library, user};

#[sea_orm::model]
#[derive(Clone, Debug, PartialEq, DeriveEntityModel, Eq)]
#[sea_orm(table_name = "favorite_libraries")]
pub struct Model {
	#[sea_orm(primary_key, auto_increment = false, column_type = "Text")]
	pub user_id: String,
	#[sea_orm(primary_key, auto_increment = false, column_type = "Text")]
	pub library_id: String,
	#[sea_orm(column_type = "custom(\"DATETIME\")")]
	pub favorited_at: DateTimeWithTimeZone,
	#[sea_orm(
		belongs_to,
		from = "user_id",
		to = "id",
		on_update = "Cascade",
		on_delete = "Cascade"
	)]
	pub user: BelongsTo<user::Entity>,
	#[sea_orm(
		belongs_to,
		from = "library_id",
		to = "id",
		on_update = "Cascade",
		on_delete = "Cascade"
	)]
	pub library: BelongsTo<library::Entity>,
}

#[derive(Clone, Debug, FromQueryResult)]
pub struct FavoriteLibraryFavoritedAtCmpSelect {
	pub favorited_at: DateTimeWithTimeZone,
}

#[async_trait]
impl ActiveModelBehavior for ActiveModel {
	async fn before_save<C>(mut self, _db: &C, insert: bool) -> Result<Self, DbErr>
	where
		C: ConnectionTrait,
	{
		if insert {
			self.favorited_at = ActiveValue::Set(DateTimeWithTimeZone::from(Utc::now()));
		}

		Ok(self)
	}
}

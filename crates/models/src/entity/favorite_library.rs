use async_trait::async_trait;
use chrono::Utc;
use sea_orm::{prelude::*, ActiveValue, FromQueryResult};

#[derive(Clone, Debug, PartialEq, DeriveEntityModel, Eq)]
#[sea_orm(table_name = "favorite_libraries")]
pub struct Model {
	#[sea_orm(primary_key, auto_increment = false, column_type = "Text")]
	pub user_id: String,
	#[sea_orm(primary_key, auto_increment = false, column_type = "Text")]
	pub library_id: String,
	#[sea_orm(column_type = "custom(\"DATETIME\")")]
	pub favorited_at: DateTimeWithTimeZone,
}

#[derive(Clone, Debug, FromQueryResult)]
pub struct FavoriteLibraryFavoritedAtCmpSelect {
	pub favorited_at: DateTimeWithTimeZone,
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

	#[sea_orm(
		belongs_to = "super::library::Entity",
		from = "Column::LibraryId",
		to = "super::library::Column::Id",
		on_update = "Cascade",
		on_delete = "Cascade"
	)]
	Library,
}

impl Related<super::user::Entity> for Entity {
	fn to() -> RelationDef {
		Relation::User.def()
	}
}

impl Related<super::library::Entity> for Entity {
	fn to() -> RelationDef {
		Relation::Library.def()
	}
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

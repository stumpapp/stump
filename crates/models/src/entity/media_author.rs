use crate::shared::enums::AuthorRole;
use sea_orm::{entity::prelude::*, ActiveValue};

#[derive(Clone, Debug, PartialEq, Eq, DeriveEntityModel)]
#[sea_orm(table_name = "media_authors")]
pub struct Model {
	#[sea_orm(primary_key, auto_increment = true)]
	pub id: i32,

	pub media_id: String,
	pub author_id: String,
	pub role: AuthorRole,

	// TODO: co-author ordering?
	pub created_at: DateTimeUtc,
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
		belongs_to = "super::author::Entity",
		from = "Column::AuthorId",
		to = "super::author::Column::Id",
		on_update = "Cascade",
		on_delete = "Cascade"
	)]
	Author,
}

impl Related<super::media::Entity> for Entity {
	fn to() -> RelationDef {
		Relation::Media.def()
	}
}

impl Related<super::author::Entity> for Entity {
	fn to() -> RelationDef {
		Relation::Author.def()
	}
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

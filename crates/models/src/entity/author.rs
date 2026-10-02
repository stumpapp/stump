use sea_orm::{entity::prelude::*, ActiveValue};

#[derive(Clone, Debug, PartialEq, Eq, DeriveEntityModel)]
#[sea_orm(table_name = "authors")]
pub struct Model {
	#[sea_orm(primary_key)]
	pub id: String,

	pub name: String,
	// TODO: normalized_name? e.g., https://crates.io/crates/unicode-normalization ??
	// TODO: populated by metadata?
	pub sort_name: Option<String>,
	pub biography: Option<String>,
	pub photo_url: Option<String>,

	pub hardcover_id: Option<String>,
	pub openlibrary_id: Option<String>,

	pub created_at: DateTimeUtc,
	pub updated_at: DateTimeUtc,
}

#[derive(Copy, Clone, Debug, EnumIter, DeriveRelation)]
pub enum Relation {
	#[sea_orm(has_many = "super::media_author::Entity")]
	MediaAuthor,
	#[sea_orm(has_many = "super::series_author::Entity")]
	SeriesAuthor,
}

impl Related<super::media_author::Entity> for Entity {
	fn to() -> RelationDef {
		Relation::MediaAuthor.def()
	}
}

impl Related<super::series_author::Entity> for Entity {
	fn to() -> RelationDef {
		Relation::SeriesAuthor.def()
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
		self.updated_at = ActiveValue::Set(chrono::Utc::now());
		Ok(self)
	}
}

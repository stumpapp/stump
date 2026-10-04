use async_graphql::SimpleObject;
use sea_orm::{
	entity::prelude::*, sea_query::Query, ActiveValue, QuerySelect, QueryTrait,
};

use crate::{
	domain::author::normalize_author_name,
	entity::{media, media_author, series},
};

#[derive(Clone, Debug, PartialEq, Eq, DeriveEntityModel, SimpleObject)]
#[sea_orm(table_name = "authors")]
#[graphql(name = "AuthorModel")]
pub struct Model {
	#[sea_orm(primary_key)]
	pub id: String,

	pub name: String,
	// used for deduplication and normalized serach
	pub normalized_name: String,
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

impl Entity {
	// lmao this is actually awful!
	// TODO(chore): add fks to library on media

	/// Authors that have at least one media link inside the given library
	/// and therefore are part of the "authors in library" kind of query
	pub fn find_for_library(library_id: String) -> Select<Entity> {
		Self::find().filter(
			Column::Id.in_subquery(
				media_author::Entity::find()
					.select_only()
					.column(media_author::Column::AuthorId)
					.filter(
						media_author::Column::MediaId.in_subquery(
							media::Entity::find()
								.select_only()
								.column(media::Column::Id)
								.filter(
									media::Column::SeriesId.in_subquery(
										Query::select()
											.column(series::Column::Id)
											.from(series::Entity)
											.and_where(
												series::Column::LibraryId.eq(library_id),
											)
											.to_owned(),
									),
								)
								.into_query(),
						),
					)
					.into_query(),
			),
		)
	}
}

#[async_trait::async_trait]
impl ActiveModelBehavior for ActiveModel {
	async fn before_save<C>(mut self, _db: &C, insert: bool) -> Result<Self, DbErr>
	where
		C: ConnectionTrait,
	{
		if insert {
			if self.id.is_not_set() {
				self.id = ActiveValue::Set(Uuid::new_v4().to_string());
			}
			self.created_at = ActiveValue::Set(chrono::Utc::now());
		}

		// recompute the dedup key whenever the name is (re)set without
		// a normalized one provided
		if !self.name.is_not_set() && self.normalized_name.is_not_set() {
			let name = self.name.as_ref();
			self.normalized_name = ActiveValue::Set(normalize_author_name(name));
		}

		self.updated_at = ActiveValue::Set(chrono::Utc::now());
		Ok(self)
	}
}

use async_graphql::SimpleObject;
use sea_orm::{
	entity::prelude::*, sea_query::Query, ActiveValue, QuerySelect, QueryTrait,
};

use crate::{
	domain::author::normalize_author_name,
	entity::{media, media_author, series, series_author},
	shared::image::ImageMetadata,
};

#[sea_orm::model]
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
	pub photo_path: Option<String>,
	#[sea_orm(column_type = "Json", nullable)]
	pub photo_meta: Option<ImageMetadata>,

	pub hardcover_id: Option<String>,
	pub openlibrary_id: Option<String>,

	pub created_at: DateTimeUtc,
	pub updated_at: DateTimeUtc,

	#[sea_orm(has_many)]
	#[graphql(skip)]
	pub media: HasMany<media_author::Entity>,
	#[sea_orm(has_many)]
	#[graphql(skip)]
	pub series: HasMany<series_author::Entity>,
}

impl Entity {
	// lmao this is actually awful!
	// TODO: refactor once metadata library change lands for
	// media.library_id fk

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

use async_graphql::SimpleObject;
use async_trait::async_trait;
use sea_orm::{
	prelude::*, sea_query::Query, ActiveValue, Condition, FromQueryResult, JoinType,
	QuerySelect, QueryTrait,
};

use crate::prefixer::{parse_query_to_model, parse_query_to_model_optional, Prefixer};

use super::{
	library_hidden_to_user, media_metadata, series, series_metadata, user::AuthUser,
};

#[derive(Clone, Debug, PartialEq, DeriveEntityModel, Eq, SimpleObject)]
#[graphql(name = "MediaModel")]
#[sea_orm(table_name = "media")]
pub struct Model {
	#[sea_orm(primary_key, auto_increment = false, column_type = "Text")]
	pub id: String,
	#[sea_orm(column_type = "Text")]
	pub name: String,
	pub size: i64,
	#[sea_orm(column_type = "Text")]
	pub extension: String,
	pub pages: i32,
	#[sea_orm(column_type = "custom(\"DATETIME\")")]
	pub updated_at: DateTimeWithTimeZone,
	#[sea_orm(column_type = "custom(\"DATETIME\")")]
	pub created_at: DateTimeWithTimeZone,
	#[sea_orm(column_type = "custom(\"DATETIME\")", nullable)]
	pub modified_at: Option<DateTimeWithTimeZone>,
	#[sea_orm(column_type = "Text", nullable)]
	pub hash: Option<String>,
	#[sea_orm(column_type = "Text")]
	pub path: String,
	#[sea_orm(column_type = "Text")]
	pub status: String,
	#[sea_orm(column_type = "Text", nullable)]
	pub series_id: Option<String>,
	#[sea_orm(column_type = "custom(\"DATETIME\")", nullable)]
	pub deleted_at: Option<DateTimeWithTimeZone>,
	#[sea_orm(column_type = "Text", nullable)]
	pub koreader_hash: Option<String>,
}

pub fn get_age_restriction_filter(min_age: i32, restrict_on_unset: bool) -> Condition {
	if restrict_on_unset {
		Condition::any()
			// If the media has no age rating, then we can defer to the series age rating.
			.add(
				Condition::all()
					.add(media_metadata::Column::AgeRating.is_null())
					.add(series_metadata::Column::AgeRating.is_not_null())
					.add(series_metadata::Column::AgeRating.lte(min_age)),
			)
			// If the media has an age rating, it must be under the user age restriction
			.add(
				Condition::all()
					.add(media_metadata::Column::AgeRating.is_not_null())
					.add(media_metadata::Column::AgeRating.lte(min_age)),
			)
	} else {
		Condition::any()
			.add(
				// If there is no media metadata at all, or it exists with no age rating, then we
				// should try to defer to the series age rating
				Condition::all()
					.add(
						Condition::any()
							.add(media_metadata::Column::Id.is_null())
							.add(media_metadata::Column::AgeRating.is_null()),
					)
					.add(
						Condition::any()
							// If the series has no metadata, then we can allow the media
							.add(series_metadata::Column::SeriesId.is_null())
							// Or if the series has an age rating and it is under the user age restriction
							.add(
								Condition::all()
									.add(series_metadata::Column::SeriesId.is_not_null())
									.add(series_metadata::Column::AgeRating.is_not_null())
									.add(series_metadata::Column::AgeRating.lte(min_age)),
							)
							// Or if the series has no age rating, then we can allow the media
							.add(
								Condition::all()
									.add(series_metadata::Column::SeriesId.is_not_null())
									.add(series_metadata::Column::AgeRating.is_null()),
							),
					),
			)
			// If the media has an age rating, it must be under the user age restriction
			.add(
				Condition::all()
					.add(media_metadata::Column::Id.is_not_null())
					.add(
						media_metadata::Column::AgeRating
							.is_not_null()
							.add(media_metadata::Column::AgeRating.lte(min_age)),
					),
			)
	}
}

impl Entity {
	pub fn find_for_user(user: &AuthUser) -> Select<Entity> {
		let age_restriction_filter =
			user.age_restriction.as_ref().map(|age_restriction| {
				get_age_restriction_filter(
					age_restriction.age,
					age_restriction.restrict_on_unset,
				)
			});

		Entity::find()
			.left_join(media_metadata::Entity)
			.inner_join(series::Entity)
			.join_rev(
				JoinType::LeftJoin,
				series_metadata::Entity::belongs_to(series::Entity)
					.from(series_metadata::Column::SeriesId)
					.to(series::Column::Id)
					.into(),
			)
			.filter(
				series::Column::LibraryId.not_in_subquery(
					Query::select()
						.column(library_hidden_to_user::Column::LibraryId)
						.from(library_hidden_to_user::Entity)
						.and_where(
							library_hidden_to_user::Column::UserId.eq(user.id.clone()),
						)
						.to_owned(),
				),
			)
			.apply_if(age_restriction_filter, |query, filter| query.filter(filter))
	}
}

#[derive(Debug, Clone, SimpleObject)]
pub struct ModelWithMetadata {
	#[graphql(flatten)]
	pub media: Model,
	pub metadata: Option<media_metadata::Model>,
}

impl FromQueryResult for ModelWithMetadata {
	fn from_query_result(
		res: &sea_orm::QueryResult,
		_pre: &str,
	) -> Result<Self, sea_orm::DbErr> {
		let media = parse_query_to_model::<Model, Entity>(res)?;
		let metadata = parse_query_to_model_optional::<
			media_metadata::Model,
			media_metadata::Entity,
		>(res)?;
		Ok(Self { media, metadata })
	}
}

impl ModelWithMetadata {
	pub fn find() -> Select<Entity> {
		Prefixer::new(Entity::find().select_only())
			.add_columns(Entity)
			.add_columns(media_metadata::Entity)
			.selector
			.left_join(media_metadata::Entity)
	}

	pub fn find_by_id(id: String) -> Select<Entity> {
		Prefixer::new(Entity::find_by_id(id).select_only())
			.add_columns(Entity)
			.add_columns(media_metadata::Entity)
			.selector
			.left_join(media_metadata::Entity)
	}

	pub fn find_for_user(user: &AuthUser) -> Select<Entity> {
		let age_restriction_filter =
			user.age_restriction.as_ref().map(|age_restriction| {
				get_age_restriction_filter(
					age_restriction.age,
					age_restriction.restrict_on_unset,
				)
			});

		ModelWithMetadata::find()
			.inner_join(series::Entity)
			.join_rev(
				JoinType::LeftJoin,
				series_metadata::Entity::belongs_to(series::Entity)
					.from(series_metadata::Column::SeriesId)
					.to(series::Column::Id)
					.into(),
			)
			.filter(
				series::Column::LibraryId.not_in_subquery(
					Query::select()
						.column(library_hidden_to_user::Column::LibraryId)
						.from(library_hidden_to_user::Entity)
						.and_where(
							library_hidden_to_user::Column::UserId.eq(user.id.clone()),
						)
						.to_owned(),
				),
			)
			.apply_if(age_restriction_filter, |query, filter| query.filter(filter))
	}

	pub fn find_by_id_for_user(id: String, user: &AuthUser) -> Select<Entity> {
		let age_restriction_filter =
			user.age_restriction.as_ref().map(|age_restriction| {
				get_age_restriction_filter(
					age_restriction.age,
					age_restriction.restrict_on_unset,
				)
			});

		ModelWithMetadata::find_by_id(id)
			.inner_join(series::Entity)
			.join_rev(
				JoinType::LeftJoin,
				series_metadata::Entity::belongs_to(series::Entity)
					.from(series_metadata::Column::SeriesId)
					.to(series::Column::Id)
					.into(),
			)
			.filter(
				series::Column::LibraryId.not_in_subquery(
					Query::select()
						.column(library_hidden_to_user::Column::LibraryId)
						.from(library_hidden_to_user::Entity)
						.and_where(
							library_hidden_to_user::Column::UserId.eq(user.id.clone()),
						)
						.to_owned(),
				),
			)
			.apply_if(age_restriction_filter, |query, filter| query.filter(filter))
	}
}

#[derive(Debug, FromQueryResult)]
pub struct MediaIdentSelect {
	pub id: String,
	pub path: String,
}

#[derive(Debug, FromQueryResult)]
pub struct MediaNameCmpSelect {
	pub name: String,
}

#[derive(Copy, Clone, Debug, EnumIter, DeriveRelation)]
pub enum Relation {
	#[sea_orm(has_many = "super::book_club_book_suggestion::Entity")]
	BookClubBookSuggestion,
	#[sea_orm(has_many = "super::book_club_book::Entity")]
	BookClubBook,
	#[sea_orm(has_many = "super::book_club_member_favorite_book::Entity")]
	BookClubMemberFavoriteBook,
	#[sea_orm(has_many = "super::bookmark::Entity")]
	Bookmark,
	#[sea_orm(has_many = "super::finished_reading_session::Entity")]
	FinishedReadingSession,
	#[sea_orm(has_many = "super::media_annotation::Entity")]
	MediaAnnotation,
	#[sea_orm(has_one = "super::media_metadata::Entity")]
	MediaMetadata,
	#[sea_orm(has_many = "super::media_to_tag::Entity")]
	Tags,
	#[sea_orm(has_many = "super::reading_list_item::Entity")]
	ReadingListItem,
	#[sea_orm(has_many = "super::reading_session::Entity")]
	ReadingSession,
	#[sea_orm(has_many = "super::review::Entity")]
	Review,
	#[sea_orm(
		belongs_to = "super::series::Entity",
		from = "Column::SeriesId",
		to = "super::series::Column::Id",
		on_update = "Cascade",
		on_delete = "Cascade"
	)]
	Series,
}

impl Related<super::book_club_book_suggestion::Entity> for Entity {
	fn to() -> RelationDef {
		Relation::BookClubBookSuggestion.def()
	}
}

impl Related<super::book_club_book::Entity> for Entity {
	fn to() -> RelationDef {
		Relation::BookClubBook.def()
	}
}

impl Related<super::book_club_member_favorite_book::Entity> for Entity {
	fn to() -> RelationDef {
		Relation::BookClubMemberFavoriteBook.def()
	}
}

impl Related<super::bookmark::Entity> for Entity {
	fn to() -> RelationDef {
		Relation::Bookmark.def()
	}
}

impl Related<super::finished_reading_session::Entity> for Entity {
	fn to() -> RelationDef {
		Relation::FinishedReadingSession.def()
	}
}

impl Related<super::media_annotation::Entity> for Entity {
	fn to() -> RelationDef {
		Relation::MediaAnnotation.def()
	}
}

impl Related<super::media_metadata::Entity> for Entity {
	fn to() -> RelationDef {
		Relation::MediaMetadata.def()
	}
}

impl Related<super::media_to_tag::Entity> for Entity {
	fn to() -> RelationDef {
		Relation::Tags.def()
	}
}

impl Related<super::reading_list_item::Entity> for Entity {
	fn to() -> RelationDef {
		Relation::ReadingListItem.def()
	}
}

impl Related<super::reading_session::Entity> for Entity {
	fn to() -> RelationDef {
		Relation::ReadingSession.def()
	}
}

impl Related<super::review::Entity> for Entity {
	fn to() -> RelationDef {
		Relation::Review.def()
	}
}

impl Related<super::series::Entity> for Entity {
	fn to() -> RelationDef {
		Relation::Series.def()
	}
}

#[async_trait]
impl ActiveModelBehavior for ActiveModel {
	async fn before_save<C>(mut self, _db: &C, insert: bool) -> Result<Self, DbErr>
	where
		C: ConnectionTrait,
	{
		if insert && self.id.is_not_set() {
			self.id = ActiveValue::Set(Uuid::new_v4().to_string());
		}

		Ok(self)
	}
}

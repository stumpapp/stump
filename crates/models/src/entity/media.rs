use crate::entity::age_restriction;
use async_graphql::SimpleObject;
use async_trait::async_trait;
use chrono::Utc;
use filter_gen::Ordering;
use sea_orm::{
	prelude::*, ActiveValue, Condition, FromQueryResult, JoinType, QueryOrder,
	QuerySelect,
};

use crate::{
	prefixer::{parse_query_to_model, parse_query_to_model_optional, Prefixer},
	shared::{
		enums::FileStatus,
		ordering::{OrderBy, OrderDirection},
	},
};

use super::{library_exclusion, media_metadata, series, series_metadata, user::AuthUser};

#[derive(Clone, Debug, PartialEq, DeriveEntityModel, Eq, SimpleObject, Ordering)]
#[graphql(name = "MediaModel")]
#[sea_orm(table_name = "media")]
pub struct Model {
	/// The unique identifier for the media
	#[sea_orm(primary_key, auto_increment = false, column_type = "Text")]
	pub id: String,
	/// The name of the media, derived from the filename and excluding the extension
	#[sea_orm(column_type = "Text")]
	pub name: String,
	/// The size of the media file in bytes
	pub size: i64,
	/// The extension of the media file, excluding the leading period
	#[sea_orm(column_type = "Text")]
	pub extension: String,
	/// The number of pages in the media, if applicable. Will be -1 for certain media types
	pub pages: i32,
	/// The timestamp of the last time the media was updated. This will be set during creation, as well
	#[sea_orm(column_type = "custom(\"DATETIME\")")]
	pub updated_at: Option<DateTimeWithTimeZone>,
	/// The timestamp of the creation of the media
	#[sea_orm(column_type = "custom(\"DATETIME\")")]
	pub created_at: DateTimeWithTimeZone,
	/// The timestamp of when the underlying file was last modified on disk. This will only be set if
	/// a timestamp can be retrieved from the filesystem
	#[sea_orm(column_type = "custom(\"DATETIME\")", nullable)]
	pub modified_at: Option<DateTimeWithTimeZone>,
	/// A Stump-specific hash of the media file. This is used as a secondary identifier for the media, primarily
	/// in aiding in the identification of duplicate media files
	#[sea_orm(column_type = "Text", nullable)]
	pub hash: Option<String>,
	/// A hash of the media file that adheres to the KoReader hash algorithm. This is used to identify
	/// books from the KoReader application so progress can be synced between the two applications
	#[sea_orm(column_type = "Text", nullable)]
	pub koreader_hash: Option<String>,
	/// The path of the underlying media file on disk
	#[sea_orm(column_type = "Text")]
	pub path: String,
	/// The status of the media. This is used to determine if the media is available for reading (i.e.,
	/// if it is available on disk)
	#[sea_orm(column_type = "Text")]
	pub status: FileStatus,
	/// The unique identifier of the series that the media belongs to. While this is nullable, it is
	/// expected that all media will belong to a series
	#[sea_orm(column_type = "Text", nullable)]
	pub series_id: Option<String>,
	/// The timestamp of when the media was **soft** deleted. This will act like a trash bin.
	#[sea_orm(column_type = "custom(\"DATETIME\")", nullable)]
	pub deleted_at: Option<DateTimeWithTimeZone>,
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

fn apply_age_restriction_filter(
	query: Select<Entity>,
	age_restriction: Option<age_restriction::Model>,
) -> Select<Entity> {
	if let Some(age_restriction) = age_restriction {
		query.filter(get_age_restriction_filter(
			age_restriction.age,
			age_restriction.restrict_on_unset,
		))
	} else {
		query
	}
}

fn apply_series_metadata_join(query: Select<Entity>) -> Select<Entity> {
	query.inner_join(series::Entity).join_rev(
		JoinType::LeftJoin,
		series_metadata::Entity::belongs_to(series::Entity)
			.from(series_metadata::Column::SeriesId)
			.to(series::Column::Id)
			.into(),
	)
}

fn apply_library_hidden_filter(query: Select<Entity>, user: &AuthUser) -> Select<Entity> {
	query.filter(series::Column::LibraryId.not_in_subquery(
		library_exclusion::Entity::library_hidden_to_user_query(user),
	))
}

impl Entity {
	pub fn find_for_user(user: &AuthUser) -> Select<Entity> {
		let select = Entity::find().left_join(media_metadata::Entity);
		let select = apply_series_metadata_join(select);
		let select = apply_library_hidden_filter(select, user);
		apply_age_restriction_filter(select, user.age_restriction.clone())
	}

	pub fn apply_for_user(user: &AuthUser, select: Select<Entity>) -> Select<Entity> {
		let select = apply_series_metadata_join(select);
		let select = apply_library_hidden_filter(select, user);
		apply_age_restriction_filter(select, user.age_restriction.clone())
	}

	pub fn find_media_ids_for_user(id: String, user: &AuthUser) -> Select<Entity> {
		Self::find_for_user(user)
			.select_only()
			.columns(vec![Column::Id, Column::Path])
			.filter(Column::Id.eq(id))
	}

	pub fn find_for_series_id(user: &AuthUser, series_id: String) -> Select<Self> {
		Self::find_for_user(user).filter(series::Column::Id.eq(series_id))
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
		let select = ModelWithMetadata::find();
		let select = apply_series_metadata_join(select);
		let select = apply_library_hidden_filter(select, user);
		apply_age_restriction_filter(select, user.age_restriction.clone())
	}

	pub fn find_by_id_for_user(id: String, user: &AuthUser) -> Select<Entity> {
		let select = ModelWithMetadata::find_by_id(id);
		let select = apply_series_metadata_join(select);
		let select = apply_library_hidden_filter(select, user);
		apply_age_restriction_filter(select, user.age_restriction.clone())
	}
}

#[derive(Debug, FromQueryResult)]
pub struct MediaIdentSelect {
	pub id: String,
	pub path: String,
}

impl MediaIdentSelect {
	pub fn columns() -> Vec<Column> {
		vec![Column::Id, Column::Path]
	}
}

impl From<Model> for MediaIdentSelect {
	fn from(model: Model) -> Self {
		Self {
			id: model.id,
			path: model.path,
		}
	}
}

#[derive(Debug, FromQueryResult)]
pub struct MediaThumbSelect {
	pub id: String,
	pub path: String,
	pub series_id: String,
}

impl MediaThumbSelect {
	pub fn columns() -> Vec<Column> {
		vec![Column::Id, Column::Path, Column::SeriesId]
	}
}

#[derive(Debug, FromQueryResult)]
pub struct MediaNameCmpSelect {
	pub name: String,
}

#[derive(Debug, FromQueryResult)]
pub struct MediaCreatedAtCmpSelect {
	pub created_at: DateTimeWithTimeZone,
}

#[derive(Debug, FromQueryResult)]
pub struct ReadingSessionUpdatedAtCmpSelect {
	pub updated_at: DateTimeWithTimeZone,
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
	#[sea_orm(has_many = "super::media_tag::Entity")]
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

impl Related<super::media_tag::Entity> for Entity {
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
		if insert {
			if self.id.is_not_set() {
				self.id = ActiveValue::Set(Uuid::new_v4().to_string());
			}
			if self.status.is_not_set() {
				self.status = ActiveValue::Set(FileStatus::Ready);
			}
			self.created_at = ActiveValue::Set(DateTimeWithTimeZone::from(Utc::now()));
		} else {
			self.updated_at =
				ActiveValue::Set(Some(DateTimeWithTimeZone::from(Utc::now())));
		}

		Ok(self)
	}
}

#[cfg(test)]
mod tests {
	use super::*;
	use crate::tests::common::*;
	use pretty_assertions::assert_eq;

	#[test]
	fn test_age_restriction_filter_restrict_on_unset() {
		let filter = get_age_restriction_filter(18, true);
		assert_eq!(
			condition_to_string(&filter),
			r#"SELECT  WHERE "#.to_string()
				+ r#"("media_metadata"."age_rating" IS NULL AND "series_metadata"."age_rating" IS NOT NULL AND "series_metadata"."age_rating" <= 18) OR "#
				+ r#"("media_metadata"."age_rating" IS NOT NULL AND "media_metadata"."age_rating" <= 18)"#,
		);
	}

	#[test]
	fn test_age_restriction_filter_no_restrict_on_unset() {
		let filter = get_age_restriction_filter(18, false);
		assert_eq!(
			condition_to_string(&filter),
			r#"SELECT  WHERE "#.to_string()
				+ r#"(("media_metadata"."id" IS NULL OR "media_metadata"."age_rating" IS NULL) AND "#
				+ r#"("series_metadata"."series_id" IS NULL OR ("series_metadata"."series_id" IS NOT NULL AND "series_metadata"."age_rating" IS NOT NULL AND "series_metadata"."age_rating" <= 18) OR "#
				+ r#"("series_metadata"."series_id" IS NOT NULL AND "series_metadata"."age_rating" IS NULL))) OR "#
				+ r#"("media_metadata"."id" IS NOT NULL AND ("media_metadata"."age_rating" IS NOT NULL) + ("media_metadata"."age_rating" <= 18))"#
		);
	}

	#[test]
	fn test_find_for_user() {
		let user = get_default_user();
		let select = Entity::find_for_user(&user);
		let stmt_str = select_no_cols_to_string(select);
		assert_eq!(
            stmt_str,
            r#"SELECT  FROM "media" LEFT JOIN "media_metadata" ON "media"."id" = "media_metadata"."media_id" INNER JOIN "series" ON "media"."series_id" = "series"."id" LEFT JOIN "series_metadata" ON "series_metadata"."series_id" = "series"."id" "#.to_string() +
            r#"WHERE "series"."library_id" NOT IN (SELECT "library_id" FROM "library_exclusions" WHERE "library_exclusions"."user_id" = '42')"#
        );
	}

	#[test]
	fn test_find_for_user_age_restrict() {
		let mut user = get_default_user();
		user.age_restriction = Some(age_restriction::Model {
			id: 1,
			age: 18,
			restrict_on_unset: true,
			user_id: user.id.clone(),
		});
		let select = Entity::find_for_user(&user);
		let stmt_str = select_no_cols_to_string(select);
		assert_eq!(
            stmt_str,
            r#"SELECT  FROM "media" LEFT JOIN "media_metadata" ON "media"."id" = "media_metadata"."media_id" INNER JOIN "series" ON "media"."series_id" = "series"."id" LEFT JOIN "series_metadata" ON "series_metadata"."series_id" = "series"."id" "#.to_string() +
            r#"WHERE "series"."library_id" NOT IN (SELECT "library_id" FROM "library_exclusions" WHERE "library_exclusions"."user_id" = '42')"# +
            r#" AND (("media_metadata"."age_rating" IS NULL AND "series_metadata"."age_rating" IS NOT NULL AND "series_metadata"."age_rating" <= 18) OR ("media_metadata"."age_rating" IS NOT NULL AND "media_metadata"."age_rating" <= 18))"#
        );
	}

	#[test]
	fn test_find_media_ids_for_user() {
		let user = get_default_user();
		let select = Entity::find_media_ids_for_user("123".to_string(), &user);
		let stmt_str = select_no_cols_to_string(select);
		assert_eq!(
            stmt_str,
            r#"SELECT  FROM "media" LEFT JOIN "media_metadata" ON "media"."id" = "media_metadata"."media_id" INNER JOIN "series" ON "media"."series_id" = "series"."id" LEFT JOIN "series_metadata" ON "series_metadata"."series_id" = "series"."id" "#.to_string() +
            r#"WHERE "series"."library_id" NOT IN (SELECT "library_id" FROM "library_exclusions" WHERE "library_exclusions"."user_id" = '42') AND "media"."id" = '123'"#
        );
	}

	#[test]
	fn test_find_for_series_id() {
		let user = get_default_user();
		let select = Entity::find_for_series_id(&user, "123".to_string());
		let stmt_str = select_no_cols_to_string(select);
		assert_eq!(
			stmt_str,
			r#"SELECT  FROM "media" LEFT JOIN "media_metadata" ON "media"."id" = "media_metadata"."media_id" INNER JOIN "series" ON "media"."series_id" = "series"."id" LEFT JOIN "series_metadata" ON "series_metadata"."series_id" = "series"."id" "#.to_string() +
			r#"WHERE "series"."library_id" NOT IN (SELECT "library_id" FROM "library_exclusions" WHERE "library_exclusions"."user_id" = '42') AND "series"."id" = '123'"#
		);
	}

	#[test]
	fn test_metadata_find_for_user() {
		let user = get_default_user();
		let select = ModelWithMetadata::find_for_user(&user);
		let stmt_str = select_no_cols_to_string(select);
		assert_eq!(
            stmt_str,
            r#"SELECT  FROM "media" LEFT JOIN "media_metadata" ON "media"."id" = "media_metadata"."media_id" INNER JOIN "series" ON "media"."series_id" = "series"."id" LEFT JOIN "series_metadata" ON "series_metadata"."series_id" = "series"."id" "#.to_string() +
            r#"WHERE "series"."library_id" NOT IN (SELECT "library_id" FROM "library_exclusions" WHERE "library_exclusions"."user_id" = '42')"#
            );
	}

	#[test]
	fn test_metadata_by_id_find_for_users() {
		let user = get_default_user();
		let select = ModelWithMetadata::find_by_id_for_user("123".to_string(), &user);
		let stmt_str = select_no_cols_to_string(select);
		assert_eq!(
            stmt_str,
            r#"SELECT  FROM "media" LEFT JOIN "media_metadata" ON "media"."id" = "media_metadata"."media_id" INNER JOIN "series" ON "media"."series_id" = "series"."id" LEFT JOIN "series_metadata" ON "series_metadata"."series_id" = "series"."id" "#.to_string() +
            r#"WHERE "media"."id" = '123' AND "series"."library_id" NOT IN (SELECT "library_id" FROM "library_exclusions" WHERE "library_exclusions"."user_id" = '42')"#
            );
	}
}

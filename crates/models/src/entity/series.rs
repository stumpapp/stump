use async_graphql::SimpleObject;
use chrono::Utc;
use filter_gen::Ordering;
use sea_orm::{
	entity::prelude::*, prelude::async_trait::async_trait, sea_query::Query, ActiveValue,
	Condition, FromQueryResult, Linked, QueryOrder, QuerySelect, QueryTrait,
};

use crate::{
	prefixer::{parse_query_to_model, parse_query_to_model_optional, Prefixer},
	shared::{
		enums::FileStatus,
		ordering::{OrderBy, OrderDirection},
	},
};

use super::{library_exclusion, series_metadata, user::AuthUser};

// TODO: Properly support soft deletion

#[derive(Clone, Debug, PartialEq, DeriveEntityModel, Eq, SimpleObject, Ordering)]
#[graphql(name = "SeriesModel")]
#[sea_orm(table_name = "series")]
pub struct Model {
	#[sea_orm(primary_key, auto_increment = false, column_type = "Text")]
	pub id: String,
	#[sea_orm(column_type = "Text")]
	pub name: String,
	#[sea_orm(column_type = "Text", nullable)]
	pub description: Option<String>,
	#[sea_orm(column_type = "custom(\"DATETIME\")")]
	pub created_at: DateTimeWithTimeZone,
	#[sea_orm(column_type = "custom(\"DATETIME\")", nullable)]
	pub updated_at: Option<DateTimeWithTimeZone>,
	#[sea_orm(column_type = "custom(\"DATETIME\")", nullable)]
	pub deleted_at: Option<DateTimeWithTimeZone>,
	#[sea_orm(column_type = "Text")]
	pub path: String,
	#[sea_orm(column_type = "Text")]
	pub status: FileStatus,
	#[sea_orm(column_type = "Text", nullable)]
	pub library_id: Option<String>,
}

pub fn get_age_restriction_filter(min_age: i32, restrict_on_unset: bool) -> Condition {
	if restrict_on_unset {
		Condition::all()
			.add(series_metadata::Column::AgeRating.is_not_null())
			.add(series_metadata::Column::AgeRating.lte(min_age))
	} else {
		Condition::any()
			.add(series_metadata::Column::AgeRating.is_null())
			.add(series_metadata::Column::AgeRating.lte(min_age))
	}
}

impl Entity {
	// TODO: This conditional join with metadata means the caller might not be able to
	// know if they should join
	pub fn find_for_user(user: &AuthUser) -> Select<Entity> {
		let age_restriction_filter =
			user.age_restriction.as_ref().map(|age_restriction| {
				get_age_restriction_filter(
					age_restriction.age,
					age_restriction.restrict_on_unset,
				)
			});

		Entity::find()
			.filter(Column::DeletedAt.is_null())
			.filter(Column::LibraryId.not_in_subquery(
				library_exclusion::Entity::library_hidden_to_user_query(user),
			))
			.apply_if(age_restriction_filter, |query, filter| {
				query.left_join(series_metadata::Entity).filter(filter)
			})
	}

	pub fn find_series_ident_for_user_and_id(
		user: &AuthUser,
		id: String,
	) -> Select<Self> {
		Self::find_for_user(user)
			.select_only()
			.columns(vec![Column::Id, Column::Path])
			.filter(Column::Id.eq(id))
	}
}

#[derive(FromQueryResult)]
pub struct SeriesIdentSelect {
	pub id: String,
	pub path: String,
}

impl SeriesIdentSelect {
	pub fn columns() -> Vec<Column> {
		vec![Column::Id, Column::Path]
	}
}

#[derive(Debug, FromQueryResult)]
pub struct SeriesNameCmpSelect {
	pub name: String,
}

#[derive(Debug, FromQueryResult)]
pub struct SeriesCreatedAtCmpSelect {
	pub created_at: DateTimeWithTimeZone,
}

pub struct ModelWithMetadata {
	pub series: Model,
	pub metadata: Option<series_metadata::Model>,
}

impl FromQueryResult for ModelWithMetadata {
	fn from_query_result(
		res: &sea_orm::QueryResult,
		_pre: &str,
	) -> Result<Self, sea_orm::DbErr> {
		let series = parse_query_to_model::<Model, Entity>(res)?;
		let metadata = parse_query_to_model_optional::<
			series_metadata::Model,
			series_metadata::Entity,
		>(res)?;
		Ok(Self { series, metadata })
	}
}

impl ModelWithMetadata {
	pub fn find() -> Select<Entity> {
		Prefixer::new(Entity::find().select_only())
			.add_columns(Entity)
			.add_columns(series_metadata::Entity)
			.selector
			.left_join(series_metadata::Entity)
	}

	pub fn find_by_id(id: String) -> Select<Entity> {
		Prefixer::new(Entity::find_by_id(id).select_only())
			.add_columns(Entity)
			.add_columns(series_metadata::Entity)
			.selector
			.left_join(series_metadata::Entity)
	}

	pub fn find_for_user(user: &AuthUser) -> Select<Entity> {
		let select = ModelWithMetadata::find();
		apply_age_restriction_filter(user, apply_hidden_library_filter(user, select))
	}

	pub fn find_by_id_for_user(id: String, user: &AuthUser) -> Select<Entity> {
		let select = ModelWithMetadata::find_by_id(id);
		apply_age_restriction_filter(user, apply_hidden_library_filter(user, select))
	}
}

fn apply_hidden_library_filter(
	user: &AuthUser,
	select: Select<Entity>,
) -> Select<Entity> {
	select
		.filter(
			Column::LibraryId.not_in_subquery(
				Query::select()
					.column(library_exclusion::Column::LibraryId)
					.from(library_exclusion::Entity)
					.and_where(library_exclusion::Column::UserId.eq(user.id.clone()))
					.to_owned(),
			),
		)
		.to_owned()
}

fn apply_age_restriction_filter(
	user: &AuthUser,
	select: Select<Entity>,
) -> Select<Entity> {
	let age_restriction_filter = user.age_restriction.as_ref().map(|age_restriction| {
		get_age_restriction_filter(age_restriction.age, age_restriction.restrict_on_unset)
	});
	select
		.apply_if(age_restriction_filter, |query, filter| query.filter(filter))
		.to_owned()
}

#[derive(Copy, Clone, Debug, EnumIter, DeriveRelation)]
pub enum Relation {
	#[sea_orm(
		belongs_to = "super::library::Entity",
		from = "Column::LibraryId",
		to = "super::library::Column::Id",
		on_update = "Cascade",
		on_delete = "Cascade"
	)]
	Library,
	#[sea_orm(has_many = "super::media::Entity")]
	Media,
	#[sea_orm(has_one = "super::series_metadata::Entity")]
	SeriesMetadata,
	#[sea_orm(has_many = "super::series_tag::Entity")]
	Tags,
}

impl Related<super::library::Entity> for Entity {
	fn to() -> RelationDef {
		Relation::Library.def()
	}
}

impl Related<super::media::Entity> for Entity {
	fn to() -> RelationDef {
		Relation::Media.def()
	}
}

impl Related<super::series_metadata::Entity> for Entity {
	fn to() -> RelationDef {
		Relation::SeriesMetadata.def()
	}
}

impl Linked for Entity {
	type FromEntity = super::media::Entity;

	type ToEntity = super::library::Entity;

	fn link(&self) -> Vec<RelationDef> {
		vec![Relation::Media.def().rev(), Relation::Library.def()]
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
	use crate::entity::age_restriction;
	use crate::tests::common::*;
	use pretty_assertions::assert_eq;

	#[test]
	fn find_for_user_no_age_restriction() {
		let user = get_default_user();
		let select = Entity::find_for_user(&user);
		let stmt_str = select_no_cols_to_string(select);
		assert_eq!(
			stmt_str,
			r#"SELECT  FROM "series" WHERE "series"."library_id" NOT IN (SELECT "library_id" FROM "library_exclusions" WHERE "library_exclusions"."user_id" = '42')"#
		);
	}

	#[test]
	fn find_for_user_age_restriction() {
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
			r#"SELECT  FROM "series" LEFT JOIN "series_metadata" ON "series"."id" = "series_metadata"."series_id" WHERE "series"."library_id" NOT IN (SELECT "library_id" FROM "library_exclusions" WHERE "library_exclusions"."user_id" = '42') AND "series_metadata"."age_rating" IS NOT NULL AND "series_metadata"."age_rating" <= 18"#
		);
	}

	#[test]
	fn test_age_restriction_filter() {
		let filter = get_age_restriction_filter(18, true);
		assert_eq!(
			condition_to_string(&filter),
			r#"SELECT  WHERE "series_metadata"."age_rating" IS NOT NULL AND "series_metadata"."age_rating" <= 18"#
		);

		let filter = get_age_restriction_filter(18, false);
		assert_eq!(
			condition_to_string(&filter),
			r#"SELECT  WHERE "series_metadata"."age_rating" IS NULL OR "series_metadata"."age_rating" <= 18"#
		);
	}

	#[test]
	fn test_find_series_ident_for_user_and_id() {
		let user = get_default_user();

		let select = Entity::find_series_ident_for_user_and_id(&user, "123".to_string());
		let stmt_str = select_no_cols_to_string(select);
		assert_eq!(
			stmt_str,
			r#"SELECT  FROM "series" WHERE "series"."library_id" NOT IN (SELECT "library_id" FROM "library_exclusions" WHERE "library_exclusions"."user_id" = '42') AND "series"."id" = '123'"#.to_string()
		);
	}

	#[test]
	fn test_find_media_with_metadata() {
		let user = get_default_user();
		let select = ModelWithMetadata::find_for_user(&user);
		let stmt_str = select_no_cols_to_string(select);
		assert_eq!(
			stmt_str,
			r#"SELECT  FROM "series" LEFT JOIN "series_metadata" ON "series"."id" = "series_metadata"."series_id" WHERE "series"."library_id" NOT IN (SELECT "library_id" FROM "library_exclusions" WHERE "library_exclusions"."user_id" = '42')"#
		);
	}

	#[test]
	fn test_find_media_with_metadata_for_id() {
		let user = get_default_user();
		let select = ModelWithMetadata::find_by_id_for_user("123".to_string(), &user);
		let stmt_str = select_no_cols_to_string(select);
		assert_eq!(
            stmt_str,
            r#"SELECT  FROM "series" LEFT JOIN "series_metadata" ON "series"."id" = "series_metadata"."series_id" WHERE "series"."id" = '123' AND "series"."library_id" NOT IN (SELECT "library_id" FROM "library_exclusions" WHERE "library_exclusions"."user_id" = '42')"#.to_string()
        );
	}
}

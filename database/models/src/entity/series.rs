use async_graphql::SimpleObject;
use sea_orm::{
	entity::prelude::*, sea_query::Query, Condition, FromQueryResult, QuerySelect,
	QueryTrait,
};

use crate::prefixer::{parse_query_to_model, parse_query_to_model_optional, Prefixer};

use super::{library_hidden_to_user, series_metadata, user::AuthUser};

#[derive(Clone, Debug, PartialEq, DeriveEntityModel, Eq, SimpleObject)]
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
	pub updated_at: DateTimeWithTimeZone,
	#[sea_orm(column_type = "custom(\"DATETIME\")")]
	pub created_at: DateTimeWithTimeZone,
	#[sea_orm(column_type = "Text")]
	pub path: String,
	#[sea_orm(column_type = "Text")]
	pub status: String,
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

#[derive(FromQueryResult)]
pub struct SeriesIdentSelect {
	pub id: String,
	pub path: String,
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
		let age_restriction_filter =
			user.age_restriction.as_ref().map(|age_restriction| {
				get_age_restriction_filter(
					age_restriction.age,
					age_restriction.restrict_on_unset,
				)
			});

		ModelWithMetadata::find()
			.filter(
				Column::LibraryId.not_in_subquery(
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
			.filter(
				Column::LibraryId.not_in_subquery(
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

impl ActiveModelBehavior for ActiveModel {}

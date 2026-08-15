use async_graphql::{InputObject, InputType, OneofObject};
use filter_gen::IntoFilter;
use models::shared::enums::{FileStatus, LibraryType, ReadingStatus};
use sea_orm::{
	prelude::DateTimeWithTimeZone,
	sea_query::{ConditionExpression, Expr as QExpr, Func},
	Condition, Value,
};
use serde::{Deserialize, Serialize};

pub mod keyword;
pub mod library;
pub mod log;
pub mod media;
pub mod media_metadata;
pub mod series;
pub mod series_metadata;

use keyword::{like_contains, like_ends_with, like_starts_with};

// TODO: This probably needs a rewrite to make it more compatible with async-graphql. The big issue is generics
// with input objects. Look at and yoink from seaography for how they are doing things

// Note: See https://github.com/serde-rs/json/issues/501

// NOTE: I originally went for IntoCondition, but that is a trait for sea-query and
// I wanted to avoid conflicts in the naming
pub trait IntoFilter {
	fn into_filter(self) -> sea_orm::Condition;
}

#[derive(OneofObject, Clone, Debug, Serialize, Deserialize)]
#[graphql(concrete(name = "FieldFilterString", params(String)))]
#[graphql(concrete(name = "FieldFilterFileStatus", params(FileStatus)))]
#[serde(rename_all = "camelCase")]
pub enum StringLikeFilter<T>
where
	T: InputType,
{
	Eq(T),
	Neq(T),
	AnyOf(Vec<T>),
	NoneOf(Vec<T>),
	Like(T),
	LikeAnyOf(Vec<T>),
	LikeNoneOf(Vec<T>),
	Contains(T),
	Excludes(T),
	StartsWith(T),
	EndsWith(T),
}

pub(crate) fn apply_string_filter<C, T>(
	column: C,
	filter: StringLikeFilter<T>,
) -> Condition
where
	C: sea_orm::ColumnTrait + Copy,
	T: InputType + Into<Value> + Into<String>,
{
	match filter {
		StringLikeFilter::Eq(value) => Condition::all().add(column.eq(value)),
		StringLikeFilter::Neq(value) => Condition::all().add(column.ne(value)),
		StringLikeFilter::AnyOf(values) => Condition::all().add(column.is_in(values)),
		StringLikeFilter::NoneOf(values) => {
			Condition::all().add(column.is_not_in(values))
		},
		// FIXME: a bunch of these string filters have different case sensitivity depending on sqlite vs pgsql,
		// so to align them a bit i just lowercased the column and the value for all of them. honestly
		// not ideal, i'd rather use the dedicated fns for each, but for now leaving
		// like this
		StringLikeFilter::Like(value) => {
			let v: String = value.into();
			Condition::all().add(
				QExpr::expr(Func::lower(QExpr::col(column.as_column_ref())))
					.like(format!("%{}%", v.to_lowercase())),
			)
		},
		StringLikeFilter::Contains(value) => {
			let v: String = value.into();
			Condition::all().add(
				QExpr::expr(Func::lower(QExpr::col(column.as_column_ref())))
					.like(like_contains(&v)),
			)
		},
		StringLikeFilter::Excludes(value) => {
			let v: String = value.into();
			Condition::all().add(
				QExpr::expr(Func::lower(QExpr::col(column.as_column_ref())))
					.not_like(like_contains(&v)),
			)
		},
		StringLikeFilter::StartsWith(value) => {
			let v: String = value.into();
			Condition::all().add(
				QExpr::expr(Func::lower(QExpr::col(column.as_column_ref())))
					.like(like_starts_with(&v)),
			)
		},
		StringLikeFilter::EndsWith(value) => {
			let v: String = value.into();
			Condition::all().add(
				QExpr::expr(Func::lower(QExpr::col(column.as_column_ref())))
					.like(like_ends_with(&v)),
			)
		},
		StringLikeFilter::LikeAnyOf(values) => {
			values.into_iter().fold(Condition::any(), |acc, value| {
				let v: String = value.into();
				acc.add(
					QExpr::expr(Func::lower(QExpr::col(column.as_column_ref())))
						.like(like_contains(&v)),
				)
			})
		},
		StringLikeFilter::LikeNoneOf(values) => values
			.into_iter()
			.fold(Condition::any(), |acc, value| {
				let v: String = value.into();
				acc.add(
					QExpr::expr(Func::lower(QExpr::col(column.as_column_ref())))
						.like(like_contains(&v)),
				)
			})
			.not(),
	}
}

#[derive(InputObject, Clone, Debug, Serialize, Deserialize)]
#[graphql(concrete(name = "NumericRangeF32", params(f32)))]
#[graphql(concrete(name = "NumericRangeI32", params(i32)))]
#[graphql(concrete(name = "NumericRangeI64", params(i64)))]
#[graphql(concrete(name = "NumericRangeU32", params(u32)))]
#[graphql(concrete(name = "NumericRangeU64", params(u64)))]
#[graphql(concrete(name = "NumericRangeDateTime", params(DateTimeWithTimeZone)))]
#[serde(rename_all = "camelCase")]
pub struct NumericRange<T>
where
	T: InputType,
{
	pub from: T,
	pub to: T,
	pub inclusive: bool,
}

#[derive(OneofObject, Clone, Debug, Serialize, Deserialize)]
#[graphql(concrete(name = "NumericFilterF32", params(f32)))]
#[graphql(concrete(name = "NumericFilterI32", params(i32)))]
#[graphql(concrete(name = "NumericFilterI64", params(i64)))]
#[graphql(concrete(name = "NumericFilterU32", params(u32)))]
#[graphql(concrete(name = "NumericFilterU64", params(u64)))]
#[graphql(concrete(name = "NumericFilterDateTime", params(DateTimeWithTimeZone)))]
#[serde(rename_all = "camelCase")]
pub enum NumericFilter<T>
where
	T: InputType,
	NumericRange<T>: InputType,
{
	Eq(T),
	Neq(T),
	AnyOf(Vec<T>),
	NoneOf(Vec<T>),
	Gt(T),
	Gte(T),
	Lt(T),
	Lte(T),
	Range(NumericRange<T>),
}

pub(crate) fn apply_numeric_filter<C, T>(
	column: C,
	filter: NumericFilter<T>,
) -> impl Into<ConditionExpression>
where
	C: sea_orm::ColumnTrait,
	T: InputType + Into<Value>,
	NumericRange<T>: InputType,
{
	match filter {
		NumericFilter::Eq(value) => column.eq(value),
		NumericFilter::Neq(value) => column.ne(value),
		NumericFilter::AnyOf(values) => column.is_in(values),
		NumericFilter::NoneOf(values) => column.is_not_in(values),
		NumericFilter::Gt(value) => column.gt(value),
		NumericFilter::Gte(value) => column.gte(value),
		NumericFilter::Lt(value) => column.lt(value),
		NumericFilter::Lte(value) => column.lte(value),
		NumericFilter::Range(range) => {
			if range.inclusive {
				column.gte(range.from).and(column.lte(range.to))
			} else {
				column.gt(range.from).and(column.lt(range.to))
			}
		},
	}
}

#[derive(OneofObject, Clone, Debug, Serialize, Deserialize)]
#[graphql(concrete(name = "ComputedFilterReadingStatus", params(ReadingStatus)))]
#[graphql(concrete(name = "ComputedFilterLibraryType", params(LibraryType)))]
#[serde(rename_all = "camelCase")]
pub enum ConceptualFilter<T>
where
	T: InputType,
{
	Is(T),
	IsNot(T),
	IsAnyOf(Vec<T>),
	IsNoneOf(Vec<T>),
}

#[cfg(test)]
mod tests {
	use super::*;
	use models::entity::media;
	use pretty_assertions::assert_eq;
	use sea_orm::{prelude::*, sea_query::SqliteQueryBuilder, QuerySelect, QueryTrait};

	#[test]
	fn test_string_like_any_of() {
		let filter =
			StringLikeFilter::LikeAnyOf(vec!["test".to_string(), "example".to_string()]);
		let condition = apply_string_filter(media::Column::Name, filter);
		let query = media::Entity::find().filter(condition);
		let sql = query
			.select_only()
			.into_query()
			.to_string(SqliteQueryBuilder);

		assert_eq!(
			sql,
			r#"SELECT  FROM "media" WHERE LOWER("media"."name") LIKE '%test%' ESCAPE '\' OR LOWER("media"."name") LIKE '%example%' ESCAPE '\'"#
		);
	}

	#[test]
	fn test_string_like_none_of() {
		let filter =
			StringLikeFilter::LikeNoneOf(vec!["test".to_string(), "example".to_string()]);
		let condition = apply_string_filter(media::Column::Name, filter);
		let query = media::Entity::find().filter(condition);
		let sql = query
			.select_only()
			.into_query()
			.to_string(SqliteQueryBuilder);

		assert_eq!(
			sql,
			r#"SELECT  FROM "media" WHERE NOT (LOWER("media"."name") LIKE '%test%' ESCAPE '\' OR LOWER("media"."name") LIKE '%example%' ESCAPE '\')"#
		);
	}

	#[test]
	fn test_contains_escapes_wildcards_in_the_pattern() {
		let sql = media::Entity::find()
			.filter(apply_string_filter(
				media::Column::Name,
				StringLikeFilter::Contains("50%".to_string()),
			))
			.select_only()
			.into_query()
			.to_string(SqliteQueryBuilder);

		assert_eq!(
			sql,
			r#"SELECT  FROM "media" WHERE LOWER("media"."name") LIKE '%50\%%' ESCAPE '\'"#
		);
	}

	#[test]
	fn test_starts_and_ends_with_escape_wildcards() {
		let starts = media::Entity::find()
			.filter(apply_string_filter(
				media::Column::Name,
				StringLikeFilter::StartsWith("file_".to_string()),
			))
			.select_only()
			.into_query()
			.to_string(SqliteQueryBuilder);
		assert_eq!(
			starts,
			r#"SELECT  FROM "media" WHERE LOWER("media"."name") LIKE 'file\_%' ESCAPE '\'"#
		);

		let ends = media::Entity::find()
			.filter(apply_string_filter(
				media::Column::Name,
				StringLikeFilter::EndsWith("_v1".to_string()),
			))
			.select_only()
			.into_query()
			.to_string(SqliteQueryBuilder);
		assert_eq!(
			ends,
			r#"SELECT  FROM "media" WHERE LOWER("media"."name") LIKE '%\_v1' ESCAPE '\'"#
		);
	}

	#[test]
	fn test_excludes_is_a_substring_negation() {
		let sql = media::Entity::find()
			.filter(apply_string_filter(
				media::Column::Name,
				StringLikeFilter::Excludes("annual".to_string()),
			))
			.select_only()
			.into_query()
			.to_string(SqliteQueryBuilder);

		assert_eq!(
			sql,
			r#"SELECT  FROM "media" WHERE LOWER("media"."name") NOT LIKE '%annual%' ESCAPE '\'"#
		);
	}
}

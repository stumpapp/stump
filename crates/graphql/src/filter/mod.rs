use async_graphql::{InputObject, InputType, OneofObject};
use filter_gen::IntoFilter;
use models::shared::enums::{FileStatus, ReadingStatus};
use sea_orm::{
	prelude::DateTimeWithTimeZone, sea_query::ConditionExpression, Condition, Value,
};
use serde::{Deserialize, Serialize};

pub mod library;
pub mod log;
pub mod media;
pub mod media_metadata;
pub mod series;
pub mod series_metadata;

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
	C: sea_orm::ColumnTrait,
	T: InputType + Into<Value> + Into<String>,
{
	match filter {
		StringLikeFilter::Eq(value) => Condition::all().add(column.eq(value)),
		StringLikeFilter::Neq(value) => Condition::all().add(column.ne(value)),
		StringLikeFilter::AnyOf(values) => Condition::all().add(column.is_in(values)),
		StringLikeFilter::NoneOf(values) => {
			Condition::all().add(column.is_not_in(values))
		},
		StringLikeFilter::Like(value) => Condition::all().add(column.like(value)),
		StringLikeFilter::Contains(value) => Condition::all().add(column.contains(value)),
		StringLikeFilter::Excludes(value) => Condition::all().add(column.not_like(value)),
		StringLikeFilter::StartsWith(value) => {
			Condition::all().add(column.starts_with(value))
		},
		StringLikeFilter::EndsWith(value) => {
			Condition::all().add(column.ends_with(value))
		},
		StringLikeFilter::LikeAnyOf(values) => {
			values.into_iter().fold(Condition::any(), |acc, value| {
				acc.add(column.contains(value))
			})
		},
		StringLikeFilter::LikeNoneOf(values) => values
			.into_iter()
			.fold(Condition::any(), |acc, value| {
				acc.add(column.contains(value))
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
			r#"SELECT  FROM "media" WHERE "media"."name" LIKE '%test%' OR "media"."name" LIKE '%example%'"#
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
			r#"SELECT  FROM "media" WHERE NOT ("media"."name" LIKE '%test%' OR "media"."name" LIKE '%example%')"#
		);
	}
}

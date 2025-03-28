/*
I want to totally revamp the filtering system. I'll maintain the two concepts of "basic" and "smart" filters, but I want
to construct them using the same base structure. I envision:

{
  media(filter: { metadata: { title: { contains: "test" } }, name: { eq: "test" } }) {
	nodes {
	  name
	  metadata {
		title
	  }
	}
	pageInfo {...}
  }
}

{
  media(
	smartFilter: { _or: [
	  { metadata: { title: { contains: "biz" } } },
	  { metadata: { genre: { contains: "baz" } } }
	] }
) {
	nodes {
	  name
	  metadata {
		title
	  }
	}
	pageInfo {...}
  }
}

I guess an alternative might be allowing both as variants of filter:

pub enum MediaFilter {
	Name { name: String },
}

pub enum Filter<T> {
	And { _and: Vec<T> },
	Or { _or: Vec<T> },
	Not { _not: Vec<T> },
	Basic(HashMap<String, FieldFilter<T>>) // or something, dynamic keys doesn't really work
}

pub enum FieldFilter<T> {
	Equals { eq: T },
	Not { neq: T },
	Any { any: Vec<T> },
	None { none: Vec<T> },
	StringFieldFilter(StringFilter<T>),
	NumericFieldFilter(NumericFilter<T>),
}

So e.g. Filter<MediaFilter> would parse either:

1. { name: { eq: "test" } }
2. { _or: [ { name: { eq: "test" } }, { name: { eq: "test2" } } ] }

This will output a Condition tree to pass to sea-orm, so it can also be merged with access control. For example:

{ _or: [ { name: { eq: "test" } }, { name: { eq: "test2" } } ] } -> age_restrion on user is 12

Condition::all()
	.add(
		Condition::any()
			.add(Condition::all().add(media::Column::Name.eq("test")))
			.add(Condition::all().add(media::Column::Name.eq("test2")))
	) <- This is from the filter
	.add(
		Condition::any()
			.add(...)
			.add(...)
	) <- This is from the access control imposed by Stump
*/

use async_graphql::Enum;
use filter_gen::IntoFilter;
use sea_orm::prelude::*;
use serde::{Deserialize, Serialize};
use serde_with::skip_serializing_none;
use strum::{Display, EnumString};

// NOTE: I originally went for IntoCondition, but that is a trait for sea-query and
// I wanted to avoid conflicts in the naming
pub trait IntoFilter {
	fn into_filter(self) -> sea_orm::Condition;
}

#[derive(Debug, Default, Clone, Serialize, Deserialize)]
pub struct FilterInput {
	#[serde(default)]
	root_operator: FilterOperator,
}

#[derive(
	Debug,
	Default,
	Clone,
	Copy,
	PartialEq,
	Eq,
	Serialize,
	Deserialize,
	Enum,
	EnumString,
	Display,
)]
#[serde(rename_all = "SCREAMING_SNAKE_CASE")]
#[strum(serialize_all = "SCREAMING_SNAKE_CASE")]
pub enum FilterOperator {
	#[default]
	And,
	Or,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(untagged)]
pub enum FilterGroup<T> {
	And { _and: Vec<T> },
	Or { _or: Vec<T> },
	Not { _not: Vec<T> },
	// Basic(HashMap<String, FieldFilter<T>>), // or something, dynamic keys doesn't really work
}

#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(untagged)]
pub enum SmartFilterGroup<T> {
	And { _and: Vec<T> },
	Or { _or: Vec<T> },
	Not { _not: Vec<T> },
}

#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(untagged)]
pub enum FieldFilter<T> {
	Equals { eq: T },
	Not { neq: T },
	Any { any: Vec<T> },
	None { none: Vec<T> },
	StringFieldFilter(StringFilter<T>),
	NumericFieldFilter(NumericFilter<T>),
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub enum StringFilter<T> {
	Like { like: T },
	Contains { contains: T },
	Excludes { excludes: T },
	StartsWith { starts_with: T },
	EndsWith { ends_with: T },
}

#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(untagged)]
pub enum NumericFilter<T> {
	Gt { gt: T },
	Gte { gte: T },
	Lt { lt: T },
	Lte { lte: T },
	Range(NumericRange<T>),
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct NumericRange<T> {
	pub from: T,
	pub to: T,
	pub inclusive: bool,
}

#[skip_serializing_none]
#[derive(Debug, Clone, Default, Serialize, Deserialize, IntoFilter)]
pub struct TestFilter {
	#[field_column("models::entity::media::Column::Name")]
	pub name: Option<FieldFilter<String>>,
	#[field_column("models::entity::media::Column::Size")]
	pub size: Option<FieldFilter<i64>>,
	// #[field_column("models::entity::media::Column::Extension")]
	// pub extension: Option<FieldFilter<String>>,
	// #[field_column("models::entity::media::Column::CreatedAt")]
	// pub created_at: Option<FieldFilter<DateTimeWithTimeZone>>,
	// #[field_column("models::entity::media::Column::UpdatedAt")]
	// pub updated_at: Option<FieldFilter<DateTimeWithTimeZone>>,
	// #[field_column("models::entity::media::Column::Status")]
	// pub status: Option<FieldFilter<String>>,
	// #[field_column("models::entity::media::Column::Path")]
	// pub path: Option<FieldFilter<String>>,
	// #[field_column("models::entity::media::Column::Pages")]
	// pub pages: Option<FieldFilter<i32>>,
}

#[skip_serializing_none]
#[derive(Debug, Clone, Default, Serialize, Deserialize)]
pub struct MediaFilterInput {
	pub name: Option<FieldFilter<String>>,
	pub metadata: Option<MediaMetadataFilterInput>,

	pub _and: Option<Vec<MediaFilterInput>>,
	pub _not: Option<Vec<MediaFilterInput>>,
	pub _or: Option<Vec<MediaFilterInput>>,
}

#[skip_serializing_none]
#[derive(Debug, Clone, Default, Serialize, Deserialize)]
pub struct MediaMetadataFilterInput {
	pub title: Option<FieldFilter<String>>,
	pub series: Option<FieldFilter<String>>,

	pub _and: Option<Vec<MediaMetadataFilterInput>>,
	pub _not: Option<Vec<MediaMetadataFilterInput>>,
	pub _or: Option<Vec<MediaMetadataFilterInput>>,
}

#[cfg(test)]
mod tests {
	use super::*;
	use models::entity::*;
	use sea_orm::sea_query::IntoCondition;

	#[test]
	fn test_serialize_media_filter() {
		let filter = MediaFilterInput {
			name: Some(FieldFilter::Equals {
				eq: "test".to_string(),
			}),
			..Default::default()
		};

		let serialized = serde_json::to_string(&filter).unwrap();
		assert_eq!(serialized, r#"{"name":{"eq":"test"}}"#);
	}

	#[test]
	fn test_serialize_media_filter_with_metadata() {
		let filter = MediaFilterInput {
			name: Some(FieldFilter::Equals {
				eq: "test".to_string(),
			}),
			metadata: Some(MediaMetadataFilterInput {
				title: Some(FieldFilter::Equals {
					eq: "test".to_string(),
				}),
				series: Some(FieldFilter::Equals {
					eq: "theseries".to_string(),
				}),
				..Default::default()
			}),
			..Default::default()
		};

		let serialized = serde_json::to_string(&filter).unwrap();
		assert_eq!(
			serialized,
			r#"{"name":{"eq":"test"},"metadata":{"title":{"eq":"test"},"series":{"eq":"theseries"}}}"#
		);
	}

	#[test]
	fn test_serialize_media_filter_with_and() {
		let filter = MediaFilterInput {
			_and: Some(vec![
				MediaFilterInput {
					name: Some(FieldFilter::Equals {
						eq: "test".to_string(),
					}),
					..Default::default()
				},
				MediaFilterInput {
					name: Some(FieldFilter::Equals {
						eq: "test2".to_string(),
					}),
					..Default::default()
				},
			]),
			..Default::default()
		};

		let serialized = serde_json::to_string(&filter).unwrap();
		assert_eq!(
			serialized,
			r#"{"_and":[{"name":{"eq":"test"}},{"name":{"eq":"test2"}}]}"#
		);
	}

	#[test]
	fn test_serialize_media_filter_with_metadata_with_ands() {
		let filter = MediaFilterInput {
			name: Some(FieldFilter::Equals {
				eq: "test".to_string(),
			}),
			metadata: Some(MediaMetadataFilterInput {
				_and: Some(vec![
					MediaMetadataFilterInput {
						title: Some(FieldFilter::Equals {
							eq: "test".to_string(),
						}),
						..Default::default()
					},
					MediaMetadataFilterInput {
						series: Some(FieldFilter::Equals {
							eq: "theseries".to_string(),
						}),
						..Default::default()
					},
				]),
				..Default::default()
			}),
			..Default::default()
		};

		let serialized = serde_json::to_string(&filter).unwrap();
		assert_eq!(
			serialized,
			r#"{"name":{"eq":"test"},"metadata":{"_and":[{"title":{"eq":"test"}},{"series":{"eq":"theseries"}}]}}"#
		);
	}

	#[test]
	fn test_into_filter() {
		let condition = TestFilter {
			name: Some(FieldFilter::Equals {
				eq: "test".to_string(),
			}),
			..Default::default()
		}
		.into_filter();
		assert_eq!(
			condition,
			sea_orm::Condition::all().add(media::Column::Name.eq("test"))
		);

		let condition = TestFilter {
			name: Some(FieldFilter::Not {
				neq: "test".to_string(),
			}),
			..Default::default()
		}
		.into_filter();
		assert_eq!(
			condition,
			sea_orm::Condition::all().add(media::Column::Name.ne("test"))
		);

		let condition = TestFilter {
			name: Some(FieldFilter::Any {
				any: vec!["test".to_string(), "test2".to_string()],
			}),
			..Default::default()
		}
		.into_filter();
		assert_eq!(
			condition,
			sea_orm::Condition::all()
				.add(media::Column::Name.is_in(vec!["test", "test2"]))
		);

		let condition = TestFilter {
			name: Some(FieldFilter::None {
				none: vec!["test".to_string(), "test2".to_string()],
			}),
			..Default::default()
		}
		.into_filter();
		assert_eq!(
			condition,
			sea_orm::Condition::all()
				.add(media::Column::Name.is_not_in(vec!["test", "test2"]))
		);

		let condition = TestFilter {
			name: Some(FieldFilter::StringFieldFilter(StringFilter::Like {
				like: "test".to_string(),
			})),
			..Default::default()
		}
		.into_filter();
		assert_eq!(
			condition,
			sea_orm::Condition::all()
				.add(media::Column::Name.like(format!("%{}%", "test")))
		);

		let condition = TestFilter {
			name: Some(FieldFilter::StringFieldFilter(StringFilter::Contains {
				contains: "test".to_string(),
			})),
			..Default::default()
		}
		.into_filter();
		assert_eq!(
			condition,
			sea_orm::Condition::all().add(media::Column::Name.contains("test"))
		);

		let condition = TestFilter {
			name: Some(FieldFilter::StringFieldFilter(StringFilter::Excludes {
				excludes: "test".to_string(),
			})),
			..Default::default()
		}
		.into_filter();
		assert_eq!(
			condition,
			sea_orm::Condition::all()
				.add(media::Column::Name.not_like(format!("%{}%", "test")))
		);
	}
}

// #[generate_smart_filter]
// #[derive(Debug, Clone, PartialEq)]
// #[serde(untagged)]
// #[prisma_table("media")]
// pub enum MediaFilter {
// 	Name { name: String },
// 	Size { size: i64 },
// 	Extension { extension: String },
// 	CreatedAt { created_at: DateTime<FixedOffset> },
// 	UpdatedAt { updated_at: DateTime<FixedOffset> },
// 	Status { status: String },
// 	Path { path: String },
// 	Pages { pages: i32 },
// 	// Metadata { metadata: MediaMetadataSmartFilter },
// 	// Series { series: SeriesSmartFilter },
// }

// #[derive(Debug, Clone, PartialEq)]
// #[serde(untagged)]
// /// A filter for a single value, e.g. `name = "test"`
// pub enum Filter<T> {
// 	/// A simple equals filter, e.g. `name = "test"`
// 	Equals { equals: T },
// 	/// A simple not filter, e.g. `name != "test"`
// 	Not { not: T },
// 	/// A filter for a vector of values, e.g. `name in ["test", "test2"]`
// 	Any { any: Vec<T> },
// 	/// A filter for a vector of values, e.g. `name not in ["test", "test2"]`
// 	None { none: Vec<T> },
// 	/// A filter for a string value, e.g. `name contains "test"`
// 	StringFilter(StringFilter<T>),
// 	/// A filter for a numeric value, e.g. `year > 2000`
// 	NumericFilter(NumericFilter<T>),
// }

// #[derive(Debug, Clone, PartialEq)]
// #[serde(untagged)]
// pub enum StringFilter<T> {
// 	/// A filter for a string that matches a pattern, e.g. `name like "%test%"`
// 	Like { like: T },
// 	/// A filter for a string that contains a substring, e.g. `name contains "test"`. This should
// 	/// not be confused with an `in` filter. See [`Filter::Any`] for that.
// 	Contains { contains: T },
// 	/// A filter for a string that does not contain a substring, e.g. `name excludes "test"`. This
// 	/// should not be confused with a `not in` filter. See [`Filter::None`] for that.
// 	Excludes { excludes: T },
// 	/// A filter for a string that starts with a substring, e.g. `name starts_with "test"`
// 	StartsWith { starts_with: T },
// 	/// A filter for a string that ends with a substring, e.g. `name ends_with "test"`
// 	EndsWith { ends_with: T },
// }

// #[derive(Debug, Clone, PartialEq)]
// pub struct NumericRange<T> {
// 	pub from: T,
// 	pub to: T,
// 	#[serde(default)]
// 	pub inclusive: bool,
// }

// #[derive(Debug, Clone, PartialEq)]
// #[serde(untagged)]
// pub enum NumericFilter<T> {
// 	Gt { gt: T },
// 	Gte { gte: T },
// 	Lt { lt: T },
// 	Lte { lte: T },
// 	Range(NumericRange<T>),
// }

// /// A trait to convert an enum variant into a prisma order parameter
// pub trait IntoOrderBy {
// 	type OrderParam;
// 	/// Convert the enum variant into a prisma order parameter, e.g. `media::name::order(SortOrder::Asc)`
// 	fn into_order(self, dir: SortOrder) -> Self::OrderParam;
// }

// #[derive(Default, Debug, OrderByGen)]
// #[prisma(module = "media_metadata")]
// pub enum MediaMetadataOrderBy {
// 	#[default]
// 	Title,
// 	Series,
// 	Number,
// 	Volume,
// 	Summary,
// 	Notes,
// 	AgeRating,
// 	Genre,
// 	Year,
// 	Month,
// 	Day,
// 	Writers,
// 	Pencillers,
// 	Inkers,
// 	Colorists,
// 	Letterers,
// 	CoverArtists,
// 	Editors,
// 	Publisher,
// 	Links,
// 	Characters,
// 	Teams,
// }

// #[derive(Default, Debug, OrderByGen)]
// #[prisma(module = "media")]
// pub enum MediaOrderBy {
// 	#[default]
// 	Name,
// 	Size,
// 	Extension,
// 	CreatedAt,
// 	UpdatedAt,
// 	Status,
// 	Path,
// 	Pages,
// 	Metadata(Vec<MediaMetadataOrderBy>),
// 	ModifiedAt,
// }

// // #[derive(Debug, Deserialize, Serialize)]
// // enum SeriesAggregateOrderBy {
// // 	Media,
// // }

// #[derive(Default, Debug, OrderByGen)]
// #[prisma(module = "series")]
// pub enum SeriesOrderBy {
// 	#[default]
// 	Name,
// 	Description,
// 	UpdatedAt,
// 	CreatedAt,
// 	Path,
// 	Status,
// 	// _Count(SeriesAggregateOrderBy),
// }

// // #[derive(Debug, OrderByGen)]
// // #[prisma(module = "library")]
// // enum LibraryAggregateOrderBy {
// // 	Media,
// // 	Series,
// // }

// #[derive(Default, Debug, OrderByGen)]
// #[prisma(module = "library")]
// pub enum LibraryOrderBy {
// 	#[default]
// 	Name,
// 	Path,
// 	Status,
// 	UpdatedAt,
// 	CreatedAt,
// 	// _Count(LibraryAggregateOrderBy),
// }

// #[derive(Default, Debug, OrderByGen)]
// #[prisma(module = "job")]
// pub enum JobOrderBy {
// 	#[default]
// 	Name,
// 	Status,
// 	CreatedAt,
// 	CompletedAt,
// }

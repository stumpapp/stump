use std::{fmt::Display, str::FromStr};

use prisma_client_rust::{
	and,
	chrono::{DateTime, FixedOffset},
	not,
};
use serde::{Deserialize, Serialize};
use specta::Type;
use utoipa::ToSchema;

use crate::prisma::{library, media, media_metadata, series, series_metadata};
use smart_filter_gen::generate_smart_filter;

// TODO: This rough implementation is not very great. It is very verbose and not very ergonomic. It _technically_
// works, and while I don't think anyone using this feature will notice, from a DX/maintenance perspective, it needs
// to be refactored. The two big things IMO are:
//
// 1. Performance implications. This is mostly because the assumption for each `into_prisma` call is a single param,
//    which means for relation filters we will have an `is` call each time. I don't yet know how this actually affects
//    performance in real-world scenarios, but it's something to keep in mind.

#[derive(Debug, Clone, Serialize, Deserialize, PartialEq, ToSchema, Type)]
#[serde(untagged)]
/// A filter for a single value, e.g. `name = "test"`
pub enum Filter<T> {
	/// A simple equals filter, e.g. `name = "test"`
	Equals { equals: T },
	/// A simple not filter, e.g. `name != "test"`
	Not { not: T },
	/// A filter for a vector of values, e.g. `name in ["test", "test2"]`
	Any { any: Vec<T> },
	/// A filter for a vector of values, e.g. `name not in ["test", "test2"]`
	None { none: Vec<T> },
	/// A filter for a string value, e.g. `name contains "test"`
	StringFilter(StringFilter<T>),
	/// A filter for a numeric value, e.g. `year > 2000`
	NumericFilter(NumericFilter<T>),
}

#[derive(Debug, Clone, Serialize, Deserialize, PartialEq, Type)]
pub struct NumericRange<T> {
	pub from: T,
	pub to: T,
	#[serde(default)]
	pub inclusive: bool,
}

#[derive(Debug, Clone, Serialize, Deserialize, PartialEq, ToSchema, Type)]
#[serde(untagged)]
pub enum NumericFilter<T> {
	Gt { gt: T },
	Gte { gte: T },
	Lt { lt: T },
	Lte { lte: T },
	Range(NumericRange<T>),
}

#[derive(Debug, Clone, Serialize, Deserialize, PartialEq, ToSchema, Type)]
#[serde(untagged)]
pub enum StringFilter<T> {
	/// A filter for a string that contains a substring, e.g. `name contains "test"`. This should
	/// not be confused with an `in` filter. See [`Filter::Any`] for that.
	Contains { contains: T },
	/// A filter for a string that does not contain a substring, e.g. `name excludes "test"`. This
	/// should not be confused with a `not in` filter. See [`Filter::None`] for that.
	Excludes { excludes: T },
	/// A filter for a string that starts with a substring, e.g. `name starts_with "test"`
	StartsWith { starts_with: T },
	/// A filter for a string that ends with a substring, e.g. `name ends_with "test"`
	EndsWith { ends_with: T },
}

impl<T> Filter<T> {
	/// Convert self into a prisma where param
	pub fn into_params<WhereParam>(
		self,
		equals_fn: fn(T) -> WhereParam,
		vec_fn: fn(Vec<T>) -> WhereParam,
	) -> WhereParam
	where
		WhereParam: From<prisma_client_rust::Operator<WhereParam>>,
	{
		match self {
			Filter::Equals { equals } => equals_fn(equals),
			Filter::Not { not } => not![equals_fn(not)],
			Filter::Any { any } => vec_fn(any),
			Filter::None { none } => not![vec_fn(none)],
			_ => unreachable!("Invalid filter"),
		}
	}

	// TODO: I don't want to redefine this, consolidate it with the above if possible
	/// Convert self into a prisma where param, but with an optional value for the equals filter
	pub fn into_optional_params<WhereParam>(
		self,
		equals_fn: fn(Option<T>) -> WhereParam,
		vec_fn: fn(Vec<T>) -> WhereParam,
	) -> WhereParam
	where
		WhereParam: From<prisma_client_rust::Operator<WhereParam>>,
	{
		match self {
			Filter::Equals { equals } => equals_fn(Some(equals)),
			Filter::Not { not } => not![equals_fn(Some(not))],
			Filter::Any { any } => vec_fn(any),
			Filter::None { none } => not![vec_fn(none)],
			_ => unreachable!("Invalid filter"),
		}
	}

	pub fn into_string_params<WhereParam>(
		self,
		equals_fn: fn(T) -> WhereParam,
		contains_fn: fn(T) -> WhereParam,
		starts_with_fn: fn(T) -> WhereParam,
		ends_with_fn: fn(T) -> WhereParam,
		vec_fn: fn(Vec<T>) -> WhereParam,
	) -> WhereParam
	where
		WhereParam: From<prisma_client_rust::Operator<WhereParam>>,
	{
		match self {
			Filter::StringFilter(string_filter) => match string_filter {
				StringFilter::Contains { contains } => contains_fn(contains),
				StringFilter::Excludes { excludes } => not![contains_fn(excludes)],
				StringFilter::StartsWith { starts_with } => starts_with_fn(starts_with),
				StringFilter::EndsWith { ends_with } => ends_with_fn(ends_with),
			},
			_ => Self::into_params(self, equals_fn, vec_fn),
		}
	}

	pub fn into_optional_string_params<WhereParam>(
		self,
		equals_fn: fn(Option<T>) -> WhereParam,
		contains_fn: fn(T) -> WhereParam,
		starts_with_fn: fn(T) -> WhereParam,
		ends_with_fn: fn(T) -> WhereParam,
		vec_fn: fn(Vec<T>) -> WhereParam,
	) -> WhereParam
	where
		WhereParam: From<prisma_client_rust::Operator<WhereParam>>,
	{
		match self {
			Filter::StringFilter(string_filter) => match string_filter {
				StringFilter::Contains { contains } => contains_fn(contains),
				StringFilter::Excludes { excludes } => not![contains_fn(excludes)],
				StringFilter::StartsWith { starts_with } => starts_with_fn(starts_with),
				StringFilter::EndsWith { ends_with } => ends_with_fn(ends_with),
			},
			_ => Self::into_optional_params(self, equals_fn, vec_fn),
		}
	}

	pub fn into_numeric_params<WhereParam>(
		self,
		equals_fn: fn(T) -> WhereParam,
		gt_fn: fn(T) -> WhereParam,
		gte_fn: fn(T) -> WhereParam,
		lt_fn: fn(T) -> WhereParam,
		lte_fn: fn(T) -> WhereParam,
		vec_fn: fn(Vec<T>) -> WhereParam,
	) -> WhereParam
	where
		WhereParam: From<prisma_client_rust::Operator<WhereParam>>,
	{
		match self {
			Filter::NumericFilter(numeric_filter) => match numeric_filter {
				NumericFilter::Gt { gt } => gt_fn(gt),
				NumericFilter::Gte { gte } => gte_fn(gte),
				NumericFilter::Lt { lt } => lt_fn(lt),
				NumericFilter::Lte { lte } => lte_fn(lte),
				NumericFilter::Range(range) => {
					if range.inclusive {
						and![gte_fn(range.from), lte_fn(range.to)]
					} else {
						and![gt_fn(range.from), lt_fn(range.to)]
					}
				},
			},
			_ => Self::into_params(self, equals_fn, vec_fn),
		}
	}

	pub fn into_optional_numeric_params<WhereParam>(
		self,
		equals_fn: fn(Option<T>) -> WhereParam,
		gt_fn: fn(T) -> WhereParam,
		gte_fn: fn(T) -> WhereParam,
		lt_fn: fn(T) -> WhereParam,
		lte_fn: fn(T) -> WhereParam,
		vec_fn: fn(Vec<T>) -> WhereParam,
	) -> WhereParam
	where
		WhereParam: From<prisma_client_rust::Operator<WhereParam>>,
	{
		match self {
			Filter::NumericFilter(numeric_filter) => match numeric_filter {
				NumericFilter::Gt { gt } => gt_fn(gt),
				NumericFilter::Gte { gte } => gte_fn(gte),
				NumericFilter::Lt { lt } => lt_fn(lt),
				NumericFilter::Lte { lte } => lte_fn(lte),
				NumericFilter::Range(range) => {
					if range.inclusive {
						and![gte_fn(range.from), lte_fn(range.to)]
					} else {
						and![gt_fn(range.from), lt_fn(range.to)]
					}
				},
			},
			_ => Self::into_optional_params(self, equals_fn, vec_fn),
		}
	}
}

#[derive(Debug, Clone, Serialize, Deserialize, PartialEq, Type, ToSchema)]
#[serde(untagged)]
/// A list of filters that are being combined with a logical operator, e.g. `and` or `or`
pub enum FilterGroup<T> {
	And { and: Vec<T> },
	Or { or: Vec<T> },
	Not { not: Vec<T> },
}

impl FilterGroup<MediaSmartFilter> {
	/// Convert self into a prisma where param
	pub fn into_params(self) -> media::WhereParam {
		match self {
			FilterGroup::And { and } => prisma_client_rust::operator::and(
				and.into_iter().map(|f| f.into_params()).collect(),
			),
			FilterGroup::Or { or } => prisma_client_rust::operator::or(
				or.into_iter().map(|f| f.into_params()).collect(),
			),
			FilterGroup::Not { not } => prisma_client_rust::operator::not(
				not.into_iter().map(|f| f.into_params()).collect(),
			),
		}
	}
}

#[derive(Default, Debug, Clone, Serialize, Deserialize, Type, ToSchema)]
pub enum FilterJoin {
	#[default]
	#[serde(rename = "AND")]
	And,
	#[serde(rename = "OR")]
	Or,
}

impl FromStr for FilterJoin {
	type Err = String;

	fn from_str(s: &str) -> Result<Self, Self::Err> {
		match s.to_lowercase().as_str() {
			"and" => Ok(Self::And),
			"or" => Ok(Self::Or),
			_ => Err(format!("Invalid filter joiner: {s}")),
		}
	}
}

impl Display for FilterJoin {
	fn fmt(&self, f: &mut std::fmt::Formatter<'_>) -> std::fmt::Result {
		match self {
			Self::And => write!(f, "AND"),
			Self::Or => write!(f, "OR"),
		}
	}
}

impl From<&str> for FilterJoin {
	fn from(s: &str) -> Self {
		match s.to_lowercase().as_str() {
			"and" => Self::And,
			"or" => Self::Or,
			_ => Self::And,
		}
	}
}

#[derive(Debug, Clone, Serialize, Deserialize, Type, ToSchema)]
#[aliases(SmartFilterSchema = SmartFilter<MediaSmartFilter>)]
pub struct SmartFilter<T> {
	pub groups: Vec<FilterGroup<T>>,
}

#[generate_smart_filter]
#[derive(Debug, Clone, Serialize, Deserialize, PartialEq, Type, ToSchema)]
#[serde(untagged)]
#[prisma_table("library")]
pub enum LibrarySmartFilter {
	Id { id: String },
	Name { name: String },
	Path { path: String },
	CreatedAt { created_at: DateTime<FixedOffset> },
	UpdatedAt { updated_at: DateTime<FixedOffset> },
}

#[generate_smart_filter]
#[derive(Debug, Clone, Serialize, Deserialize, PartialEq, Type, ToSchema)]
#[serde(untagged)]
#[prisma_table("series_metadata")]
pub enum SeriesMetadataSmartFilter {
	#[is_optional]
	AgeRating {
		age_rating: i32,
	},
	MetaType {
		meta_type: String,
	},
	#[is_optional]
	Title {
		title: String,
	},
	#[is_optional]
	Summary {
		summary: String,
	},
	#[is_optional]
	Publisher {
		publisher: String,
	},
	#[is_optional]
	Imprint {
		imprint: String,
	},
	#[is_optional]
	ComicId {
		comicid: i32,
	},
	#[is_optional]
	BookType {
		booktype: String,
	},
	#[is_optional]
	Volume {
		volume: i32,
	},
	#[is_optional]
	Status {
		status: String,
	},
}

#[generate_smart_filter]
#[derive(Debug, Clone, Serialize, Deserialize, PartialEq, Type, ToSchema)]
#[serde(untagged)]
#[prisma_table("series")]
pub enum SeriesSmartFilter {
	Name { name: String },
	Path { path: String },

	Metadata { metadata: SeriesMetadataSmartFilter },
	Library { library: LibrarySmartFilter },
}

#[generate_smart_filter]
#[derive(Debug, Clone, Serialize, Deserialize, PartialEq, Type, ToSchema)]
#[serde(untagged)]
#[prisma_table("media_metadata")]
pub enum MediaMetadataSmartFilter {
	#[is_optional]
	Title { title: String },
	#[is_optional]
	Publisher { publisher: String },
	#[is_optional]
	Genre { genre: String },
	#[is_optional]
	Characters { characters: String },
	#[is_optional]
	Colorists { colorists: String },
	#[is_optional]
	Writers { writers: String },
	#[is_optional]
	Pencillers { pencillers: String },
	#[is_optional]
	Letterers { letterers: String },
	#[is_optional]
	Inkers { inkers: String },
	#[is_optional]
	Editors { editors: String },
	#[is_optional]
	AgeRating { age_rating: i32 },
	#[is_optional]
	Year { year: i32 },
	#[is_optional]
	Month { month: i32 },
	#[is_optional]
	Day { day: i32 },
}

#[generate_smart_filter]
#[derive(Debug, Clone, Serialize, Deserialize, PartialEq, Type, ToSchema)]
#[serde(untagged)]
#[prisma_table("media")]
pub enum MediaSmartFilter {
	Name { name: String },
	Size { size: i64 },
	Extension { extension: String },
	CreatedAt { created_at: DateTime<FixedOffset> },
	UpdatedAt { updated_at: DateTime<FixedOffset> },
	Status { status: String },
	Path { path: String },
	Pages { pages: i32 },
	Metadata { metadata: MediaMetadataSmartFilter },
	Series { series: SeriesSmartFilter },
}

#[cfg(test)]
mod tests {
	use prisma_client_rust::chrono::Utc;
	use prisma_client_rust::or;

	use super::*;
	use crate::prisma::PrismaClient;

	#[test]
	fn it_serializes_correctly() {
		let filter: FilterGroup<MediaSmartFilter> = FilterGroup::And {
			and: vec![
				MediaSmartFilter::Name {
					name: Filter::StringFilter(StringFilter::Contains {
						contains: "test".to_string(),
					}),
				},
				MediaSmartFilter::Series {
					series: SeriesSmartFilter::Name {
						name: Filter::Not {
							not: "test".to_string(),
						},
					},
				},
				MediaSmartFilter::Series {
					series: SeriesSmartFilter::Library {
						library: LibrarySmartFilter::Name {
							name: Filter::StringFilter(StringFilter::Excludes {
								excludes: "test".to_string(),
							}),
						},
					},
				},
			],
		};

		let json = serde_json::to_string(&filter).unwrap();

		assert_eq!(
			json,
			r#"{"and":[{"name":{"contains":"test"}},{"series":{"name":{"not":"test"}}},{"series":{"library":{"name":{"excludes":"test"}}}}]}"#
		);
	}

	#[test]
	fn it_deserializes_correctly() {
		let json = r#"{"and":[{"name":{"contains":"test"}},{"series":{"name":{"not":"test"}}},{"series":{"library":{"name":{"excludes":"test"}}}}]}"#;

		let filter: FilterGroup<MediaSmartFilter> = serde_json::from_str(json).unwrap();

		assert_eq!(
			filter,
			FilterGroup::And {
				and: vec![
					MediaSmartFilter::Name {
						name: Filter::StringFilter(StringFilter::Contains {
							contains: "test".to_string(),
						}),
					},
					MediaSmartFilter::Series {
						series: SeriesSmartFilter::Name {
							name: Filter::Not {
								not: "test".to_string(),
							},
						},
					},
					MediaSmartFilter::Series {
						series: SeriesSmartFilter::Library {
							library: LibrarySmartFilter::Name {
								name: Filter::StringFilter(StringFilter::Excludes {
									excludes: "test".to_string(),
								}),
							},
						},
					},
				],
			}
		);
	}

	#[test]
	fn it_serializes_number_correctly() {
		let filter: FilterGroup<MediaSmartFilter> = FilterGroup::And {
			and: vec![MediaSmartFilter::Size {
				size: Filter::NumericFilter(NumericFilter::Gte { gte: 3000 }),
			}],
		};

		let json = serde_json::to_string(&filter).unwrap();

		assert_eq!(json, r#"{"and":[{"size":{"gte":3000}}]}"#);
	}

	#[test]
	fn it_deserializes_number_correctly() {
		let json = r#"{"or":[{"size":{"gte":3000}}]}"#;

		let filter: FilterGroup<MediaSmartFilter> = serde_json::from_str(json).unwrap();

		assert_eq!(
			filter,
			FilterGroup::Or {
				or: vec![MediaSmartFilter::Size {
					size: Filter::NumericFilter(NumericFilter::Gte { gte: 3000 }),
				}],
			}
		);
	}

	#[test]
	fn it_serializes_range_correctly() {
		let filter: FilterGroup<MediaSmartFilter> = FilterGroup::And {
			and: vec![MediaSmartFilter::Metadata {
				metadata: MediaMetadataSmartFilter::AgeRating {
					age_rating: Filter::NumericFilter(NumericFilter::Range(
						NumericRange {
							from: 10,
							to: 20,
							inclusive: true,
						},
					)),
				},
			}],
		};

		let json = serde_json::to_string(&filter).unwrap();

		assert_eq!(
			json,
			r#"{"and":[{"metadata":{"age_rating":{"from":10,"to":20,"inclusive":true}}}]}"#
		);
	}

	#[test]
	fn it_deserializes_range_correctly() {
		let json = r#"{"and":[{"metadata":{"age_rating":{"from":10,"to":20,"inclusive":true}}}]}"#;

		let filter: FilterGroup<MediaSmartFilter> = serde_json::from_str(json).unwrap();

		assert_eq!(
			filter,
			FilterGroup::And {
				and: vec![MediaSmartFilter::Metadata {
					metadata: MediaMetadataSmartFilter::AgeRating {
						age_rating: Filter::NumericFilter(NumericFilter::Range(
							NumericRange {
								from: 10,
								to: 20,
								inclusive: true,
							},
						)),
					},
				}],
			}
		);
	}

	fn default_book(name: &str) -> media::Data {
		media::Data {
			id: "test-id".to_string(),
			name: name.to_string(),
			reviews: None,
			annotations: None,
			series: None,
			series_id: None,
			book_club_books: None,
			book_club_member_favorite_book: None,
			book_club_suggestions: None,
			bookmarks: None,
			created_at: Utc::now().into(),
			deleted_at: None,
			extension: "CBZ".to_string(),
			hash: None,
			koreader_hash: None,
			metadata: None,
			modified_at: None,
			pages: 30,
			path: "test-path".to_string(),
			active_user_reading_sessions: None,
			finished_user_reading_sessions: None,
			reading_list_items: None,
			size: 100,
			status: "READY".to_string(),
			tags: None,
			updated_at: Utc::now().into(),
		}
	}

	#[tokio::test]
	async fn it_builds_basic_media_filter() {
		let (client, mock) = PrismaClient::_mock();

		let filter = FilterGroup::Or {
			or: vec![
				MediaSmartFilter::Name {
					name: Filter::StringFilter(StringFilter::Contains {
						contains: "test".to_string(),
					}),
				},
				MediaSmartFilter::Name {
					name: Filter::Not {
						not: "stinky".to_string(),
					},
				},
			],
		};

		let expected_params = vec![or![
			media::name::contains("test".to_string()),
			not![media::name::equals("stinky".to_string())]
		]];
		// let params = filter.into_params(); // TODO: Make this work
		let params = match filter {
			FilterGroup::Or { or } => prisma_client_rust::operator::or(
				or.into_iter().map(|f| f.into_params()).collect(),
			),
			_ => unreachable!("Invalid filter"),
		};

		mock.expect(
			client.media().find_many(expected_params),
			vec![default_book("test"), default_book("stinky-equality-haha")],
		)
		.await;

		let result = client
			.media()
			.find_many(vec![params])
			.exec()
			.await
			.expect("Failed to execute query");

		assert_eq!(result.len(), 2);
	}

	#[tokio::test]
	async fn it_builds_complex_media_filter() {
		let (client, mock) = PrismaClient::_mock();

		let filter = FilterGroup::Or {
			or: vec![
				MediaSmartFilter::Name {
					name: Filter::StringFilter(StringFilter::Contains {
						contains: "test".to_string(),
					}),
				},
				MediaSmartFilter::Name {
					name: Filter::Not {
						not: "stinky".to_string(),
					},
				},
				MediaSmartFilter::Metadata {
					metadata: MediaMetadataSmartFilter::Publisher {
						publisher: Filter::Any {
							any: vec!["test".to_string(), "test2".to_string()],
						},
					},
				},
				MediaSmartFilter::Metadata {
					metadata: MediaMetadataSmartFilter::AgeRating {
						age_rating: Filter::NumericFilter(NumericFilter::Range(
							NumericRange {
								from: 10,
								to: 20,
								inclusive: true,
							},
						)),
					},
				},
				MediaSmartFilter::Series {
					series: SeriesSmartFilter::Library {
						library: LibrarySmartFilter::Name {
							name: Filter::StringFilter(StringFilter::Excludes {
								excludes: "test".to_string(),
							}),
						},
					},
				},
			],
		};

		let expected_params = vec![or![
			media::name::contains("test".to_string()),
			not![media::name::equals("stinky".to_string())],
			media::metadata::is(vec![media_metadata::publisher::in_vec(vec![
				"test".to_string(),
				"test2".to_string()
			]),]),
			media::metadata::is(vec![and![
				media_metadata::age_rating::gte(10),
				media_metadata::age_rating::lte(20)
			]]),
			media::series::is(vec![series::library::is(vec![not![
				library::name::contains("test".to_string())
			]])])
		]];

		let params = match filter {
			FilterGroup::Or { or } => prisma_client_rust::operator::or(
				or.into_iter().map(|f| f.into_params()).collect(),
			),
			_ => unreachable!(),
		};

		mock.expect(
			client.media().find_many(expected_params),
			vec![default_book("test"), default_book("stinky-equality-haha")],
		)
		.await;

		let result = client
			.media()
			.find_many(vec![params])
			.exec()
			.await
			.expect("Failed to execute query");

		assert_eq!(result.len(), 2);
	}
}

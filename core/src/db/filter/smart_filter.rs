use std::{fmt::Display, str::FromStr};

use prisma_client_rust::{and, not, or};
use serde::{Deserialize, Serialize};
use specta::Type;
use utoipa::ToSchema;

use crate::prisma::{library, media, media_metadata, series, series_metadata};

// TODO: This rough implementation is not very great. It is very verbose and not very ergonomic. It _technically_
// works, and while I don't think anyone using this feature will notice, from a DX/mainenance perspective, it needs
// to be refactored. The two big things IMO are:
//
// 1. Performance implications. This is mostly because the assumption for each `into_prisma` call is a single param,
//    which means for relation filters we will have an `is` call each time. I don't yet know how this actually affects
//    performance in real-world scenarios, but it's something to keep in mind.
// 2. Repetition of logic. There is a lot of repetition in the `into_prisma` definitions, and I think there is a way to (maybe)
//    consolidate them into a single macro. I'm not sure if this is possible, but it's worth looking into. This will get exponentially
//    worse as things like sorting and sorting on relations are added... :weary:

#[derive(Debug, Clone, Serialize, Deserialize, PartialEq, Type)]
#[serde(untagged)]
/// A filter for a single value, e.g. `name = "test"`
pub enum Filter<T> {
	/// A simple equals filter, e.g. `name = "test"`
	Equals(T),
	/// A simple not filter, e.g. `name != "test"`
	Not { not: T },
	/// A filter for a string that contains a substring, e.g. `name contains "test"`. This should
	/// not be confused with an `in` filter. See [Filter::Any] for that.
	Contains { contains: T },
	/// A filter for a string that does not contain a substring, e.g. `name excludes "test"`. This
	/// should not be confused with a `not in` filter. See [Filter::None] for that.
	Excludes { excludes: T },
	/// A filter for a vector of values, e.g. `name in ["test", "test2"]`
	Any { any: Vec<T> },
	/// A filter for a vector of values, e.g. `name not in ["test", "test2"]`
	None { none: Vec<T> },
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

#[derive(Debug, Clone, Serialize, Deserialize, PartialEq, Type)]
#[serde(untagged)]
pub enum NumericFilter<T> {
	Gt { gt: T },
	Gte { gte: T },
	Lt { lt: T },
	Lte { lte: T },
	Range(NumericRange<T>),
}

impl<T> Filter<T> {
	/// Convert self into a prisma where param
	pub fn into_params<WhereParam>(
		self,
		equals_fn: fn(T) -> WhereParam,
		contains_fn: fn(T) -> WhereParam,
		vec_fn: fn(Vec<T>) -> WhereParam,
	) -> WhereParam
	where
		WhereParam: From<prisma_client_rust::Operator<WhereParam>>,
	{
		match self {
			Filter::Equals(value) => equals_fn(value),
			Filter::Not { not } => not![equals_fn(not)],
			Filter::Contains { contains } => contains_fn(contains),
			Filter::Excludes { excludes } => not![contains_fn(excludes)],
			Filter::Any { any } => vec_fn(any),
			Filter::None { none } => not![vec_fn(none)],
			_ => unreachable!("Numeric filters should be handled elsewhere"),
		}
	}

	// TODO: I don't want to redefine this, consolidate it with the above if possible
	/// Convert self into a prisma where param, but with an optional value for the equals filter
	pub fn into_optional_params<WhereParam>(
		self,
		equals_fn: fn(Option<T>) -> WhereParam,
		contains_fn: fn(T) -> WhereParam,
		vec_fn: fn(Vec<T>) -> WhereParam,
	) -> WhereParam
	where
		WhereParam: From<prisma_client_rust::Operator<WhereParam>>,
	{
		match self {
			Filter::Equals(value) => equals_fn(Some(value)),
			Filter::Not { not } => not![equals_fn(Some(not))],
			Filter::Contains { contains } => contains_fn(contains),
			Filter::Excludes { excludes } => not![contains_fn(excludes)],
			Filter::Any { any } => vec_fn(any),
			Filter::None { none } => not![vec_fn(none)],
			_ => unreachable!("Numeric filters should be handled elsewhere"),
		}
	}
}

impl Filter<i32> {
	pub fn into_numeric_params<WhereParam>(
		self,
		equals_fn: fn(i32) -> WhereParam,
		gt_fn: fn(i32) -> WhereParam,
		gte_fn: fn(i32) -> WhereParam,
		lt_fn: fn(i32) -> WhereParam,
		lte_fn: fn(i32) -> WhereParam,
	) -> WhereParam
	where
		WhereParam: From<prisma_client_rust::Operator<WhereParam>>,
	{
		match self {
			Filter::Equals(value) => equals_fn(value),
			Filter::Not { not } => not![equals_fn(not)],
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
			_ => unreachable!("Non-numeric filters should be handled elsewhere"),
		}
	}

	pub fn into_optional_numeric_params<WhereParam>(
		self,
		equals_fn: fn(Option<i32>) -> WhereParam,
		gt_fn: fn(i32) -> WhereParam,
		gte_fn: fn(i32) -> WhereParam,
		lt_fn: fn(i32) -> WhereParam,
		lte_fn: fn(i32) -> WhereParam,
	) -> WhereParam
	where
		WhereParam: From<prisma_client_rust::Operator<WhereParam>>,
	{
		match self {
			Filter::Equals(value) => equals_fn(Some(value)),
			Filter::Not { not } => not![equals_fn(Some(not))],
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
			_ => unreachable!("Non-numeric filters should be handled elsewhere"),
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
			_ => Err(format!("Invalid filter joiner: {}", s)),
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

// pub struct SmartFilterOrder {
// 	pub direction: Direction,
// 	pub order_by:
// }

#[derive(Debug, Clone, Serialize, Deserialize, Type, ToSchema)]
#[aliases(SmartFilterSchema = SmartFilter<MediaSmartFilter>)]
pub struct SmartFilter<T> {
	pub groups: Vec<FilterGroup<T>>,
	#[serde(default)]
	pub joiner: FilterJoin,
}

// TODO: figure out if perhaps macros can come in with the save here. Continuing down this path
// will be INCREDIBLY verbose..

#[derive(Debug, Clone, Serialize, Deserialize, PartialEq, Type, ToSchema)]
#[serde(untagged)]
pub enum LibrarySmartFilter {
	Name { name: Filter<String> },
	Path { path: Filter<String> },
}

impl LibrarySmartFilter {
	pub fn into_params(self) -> library::WhereParam {
		match self {
			LibrarySmartFilter::Name { name } => name.into_params(
				library::name::equals,
				library::name::contains,
				library::name::in_vec,
			),
			LibrarySmartFilter::Path { path } => path.into_params(
				library::path::equals,
				library::path::contains,
				library::path::in_vec,
			),
		}
	}
}

#[derive(Debug, Clone, Serialize, Deserialize, PartialEq, Type, ToSchema)]
#[serde(untagged)]
pub enum SeriesMetadataSmartFilter {
	MetaType { meta_type: Filter<String> },
	Publisher { publisher: Filter<String> },
	Status { status: Filter<String> },
	AgeRating { age_rating: Filter<i32> },
	Volume { volume: Filter<i32> },
}

impl SeriesMetadataSmartFilter {
	pub fn into_params(self) -> series_metadata::WhereParam {
		match self {
			SeriesMetadataSmartFilter::MetaType { meta_type } => meta_type.into_params(
				series_metadata::meta_type::equals,
				series_metadata::meta_type::contains,
				series_metadata::meta_type::in_vec,
			),
			SeriesMetadataSmartFilter::Publisher { publisher } => publisher
				.into_optional_params(
					series_metadata::publisher::equals,
					series_metadata::publisher::contains,
					series_metadata::publisher::in_vec,
				),
			SeriesMetadataSmartFilter::Status { status } => status.into_optional_params(
				series_metadata::status::equals,
				series_metadata::status::contains,
				series_metadata::status::in_vec,
			),
			SeriesMetadataSmartFilter::AgeRating { age_rating } => age_rating
				.into_optional_numeric_params(
					series_metadata::age_rating::equals,
					series_metadata::age_rating::gt,
					series_metadata::age_rating::gte,
					series_metadata::age_rating::lt,
					series_metadata::age_rating::lte,
				),
			SeriesMetadataSmartFilter::Volume { volume } => volume
				.into_optional_numeric_params(
					series_metadata::volume::equals,
					series_metadata::volume::gt,
					series_metadata::volume::gte,
					series_metadata::volume::lt,
					series_metadata::volume::lte,
				),
		}
	}
}

#[derive(Debug, Clone, Serialize, Deserialize, PartialEq, Type, ToSchema)]
#[serde(untagged)]
pub enum SeriesSmartFilter {
	Name { name: Filter<String> },
	Path { path: Filter<String> },

	Metadata { metadata: SeriesMetadataSmartFilter },
	Library { library: LibrarySmartFilter },
}

impl SeriesSmartFilter {
	pub fn into_params(self) -> series::WhereParam {
		match self {
			SeriesSmartFilter::Name { name } => {
				let metadata_param = name.clone().into_optional_params(
					series_metadata::title::equals,
					series_metadata::title::contains,
					series_metadata::title::in_vec,
				);

				or![
					name.into_params(
						series::name::equals,
						series::name::contains,
						series::name::in_vec,
					),
					series::metadata::is(vec![metadata_param])
				]
			},
			SeriesSmartFilter::Path { path } => path.into_params(
				series::path::equals,
				series::path::contains,
				series::path::in_vec,
			),
			SeriesSmartFilter::Metadata { metadata } => {
				series::metadata::is(vec![metadata.into_params()])
			},
			SeriesSmartFilter::Library { library } => {
				series::library::is(vec![library.into_params()])
			},
		}
	}
}

#[derive(Debug, Clone, Serialize, Deserialize, PartialEq, Type, ToSchema)]
#[serde(untagged)]
pub enum MediaMetadataSmartFilter {
	Publisher { publisher: Filter<String> },
	Genre { genre: Filter<String> },
	Characters { characters: Filter<String> },
	Colorists { colorists: Filter<String> },
	Writers { writers: Filter<String> },
	Pencillers { pencillers: Filter<String> },
	Letterers { letterers: Filter<String> },
	Inkers { inkers: Filter<String> },
	Editors { editors: Filter<String> },
	// FIXME: Current implementationm makes it awkward to support numeric filters
	AgeRating { age_rating: Filter<i32> },
	Year { year: Filter<i32> },
	Month { month: Filter<i32> },
	Day { day: Filter<i32> },
}

impl MediaMetadataSmartFilter {
	pub fn into_params(self) -> media_metadata::WhereParam {
		match self {
			MediaMetadataSmartFilter::Publisher { publisher } => publisher
				.into_optional_params(
					media_metadata::publisher::equals,
					media_metadata::publisher::contains,
					media_metadata::publisher::in_vec,
				),
			MediaMetadataSmartFilter::Genre { genre } => genre.into_optional_params(
				media_metadata::genre::equals,
				media_metadata::genre::contains,
				media_metadata::genre::in_vec,
			),
			MediaMetadataSmartFilter::Characters { characters } => characters
				.into_optional_params(
					media_metadata::characters::equals,
					media_metadata::characters::contains,
					media_metadata::characters::in_vec,
				),
			MediaMetadataSmartFilter::Colorists { colorists } => colorists
				.into_optional_params(
					media_metadata::colorists::equals,
					media_metadata::colorists::contains,
					media_metadata::colorists::in_vec,
				),
			MediaMetadataSmartFilter::Writers { writers } => writers
				.into_optional_params(
					media_metadata::writers::equals,
					media_metadata::writers::contains,
					media_metadata::writers::in_vec,
				),
			MediaMetadataSmartFilter::Pencillers { pencillers } => pencillers
				.into_optional_params(
					media_metadata::pencillers::equals,
					media_metadata::pencillers::contains,
					media_metadata::pencillers::in_vec,
				),
			MediaMetadataSmartFilter::Letterers { letterers } => letterers
				.into_optional_params(
					media_metadata::letterers::equals,
					media_metadata::letterers::contains,
					media_metadata::letterers::in_vec,
				),
			MediaMetadataSmartFilter::Inkers { inkers } => inkers.into_optional_params(
				media_metadata::inkers::equals,
				media_metadata::inkers::contains,
				media_metadata::inkers::in_vec,
			),
			MediaMetadataSmartFilter::Editors { editors } => editors
				.into_optional_params(
					media_metadata::editors::equals,
					media_metadata::editors::contains,
					media_metadata::editors::in_vec,
				),
			MediaMetadataSmartFilter::AgeRating { age_rating } => age_rating
				.into_optional_numeric_params(
					media_metadata::age_rating::equals,
					media_metadata::age_rating::gt,
					media_metadata::age_rating::gte,
					media_metadata::age_rating::lt,
					media_metadata::age_rating::lte,
				),
			MediaMetadataSmartFilter::Year { year } => year.into_optional_numeric_params(
				media_metadata::year::equals,
				media_metadata::year::gt,
				media_metadata::year::gte,
				media_metadata::year::lt,
				media_metadata::year::lte,
			),
			MediaMetadataSmartFilter::Month { month } => month
				.into_optional_numeric_params(
					media_metadata::month::equals,
					media_metadata::month::gt,
					media_metadata::month::gte,
					media_metadata::month::lt,
					media_metadata::month::lte,
				),
			MediaMetadataSmartFilter::Day { day } => day.into_optional_numeric_params(
				media_metadata::day::equals,
				media_metadata::day::gt,
				media_metadata::day::gte,
				media_metadata::day::lt,
				media_metadata::day::lte,
			),
		}
	}
}

#[derive(Debug, Clone, Serialize, Deserialize, PartialEq, Type, ToSchema)]
#[serde(untagged)]
pub enum MediaSmartFilter {
	Name { name: Filter<String> },
	Extension { extension: Filter<String> },
	Path { path: Filter<String> },
	Metadata { metadata: MediaMetadataSmartFilter },
	Series { series: SeriesSmartFilter },
}

impl MediaSmartFilter {
	pub fn into_params(self) -> media::WhereParam {
		match self {
			MediaSmartFilter::Name { name } => name.into_params(
				media::name::equals,
				media::name::contains,
				media::name::in_vec,
			),
			MediaSmartFilter::Extension { extension } => extension.into_params(
				media::extension::equals,
				media::extension::contains,
				media::extension::in_vec,
			),
			MediaSmartFilter::Path { path } => path.into_params(
				media::path::equals,
				media::path::contains,
				media::path::in_vec,
			),
			MediaSmartFilter::Metadata { metadata } => {
				media::metadata::is(vec![metadata.into_params()])
			},
			MediaSmartFilter::Series { series } => {
				media::series::is(vec![series.into_params()])
			},
		}
	}
}

#[cfg(test)]
mod tests {
	use prisma_client_rust::chrono::Utc;

	use super::*;
	use crate::prisma::PrismaClient;

	#[test]
	fn it_serializes_correctly() {
		let filter: FilterGroup<MediaSmartFilter> = FilterGroup::And {
			and: vec![
				MediaSmartFilter::Name {
					name: Filter::Contains {
						contains: "test".to_string(),
					},
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
							name: Filter::Excludes {
								excludes: "test".to_string(),
							},
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
						name: Filter::Contains {
							contains: "test".to_string(),
						},
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
								name: Filter::Excludes {
									excludes: "test".to_string(),
								},
							},
						},
					},
				],
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
			extension: "CBZ".to_string(),
			hash: None,
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
					name: Filter::Contains {
						contains: "test".to_string(),
					},
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

	#[tokio::test]
	async fn it_builds_complex_media_filter() {
		let (client, mock) = PrismaClient::_mock();

		let filter = FilterGroup::Or {
			or: vec![
				MediaSmartFilter::Name {
					name: Filter::Contains {
						contains: "test".to_string(),
					},
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
							name: Filter::Excludes {
								excludes: "test".to_string(),
							},
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

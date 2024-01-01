use std::str::FromStr;

use prisma_client_rust::{not, or};
use serde::{Deserialize, Serialize};
use specta::Type;

use crate::prisma::{library, media, media_metadata, series, series_metadata};

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
}

impl<T> Filter<T> {
	/// Convert self into a prisma where param
	pub fn into_prisma<WhereParam>(
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
		}
	}

	// TODO: I don't want to redefine this, consolidate it with the above if possible
	/// Convert self into a prisma where param, but with an optional value for the equals filter
	pub fn into_optional_prisma<WhereParam>(
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
		}
	}
}

#[derive(Debug, Clone, Serialize, Deserialize, PartialEq, Type)]
#[serde(untagged)]
/// A list of filters that are being combined with a logical operator, e.g. `and` or `or`
pub enum FilterGroup<T> {
	And { and: Vec<T> },
	Or { or: Vec<T> },
	Not { not: Vec<T> },
}

#[derive(Default, Debug, Clone, Serialize, Deserialize, Type)]
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

impl ToString for FilterJoin {
	fn to_string(&self) -> String {
		match self {
			FilterJoin::And => "AND".to_string(),
			FilterJoin::Or => "OR".to_string(),
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

#[derive(Debug, Clone, Serialize, Deserialize, Type)]
pub struct SmartFilter<T> {
	pub groups: Vec<FilterGroup<T>>,
	#[serde(default)]
	pub joiner: FilterJoin,
}

// TODO: figure out if perhaps macros can come in with the save here. Continuing down this path
// will be INCREDIBLY verbose..

#[derive(Debug, Clone, Serialize, Deserialize, PartialEq, Type)]
#[serde(untagged)]
pub enum LibrarySmartFilter {
	Name { name: Filter<String> },
	Path { path: Filter<String> },
}

impl LibrarySmartFilter {
	pub fn into_prisma(self) -> library::WhereParam {
		match self {
			LibrarySmartFilter::Name { name } => name.into_prisma(
				library::name::equals,
				library::name::contains,
				library::name::in_vec,
			),
			LibrarySmartFilter::Path { path } => path.into_prisma(
				library::path::equals,
				library::path::contains,
				library::path::in_vec,
			),
		}
	}
}

#[derive(Debug, Clone, Serialize, Deserialize, PartialEq, Type)]
#[serde(untagged)]
pub enum SeriesSmartFilter {
	Name { name: Filter<String> },

	Library { library: LibrarySmartFilter },
}

impl SeriesSmartFilter {
	pub fn into_prisma(self) -> series::WhereParam {
		match self {
			SeriesSmartFilter::Name { name } => {
				let metadata_param = name.clone().into_optional_prisma(
					series_metadata::title::equals,
					series_metadata::title::contains,
					series_metadata::title::in_vec,
				);

				or![
					name.into_prisma(
						series::name::equals,
						series::name::contains,
						series::name::in_vec,
					),
					series::metadata::is(vec![metadata_param])
				]
			},
			SeriesSmartFilter::Library { library } => {
				series::library::is(vec![library.into_prisma()])
			},
		}
	}
}

#[derive(Debug, Clone, Serialize, Deserialize, PartialEq, Type)]
#[serde(untagged)]
pub enum MediaMetadataSmartFilter {
	Publisher { publisher: Filter<String> },
	Genre { genre: Filter<String> },
	Character { character: Filter<String> },
	Colorist { colorist: Filter<String> },
	Writer { writer: Filter<String> },
	Penciller { penciller: Filter<String> },
	Letterer { letterer: Filter<String> },
	Inker { inker: Filter<String> },
	Editor { editor: Filter<String> },
	// FIXME: Current implementationm makes it awkward to support numeric filters
	// AgeRating { age_rating: Filter<i32> },
	// Year { year: Filter<i32> },
}

impl MediaMetadataSmartFilter {
	pub fn into_prisma(self) -> media_metadata::WhereParam {
		match self {
			MediaMetadataSmartFilter::Publisher { publisher } => publisher
				.into_optional_prisma(
					media_metadata::publisher::equals,
					media_metadata::publisher::contains,
					media_metadata::publisher::in_vec,
				),
			MediaMetadataSmartFilter::Genre { genre } => genre.into_optional_prisma(
				media_metadata::genre::equals,
				media_metadata::genre::contains,
				media_metadata::genre::in_vec,
			),
			MediaMetadataSmartFilter::Character { character } => character
				.into_optional_prisma(
					media_metadata::characters::equals,
					media_metadata::characters::contains,
					media_metadata::characters::in_vec,
				),
			MediaMetadataSmartFilter::Colorist { colorist } => colorist
				.into_optional_prisma(
					media_metadata::colorists::equals,
					media_metadata::colorists::contains,
					media_metadata::colorists::in_vec,
				),
			MediaMetadataSmartFilter::Writer { writer } => writer.into_optional_prisma(
				media_metadata::writers::equals,
				media_metadata::writers::contains,
				media_metadata::writers::in_vec,
			),
			MediaMetadataSmartFilter::Penciller { penciller } => penciller
				.into_optional_prisma(
					media_metadata::pencillers::equals,
					media_metadata::pencillers::contains,
					media_metadata::pencillers::in_vec,
				),
			MediaMetadataSmartFilter::Letterer { letterer } => letterer
				.into_optional_prisma(
					media_metadata::letterers::equals,
					media_metadata::letterers::contains,
					media_metadata::letterers::in_vec,
				),
			MediaMetadataSmartFilter::Inker { inker } => inker.into_optional_prisma(
				media_metadata::inkers::equals,
				media_metadata::inkers::contains,
				media_metadata::inkers::in_vec,
			),
			MediaMetadataSmartFilter::Editor { editor } => editor.into_optional_prisma(
				media_metadata::editors::equals,
				media_metadata::editors::contains,
				media_metadata::editors::in_vec,
			),
		}
	}
}

#[derive(Debug, Clone, Serialize, Deserialize, PartialEq, Type)]
#[serde(untagged)]
pub enum MediaSmartFilter {
	Name { name: Filter<String> },

	Metadata { metadata: MediaMetadataSmartFilter },
	Series { series: SeriesSmartFilter },
}

impl MediaSmartFilter {
	pub fn into_prisma(self) -> media::WhereParam {
		match self {
			// TODO: metadata...
			MediaSmartFilter::Name { name } => name.into_prisma(
				media::name::equals,
				media::name::contains,
				media::name::in_vec,
			),
			MediaSmartFilter::Metadata { metadata } => {
				media::metadata::is(vec![metadata.into_prisma()])
			},
			MediaSmartFilter::Series { series } => {
				media::series::is(vec![series.into_prisma()])
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
			read_progresses: None,
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
		// let params = filter.into_prisma(); // TODO: Make this work
		let params = match filter {
			FilterGroup::Or { or } => prisma_client_rust::operator::or(
				or.into_iter().map(|f| f.into_prisma()).collect(),
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

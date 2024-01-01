use prisma_client_rust::{not, or};
use serde::{Deserialize, Serialize};
use stump_core::prisma::{library, media, series, series_metadata};

#[derive(Debug, Clone, Serialize, Deserialize, PartialEq)]
#[serde(untagged)]
/// A filter for a single value, e.g. `name = "test"`
enum Filter<T> {
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

#[derive(Debug, Clone, Serialize, Deserialize, PartialEq)]
#[serde(untagged)]
/// A list of filters that are being combined with a logical operator, e.g. `and` or `or`
enum FilterGroup<T> {
	And { and: Vec<T> },
	Or { or: Vec<T> },
	Not { not: Vec<T> },
}

// TODO: figure out if perhaps macros can come in with the save here. Continuing down this path
// will be INCREDIBLY verbose..

#[derive(Debug, Clone, Serialize, Deserialize, PartialEq)]
#[serde(untagged)]
enum LibrarySmartFilter {
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

#[derive(Debug, Clone, Serialize, Deserialize, PartialEq)]
#[serde(untagged)]
enum SeriesSmartFilter {
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

#[derive(Debug, Clone, Serialize, Deserialize, PartialEq)]
#[serde(untagged)]
enum MediaSmartFilter {
	Name { name: Filter<String> },

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
			MediaSmartFilter::Series { series } => {
				media::series::is(vec![series.into_prisma()])
			},
		}
	}
}

#[cfg(test)]
mod tests {
	use prisma_client_rust::chrono::Utc;
	use stump_core::prisma::PrismaClient;

	use super::*;

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

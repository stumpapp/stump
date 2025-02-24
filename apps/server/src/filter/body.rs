use serde::{Deserialize, Serialize};
use specta::Type;
use stump_core::db::{
	filter::FilterGroup,
	query::{IntoOrderBy, QueryOrder},
};
use utoipa::ToSchema;

/// A filter body for more complex filtering and ordering operations. It uses the
/// smart filter types as its backbone. This should be used only in request bodies,
/// not query strings. For query strings, use [`super::FilterQuery`].
#[derive(Debug, Default, Deserialize, Serialize, ToSchema, Type)]
pub struct FilterBody<F, O>
where
	F: Sized,
	O: IntoOrderBy + Default,
{
	/// The filter groups to apply to the query. These will be combined with an `AND` operation,
	/// however the groups themselves can contain multiple filters that will be combined with one
	/// of the smart filter operators (e.g. `OR`, `AND`, `NOT`).
	#[serde(default = "Vec::new")]
	pub filters: Vec<FilterGroup<F>>,
	/// The order parameters to apply to the query. These will be applied in the order they are
	/// provided, so the order of the list matters. E.g. if you want to order by `metadata.title`
	/// and then by `name`.
	#[serde(default)]
	pub order_params: Vec<QueryOrder<O>>,
}

#[cfg(test)]
mod tests {
	use stump_core::db::{
		entity::{MediaMetadataOrderBy, MediaOrderBy},
		filter::{
			Filter, LibrarySmartFilter, MediaSmartFilter, NumericFilter,
			SeriesSmartFilter, StringFilter,
		},
		query::Direction,
	};

	use super::*;

	#[test]
	fn test_deserialize_empty_body() {
		let body = r#"{}"#;
		let deserialized: FilterBody<MediaSmartFilter, MediaOrderBy> =
			serde_json::from_str(body).unwrap();
		assert!(deserialized.filters.is_empty());
		assert!(deserialized.order_params.is_empty());
	}

	#[test]
	fn test_serialize_basic_body() {
		let filter_body = FilterBody {
			filters: vec![FilterGroup::And {
				and: vec![MediaSmartFilter::Size {
					size: Filter::NumericFilter(NumericFilter::Gt { gt: 10000 }),
				}],
			}],
			order_params: vec![QueryOrder {
				order_by: MediaOrderBy::Name,
				direction: Direction::Asc,
			}],
		};

		let serialized = serde_json::to_string(&filter_body).unwrap();
		assert_eq!(
			serialized,
			r#"{"filters":[{"and":[{"size":{"gt":10000}}]}],"order_params":[{"order_by":"name","direction":"asc"}]}"#
		);
	}

	#[test]
	fn test_serialize_relation_body() {
		let filter_body = FilterBody {
			filters: vec![FilterGroup::And {
				and: vec![MediaSmartFilter::Series {
					series: SeriesSmartFilter::Library {
						library: LibrarySmartFilter::Name {
							name: Filter::StringFilter(StringFilter::Excludes {
								excludes: "test".to_string(),
							}),
						},
					},
				}],
			}],
			order_params: vec![QueryOrder {
				order_by: MediaOrderBy::Metadata(vec![MediaMetadataOrderBy::Title]),
				direction: Direction::Asc,
			}],
		};

		let serialized = serde_json::to_string(&filter_body).unwrap();
		assert_eq!(
			serialized,
			r#"{"filters":[{"and":[{"series":{"library":{"name":{"excludes":"test"}}}}]}],"order_params":[{"order_by":{"metadata":["title"]},"direction":"asc"}]}"#
		);
	}
}

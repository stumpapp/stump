use std::str::FromStr;

use serde::{de, Deserialize, Serialize};
use serde_untagged::UntaggedEnumVisitor;
use serde_with::skip_serializing_none;
use specta::Type;
use stump_core::db::{
	entity::{
		age_rating_deserializer, LibraryOrderBy, LogLevel, MediaOrderBy, SeriesOrderBy,
	},
	filter::FilterGroup,
	query::{IntoOrderBy, QueryOrder},
};
use utoipa::ToSchema;

use crate::errors::APIError;

use super::common::{
	chain_optional_iter, from_optional_str, read_status_or_seq_read_status,
	string_or_seq_string,
};

// TODO: I'd love to support `not` operations somehow
// TODO: break this file up!

#[derive(Debug, Default, Deserialize, Serialize, ToSchema)]
#[aliases(
	FilterableLibraryQuery = FilterableQuery<LibraryFilter, LibraryOrderBy>,
	FilterableSeriesQuery = FilterableQuery<SeriesFilter, SeriesOrderBy>,
	FilterableMediaQuery = FilterableQuery<MediaFilter, MediaOrderBy>
)]
pub struct FilterableQuery<F, O>
where
	F: Sized + Default,
	O: IntoOrderBy + Default,
{
	#[serde(flatten, default)]
	pub filters: F,
	#[serde(flatten)]
	pub ordering: QueryOrder<O>,
}

impl<F, O> FilterableQuery<F, O>
where
	F: Sized + Default,
	O: IntoOrderBy + Default,
{
	pub fn get(self) -> Self {
		self
	}
}

// TODO: move into smart filter, e.g. SmartFilterBody!! :)
#[derive(Debug, Default, Deserialize, Serialize, ToSchema)]
pub struct FilterBody<F, O>
where
	F: Sized,
	O: IntoOrderBy + Default,
{
	#[serde(default = "Vec::new")]
	pub filters: Vec<FilterGroup<F>>,
	#[serde(default)]
	pub order_params: Vec<QueryOrder<O>>,
}

#[derive(Deserialize, Debug, Clone, Serialize, Type)]
pub struct Range<T>
where
	T: std::str::FromStr,
{
	#[serde(default, deserialize_with = "from_optional_str")]
	pub from: Option<T>,
	#[serde(default, deserialize_with = "from_optional_str")]
	pub to: Option<T>,
}

impl<T> Range<T>
where
	T: std::str::FromStr,
{
	pub fn into_prisma<R: From<prisma_client_rust::Operator<R>>>(
		self,
		gte: fn(T) -> R,
		lte: fn(T) -> R,
	) -> Vec<R> {
		chain_optional_iter([], [self.from.map(gte), self.to.map(lte)])
	}
}

#[derive(Debug, Clone, Serialize, ToSchema, Type)]
#[serde(untagged)]
pub enum ValueOrRange<T>
where
	T: std::str::FromStr,
{
	Value(T),
	Range(Range<T>),
}

// TODO: figure out a way to do this without being so VERBOSE

impl<'de> de::Deserialize<'de> for ValueOrRange<String> {
	fn deserialize<D>(deserializer: D) -> Result<Self, D::Error>
	where
		D: de::Deserializer<'de>,
	{
		UntaggedEnumVisitor::new()
			.string(|v| Ok(ValueOrRange::Value(v.to_owned())))
			.map(|map| map.deserialize().map(ValueOrRange::Range))
			.deserialize(deserializer)
	}
}

impl<'de> de::Deserialize<'de> for ValueOrRange<i32> {
	fn deserialize<D>(deserializer: D) -> Result<Self, D::Error>
	where
		D: de::Deserializer<'de>,
	{
		UntaggedEnumVisitor::new()
			.string(|v| Ok(ValueOrRange::Value(v.parse().map_err(de::Error::custom)?)))
			.i32(|v| Ok(ValueOrRange::Value(v)))
			.map(|map| map.deserialize().map(ValueOrRange::Range))
			.deserialize(deserializer)
	}
}

impl<T> Default for ValueOrRange<T>
where
	T: Default + std::str::FromStr,
{
	fn default() -> Self {
		ValueOrRange::Value(T::default())
	}
}

#[derive(Default, Debug, Clone, Deserialize, Serialize, ToSchema)]
pub struct BaseFilter {
	#[serde(default, deserialize_with = "string_or_seq_string")]
	pub id: Vec<String>,
	#[serde(default, deserialize_with = "string_or_seq_string")]
	pub name: Vec<String>,
	#[serde(default, deserialize_with = "string_or_seq_string")]
	pub path: Vec<String>,
	#[serde(skip_serializing_if = "Option::is_none")]
	pub search: Option<String>,
}

#[derive(Default, Debug, Clone, Deserialize, Serialize, ToSchema, Type)]
pub struct LibraryBaseFilter {
	#[serde(default, deserialize_with = "string_or_seq_string")]
	pub id: Vec<String>,
	#[serde(default, deserialize_with = "string_or_seq_string")]
	pub name: Vec<String>,
	#[serde(default, deserialize_with = "string_or_seq_string")]
	pub path: Vec<String>,
	#[serde(skip_serializing_if = "Option::is_none")]
	pub search: Option<String>,
}

#[derive(Default, Debug, Clone, Deserialize, Serialize, ToSchema, Type)]
pub struct LibraryRelationFilter {
	#[serde(skip_serializing_if = "Option::is_none")]
	pub series: Option<SeriesBaseFilter>,
}

#[derive(Default, Debug, Clone, Deserialize, Serialize, ToSchema, Type)]
pub struct LibraryFilter {
	#[serde(flatten)]
	pub base_filter: LibraryBaseFilter,
	#[serde(flatten)]
	pub relation_filter: LibraryRelationFilter,
}

#[skip_serializing_none]
#[derive(Default, Debug, Clone, Deserialize, Serialize, ToSchema, Type)]
pub struct SeriesQueryRelation {
	pub load_media: Option<bool>,
	pub load_library: Option<bool>,
	pub count_media: Option<bool>,
}

#[skip_serializing_none]
#[derive(Default, Debug, Clone, Deserialize, Serialize, ToSchema, Type)]
pub struct UserQueryRelation {
	pub include_read_progresses: Option<bool>,
	pub include_session_count: Option<bool>,
	pub include_restrictions: Option<bool>,
}

// TODO: decide what others to include
#[derive(Default, Debug, Clone, Deserialize, Serialize, ToSchema, Type)]
pub struct SeriesMedataFilter {
	#[serde(default, deserialize_with = "string_or_seq_string")]
	pub meta_type: Vec<String>,
	#[serde(default, deserialize_with = "string_or_seq_string")]
	pub publisher: Vec<String>,
	#[serde(default, deserialize_with = "string_or_seq_string")]
	pub status: Vec<String>,

	#[serde(
		default,
		skip_serializing_if = "Option::is_none",
		deserialize_with = "age_rating_deserializer"
	)]
	pub age_rating: Option<i32>,

	#[serde(skip_serializing_if = "Option::is_none")]
	pub volume: Option<ValueOrRange<i32>>,
}

#[derive(Default, Debug, Clone, Deserialize, Serialize, ToSchema, Type)]
pub struct SeriesBaseFilter {
	#[serde(default, deserialize_with = "string_or_seq_string")]
	pub id: Vec<String>,
	#[serde(default, deserialize_with = "string_or_seq_string")]
	pub name: Vec<String>,
	#[serde(default, deserialize_with = "string_or_seq_string")]
	pub path: Vec<String>,
	#[serde(skip_serializing_if = "Option::is_none")]
	pub search: Option<String>,

	#[serde(skip_serializing_if = "Option::is_none")]
	pub metadata: Option<SeriesMedataFilter>,
}

#[derive(Default, Debug, Clone, Deserialize, Serialize, ToSchema, Type)]
pub struct SeriesRelationFilter {
	#[serde(skip_serializing_if = "Option::is_none")]
	pub library: Option<LibraryBaseFilter>,
	#[serde(skip_serializing_if = "Option::is_none")]
	pub media: Option<MediaBaseFilter>,
}

#[derive(Default, Debug, Clone, Deserialize, Serialize, ToSchema, Type)]
pub struct SeriesFilter {
	#[serde(flatten)]
	pub base_filter: SeriesBaseFilter,
	#[serde(flatten)]
	pub relation_filter: SeriesRelationFilter,
}

#[derive(Default, Debug, Clone, Deserialize, Serialize, ToSchema, Type)]
pub struct MediaMetadataBaseFilter {
	#[serde(default, deserialize_with = "string_or_seq_string")]
	pub publisher: Vec<String>,
	#[serde(default, deserialize_with = "string_or_seq_string")]
	pub genre: Vec<String>,
	#[serde(default, deserialize_with = "string_or_seq_string")]
	pub character: Vec<String>,
	#[serde(default, deserialize_with = "string_or_seq_string")]
	pub colorist: Vec<String>,
	#[serde(default, deserialize_with = "string_or_seq_string")]
	pub writer: Vec<String>,
	#[serde(default, deserialize_with = "string_or_seq_string")]
	pub penciller: Vec<String>,
	#[serde(default, deserialize_with = "string_or_seq_string")]
	pub inker: Vec<String>,
	#[serde(default, deserialize_with = "string_or_seq_string")]
	pub letterer: Vec<String>,
	#[serde(default, deserialize_with = "string_or_seq_string")]
	pub editor: Vec<String>,
	#[serde(
		default,
		skip_serializing_if = "Option::is_none",
		deserialize_with = "age_rating_deserializer"
	)]
	pub age_rating: Option<i32>,
	#[serde(skip_serializing_if = "Option::is_none")]
	pub year: Option<ValueOrRange<i32>>,
}

#[derive(Default, Debug, Clone, Deserialize, Serialize, ToSchema, Type)]
pub struct MediaMetadataRelationFilter {
	#[serde(skip_serializing_if = "Option::is_none")]
	pub media: Option<MediaFilter>,
}

#[derive(Default, Debug, Clone, Deserialize, Serialize, ToSchema, Type)]
pub struct MediaMetadataFilter {
	#[serde(flatten)]
	pub base_filter: MediaMetadataBaseFilter,
	#[serde(flatten)]
	pub relation_filter: MediaMetadataRelationFilter,
}

/// A user-friendly representation of a media's `read_progress`. This will map to
/// a query condition that will be used to filter the media.
#[derive(Default, Debug, Clone, Deserialize, Serialize, ToSchema, Type)]
pub enum ReadStatus {
	#[default]
	#[serde(alias = "unread")]
	Unread,
	#[serde(alias = "reading")]
	Reading,
	#[serde(alias = "completed")]
	Completed,
}

impl FromStr for ReadStatus {
	type Err = APIError;

	fn from_str(s: &str) -> Result<Self, Self::Err> {
		match s.to_lowercase().as_str() {
			"unread" => Ok(ReadStatus::Unread),
			"reading" => Ok(ReadStatus::Reading),
			"completed" => Ok(ReadStatus::Completed),
			_ => Err(APIError::BadRequest(format!("invalid read status: {s}"))),
		}
	}
}

#[derive(Default, Debug, Clone, Deserialize, Serialize, ToSchema, Type)]
pub struct MediaBaseFilter {
	#[serde(default, deserialize_with = "string_or_seq_string")]
	pub id: Vec<String>,
	#[serde(default, deserialize_with = "string_or_seq_string")]
	pub name: Vec<String>,
	#[serde(default, deserialize_with = "string_or_seq_string")]
	pub extension: Vec<String>,
	#[serde(default, deserialize_with = "string_or_seq_string")]
	pub path: Vec<String>,
	#[serde(default, deserialize_with = "read_status_or_seq_read_status")]
	pub read_status: Vec<ReadStatus>,
	#[serde(default, deserialize_with = "string_or_seq_string")]
	pub tags: Vec<String>,

	#[serde(skip_serializing_if = "Option::is_none")]
	pub search: Option<String>,
	#[serde(skip_serializing_if = "Option::is_none")]
	pub metadata: Option<MediaMetadataBaseFilter>,
}

#[derive(Default, Debug, Clone, Deserialize, Serialize, ToSchema, Type)]
pub struct MediaRelationFilter {
	#[serde(skip_serializing_if = "Option::is_none")]
	pub series: Option<SeriesFilter>,
}

#[derive(Default, Debug, Clone, Deserialize, Serialize, ToSchema, Type)]
pub struct MediaFilter {
	#[serde(flatten)]
	pub base_filter: MediaBaseFilter,
	#[serde(flatten)]
	pub relation_filter: MediaRelationFilter,
}

impl MediaFilter {
	pub fn ids(ids: Vec<String>) -> Self {
		Self {
			base_filter: MediaBaseFilter {
				id: ids,
				..Default::default()
			},
			..Default::default()
		}
	}
}

#[skip_serializing_none]
#[derive(Default, Debug, Clone, Deserialize, Serialize, ToSchema, Type)]
pub struct LogFilter {
	pub level: Option<LogLevel>,
	pub job_id: Option<String>,
	#[serde(skip_serializing_if = "Option::is_none")]
	pub timestamp: Option<ValueOrRange<String>>,
}

#[cfg(test)]
mod tests {
	use super::*;
	use serde::{Deserialize, Serialize};
	use stump_core::db::{entity::MediaMetadataOrderBy, query::Direction};

	#[derive(Default, Deserialize, Serialize)]
	struct TestValueOrRange {
		#[serde(skip_serializing_if = "Option::is_none")]
		pub year: Option<ValueOrRange<i32>>,
	}

	#[test]
	fn test_serde_qs_deserialize_value_or_range() {
		let value: TestValueOrRange = serde_qs::from_str("year=1").unwrap();
		match value.year {
			Some(ValueOrRange::Value(v)) => assert_eq!(v, 1),
			_ => panic!("expected value"),
		}

		let value: TestValueOrRange =
			serde_qs::from_str("year[from]=1950&year[to]=2023").unwrap();
		match value.year {
			Some(ValueOrRange::Range(Range { from, to })) => {
				assert_eq!(from.unwrap(), 1950);
				assert_eq!(to.unwrap(), 2023);
			},
			_ => panic!("expected range"),
		}
	}

	#[test]
	fn test_serde_qs_deserialize_partial_range() {
		let value: TestValueOrRange = serde_qs::from_str("year[from]=1950").unwrap();
		match value.year {
			Some(ValueOrRange::Range(Range { from, to })) => {
				assert_eq!(from.unwrap(), 1950);
				assert!(to.is_none());
			},
			_ => panic!("expected range"),
		}

		let value: TestValueOrRange = serde_qs::from_str("year[to]=2023").unwrap();
		match value.year {
			Some(ValueOrRange::Range(Range { from, to })) => {
				assert!(from.is_none());
				assert_eq!(to.unwrap(), 2023);
			},
			_ => panic!("expected range"),
		}
	}

	#[test]
	fn test_serde_qs_deserialize_filterable_query_value_or_range() {
		let value: FilterableQuery<TestValueOrRange, ()> =
			serde_qs::from_str("year=1").unwrap();
		match value.filters.year {
			Some(ValueOrRange::Value(v)) => assert_eq!(v, 1),
			_ => panic!("expected value"),
		}

		let value: FilterableQuery<TestValueOrRange, ()> =
			serde_qs::from_str("year[from]=1950&year[to]=2023").unwrap();
		match value.filters.year {
			Some(ValueOrRange::Range(Range { from, to })) => {
				assert_eq!(from.unwrap(), 1950);
				assert_eq!(to.unwrap(), 2023);
			},
			_ => panic!("expected range"),
		}
	}

	#[test]
	fn test_serde_qs_deserialize_filterable_query_partial_range() {
		let value: FilterableQuery<TestValueOrRange, ()> =
			serde_qs::from_str("year[from]=1950").unwrap();
		match value.filters.year {
			Some(ValueOrRange::Range(Range { from, to })) => {
				assert_eq!(from.unwrap(), 1950);
				assert!(to.is_none());
			},
			_ => panic!("expected range"),
		}

		let value: FilterableQuery<TestValueOrRange, ()> =
			serde_qs::from_str("year[to]=2023").unwrap();
		match value.filters.year {
			Some(ValueOrRange::Range(Range { from, to })) => {
				assert!(from.is_none());
				assert_eq!(to.unwrap(), 2023);
			},
			_ => panic!("expected range"),
		}
	}

	#[test]
	fn test_serialize_serde_qs_relation_order() {
		let order = MediaOrderBy::Metadata(vec![MediaMetadataOrderBy::Title]);
		let serialized = serde_qs::to_string(&order).unwrap();
		assert_eq!(serialized, "metadata[0]=title");

		let filterable_query = FilterableQuery {
			filters: MediaFilter::default(),
			ordering: QueryOrder::<MediaOrderBy> {
				order_by: MediaOrderBy::Metadata(vec![MediaMetadataOrderBy::Title]),
				direction: Direction::Asc,
			},
		};

		let serialized = serde_qs::to_string(&filterable_query).unwrap();
		// FIXME: this breaks the existing patterns, I believe its because the enum is Metadata(Vec<MediaMetadataOrderBy>) and not Metadata { metadata: Vec<MediaMetadataOrderBy> }
		assert_eq!(serialized, "order_by[metadata][0]=title&direction=asc");
	}

	#[test]
	fn test_serde_json_relation() {
		let filter_body = FilterBody {
			filters: MediaFilter {
				relation_filter: MediaRelationFilter {
					series: Some(SeriesFilter {
						relation_filter: SeriesRelationFilter {
							library: Some(LibraryBaseFilter {
								name: vec!["test".to_string()],
								..Default::default()
							}),
							..Default::default()
						},
						..Default::default()
					}),
				},
				..Default::default()
			},
			order_params: vec![QueryOrder {
				order_by: MediaOrderBy::Metadata(vec![MediaMetadataOrderBy::Title]),
				direction: Direction::Asc,
			}],
		};

		let serialized = serde_json::to_string(&filter_body).unwrap();
		// TODO(test): assert
		println!("{}", serialized);
	}
}

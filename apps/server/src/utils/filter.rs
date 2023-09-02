use std::marker::PhantomData;

use serde::{de, Deserialize, Deserializer, Serialize};
use serde_untagged::UntaggedEnumVisitor;
use std::fmt;
use stump_core::db::query::ordering::QueryOrder;
use utoipa::ToSchema;

// TODO: I'd love to support `not` operations somehow

#[derive(Debug, Default, Deserialize, Serialize, ToSchema)]
#[aliases(FilterableLibraryQuery = FilterableQuery<LibraryFilter>, FilterableSeriesQuery = FilterableQuery<SeriesFilter>, FilterableMediaQuery = FilterableQuery<MediaFilter>)]
pub struct FilterableQuery<T>
where
	T: Sized + Default,
{
	#[serde(flatten, default)]
	pub filters: T,
	#[serde(flatten)]
	pub ordering: QueryOrder,
}

impl<T> FilterableQuery<T>
where
	T: Sized + Default,
{
	pub fn get(self) -> Self {
		self
	}
}

fn string_or_seq_string<'de, D>(deserializer: D) -> Result<Vec<String>, D::Error>
where
	D: Deserializer<'de>,
{
	struct StringOrVec(PhantomData<Vec<String>>);

	impl<'de> de::Visitor<'de> for StringOrVec {
		type Value = Vec<String>;

		fn expecting(&self, formatter: &mut fmt::Formatter) -> fmt::Result {
			formatter.write_str("string or list of strings")
		}

		fn visit_str<E>(self, value: &str) -> Result<Self::Value, E>
		where
			E: de::Error,
		{
			Ok(vec![value.to_owned()])
		}

		fn visit_seq<S>(self, visitor: S) -> Result<Self::Value, S::Error>
		where
			S: de::SeqAccess<'de>,
		{
			Deserialize::deserialize(de::value::SeqAccessDeserializer::new(visitor))
		}
	}

	deserializer.deserialize_any(StringOrVec(PhantomData))
}

// See https://github.com/nox/serde_urlencoded/issues/26 and the workaroud solution
// https://docs.rs/serde_qs/0.6.1/serde_qs/#flatten-workaround
// TLDR; there are issues deserializing flattened structs, esp with nested enums.
fn from_optional_str<'de, D, S>(deserializer: D) -> Result<Option<S>, D::Error>
where
	D: serde::Deserializer<'de>,
	S: std::str::FromStr,
{
	let s = <Option<&str> as serde::Deserialize>::deserialize(deserializer)?;
	match s {
		Some(s) => S::from_str(s)
			.map(Some)
			.map_err(|_| serde::de::Error::custom("invalid string")),
		None => Ok(None),
	}
}

pub(crate) fn decode_path_filter(paths: Vec<String>) -> Vec<String> {
	paths
		.iter()
		.map(|path| urlencoding::decode(path))
		.filter_map(Result::ok)
		.map(|cow_str| cow_str.into_owned())
		.collect::<Vec<String>>()
}

pub fn chain_optional_iter<T>(
	required: impl IntoIterator<Item = T>,
	optional: impl IntoIterator<Item = Option<T>>,
) -> Vec<T> {
	required
		.into_iter()
		.map(Some)
		.chain(optional)
		.flatten()
		.collect()
}

#[derive(Deserialize, Debug, Clone, Serialize)]
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

#[derive(Debug, Clone, Serialize, ToSchema)]
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

#[derive(Default, Debug, Clone, Deserialize, Serialize, ToSchema)]
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

#[derive(Default, Debug, Clone, Deserialize, Serialize, ToSchema)]
pub struct LibraryRelationFilter {
	#[serde(skip_serializing_if = "Option::is_none")]
	pub series: Option<SeriesBaseFilter>,
}

#[derive(Default, Debug, Clone, Deserialize, Serialize, ToSchema)]
pub struct LibraryFilter {
	#[serde(flatten)]
	pub base_filter: LibraryBaseFilter,
	#[serde(flatten)]
	pub relation_filter: LibraryRelationFilter,
}

#[derive(Default, Debug, Clone, Deserialize, Serialize, ToSchema)]
pub struct SeriesQueryRelation {
	pub load_media: Option<bool>,
	pub count_media: Option<bool>,
}

#[derive(Default, Debug, Clone, Deserialize, Serialize, ToSchema)]
pub struct UserQueryRelation {
	pub include_read_progresses: Option<bool>,
}

// TODO: decide what others to include
#[derive(Default, Debug, Clone, Deserialize, Serialize, ToSchema)]
pub struct SeriesMedataFilter {
	#[serde(default, deserialize_with = "string_or_seq_string")]
	pub meta_type: Vec<String>,
	#[serde(default, deserialize_with = "string_or_seq_string")]
	pub publisher: Vec<String>,
	#[serde(default, deserialize_with = "string_or_seq_string")]
	pub age_rating: Vec<String>,
	#[serde(default, deserialize_with = "string_or_seq_string")]
	pub status: Vec<String>,

	#[serde(skip_serializing_if = "Option::is_none")]
	pub volume: Option<ValueOrRange<i32>>,
}

#[derive(Default, Debug, Clone, Deserialize, Serialize, ToSchema)]
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

#[derive(Default, Debug, Clone, Deserialize, Serialize, ToSchema)]
pub struct SeriesRelationFilter {
	#[serde(skip_serializing_if = "Option::is_none")]
	pub library: Option<LibraryBaseFilter>,
	#[serde(skip_serializing_if = "Option::is_none")]
	pub media: Option<MediaBaseFilter>,
}

#[derive(Default, Debug, Clone, Deserialize, Serialize, ToSchema)]
pub struct SeriesFilter {
	#[serde(flatten)]
	pub base_filter: SeriesBaseFilter,
	#[serde(flatten)]
	pub relation_filter: SeriesRelationFilter,
}

#[derive(Default, Debug, Clone, Deserialize, Serialize, ToSchema)]
pub struct MediaMedataFilter {
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

	#[serde(skip_serializing_if = "Option::is_none")]
	pub year: Option<ValueOrRange<i32>>,
}

#[derive(Default, Debug, Clone, Deserialize, Serialize, ToSchema)]
pub struct MediaBaseFilter {
	#[serde(default, deserialize_with = "string_or_seq_string")]
	pub id: Vec<String>,
	#[serde(default, deserialize_with = "string_or_seq_string")]
	pub name: Vec<String>,
	#[serde(default, deserialize_with = "string_or_seq_string")]
	pub extension: Vec<String>,
	#[serde(default, deserialize_with = "string_or_seq_string")]
	pub path: Vec<String>,
	#[serde(skip_serializing_if = "Option::is_none")]
	pub search: Option<String>,
	#[serde(skip_serializing_if = "Option::is_none")]
	pub metadata: Option<MediaMedataFilter>,
}

#[derive(Default, Debug, Clone, Deserialize, Serialize, ToSchema)]
pub struct MediaRelationFilter {
	#[serde(skip_serializing_if = "Option::is_none")]
	pub series: Option<SeriesFilter>,
}

#[derive(Default, Debug, Clone, Deserialize, Serialize, ToSchema)]
pub struct MediaFilter {
	#[serde(flatten)]
	pub base_filter: MediaBaseFilter,
	#[serde(flatten)]
	pub relation_filter: MediaRelationFilter,
}

#[cfg(test)]
mod tests {
	use super::*;
	use serde::{Deserialize, Serialize};

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
		let value: FilterableQuery<TestValueOrRange> =
			serde_qs::from_str("year=1").unwrap();
		match value.filters.year {
			Some(ValueOrRange::Value(v)) => assert_eq!(v, 1),
			_ => panic!("expected value"),
		}

		let value: FilterableQuery<TestValueOrRange> =
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
		let value: FilterableQuery<TestValueOrRange> =
			serde_qs::from_str("year[from]=1950").unwrap();
		match value.filters.year {
			Some(ValueOrRange::Range(Range { from, to })) => {
				assert_eq!(from.unwrap(), 1950);
				assert!(to.is_none());
			},
			_ => panic!("expected range"),
		}

		let value: FilterableQuery<TestValueOrRange> =
			serde_qs::from_str("year[to]=2023").unwrap();
		match value.filters.year {
			Some(ValueOrRange::Range(Range { from, to })) => {
				assert!(from.is_none());
				assert_eq!(to.unwrap(), 2023);
			},
			_ => panic!("expected range"),
		}
	}
}

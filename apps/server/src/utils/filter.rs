use std::marker::PhantomData;

use serde::{de, Deserialize, Deserializer, Serialize};
use serde_with::with_prefix;
use std::fmt;
use stump_core::db::query::ordering::QueryOrder;
use utoipa::ToSchema;

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

// TODO: tags
#[derive(Default, Debug, Clone, Deserialize, Serialize, ToSchema)]
pub struct LibraryFilter {
	#[serde(default, deserialize_with = "string_or_seq_string")]
	pub id: Vec<String>,
	#[serde(default, deserialize_with = "string_or_seq_string")]
	pub name: Vec<String>,
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

// TODO: I don't like this convention and I'd rather figure out a way around it.
// I would prefer /series?library[field]=value, but could not get that to work.
with_prefix!(library_prefix "library_");
#[derive(Default, Debug, Clone, Deserialize, Serialize, ToSchema)]
pub struct SeriesFilter {
	#[serde(default, deserialize_with = "string_or_seq_string")]
	pub id: Vec<String>,
	#[serde(default, deserialize_with = "string_or_seq_string")]
	pub name: Vec<String>,

	#[serde(flatten, with = "library_prefix")]
	pub library: Option<LibraryFilter>,
}

#[derive(Default, Debug, Deserialize, Serialize, ToSchema)]
pub struct MediaMedataFilter {
	#[serde(default, deserialize_with = "string_or_seq_string")]
	pub publisher: Vec<String>,
	#[serde(default, deserialize_with = "string_or_seq_string")]
	pub genre: Vec<String>,
}

#[derive(Default, Debug, Deserialize, Serialize, ToSchema)]
pub struct MediaFilter {
	#[serde(default, deserialize_with = "string_or_seq_string")]
	pub id: Vec<String>,
	#[serde(default, deserialize_with = "string_or_seq_string")]
	pub name: Vec<String>,
	#[serde(default, deserialize_with = "string_or_seq_string")]
	pub extension: Vec<String>,
	#[serde(default, deserialize_with = "string_or_seq_string")]
	pub path: Vec<String>,

	#[serde(skip_serializing_if = "Option::is_none")]
	pub metadata: Option<MediaMedataFilter>,
	#[serde(skip_serializing_if = "Option::is_none")]
	pub series: Option<SeriesFilter>,
}

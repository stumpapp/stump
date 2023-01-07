use std::marker::PhantomData;

use serde::{de, Deserialize, Deserializer, Serialize};
use serde_with::with_prefix;
use std::fmt;
use stump_core::prelude::{PagedRequestParams, QueryOrder};

#[derive(Debug, Default, Deserialize, Serialize)]
pub struct FilterableQuery<T>
where
	T: Sized + Default,
{
	#[serde(flatten, default)]
	pub filters: T,
	#[serde(flatten)]
	pub pagination: PagedRequestParams,
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

// TODO: tags
#[derive(Default, Debug, Clone, Deserialize, Serialize)]
pub struct LibraryFilter {
	#[serde(default, deserialize_with = "string_or_seq_string")]
	pub id: Vec<String>,
	#[serde(default, deserialize_with = "string_or_seq_string")]
	pub name: Vec<String>,
}

#[derive(Default, Debug, Clone, Deserialize, Serialize)]
pub struct SeriesRelation {
	pub load_media: Option<bool>,
}

// TODO: I don't like this convention and I'd rather figure out a way around it.
// I would prefer /series?library[field]=value, but could not get that to work.
with_prefix!(library_prefix "library_");

#[derive(Default, Debug, Clone, Deserialize, Serialize)]
pub struct SeriesFilter {
	#[serde(default, deserialize_with = "string_or_seq_string")]
	pub id: Vec<String>,
	#[serde(default, deserialize_with = "string_or_seq_string")]
	pub name: Vec<String>,

	#[serde(flatten, with = "library_prefix")]
	pub library: Option<LibraryFilter>,
}

// TODO: I don't like this convention and I'd rather figure out a way around it.
// I would prefer /media?series[field]=value, but could not get that to work.
with_prefix!(series_prefix "series_");
#[derive(Default, Debug, Deserialize, Serialize)]
pub struct MediaFilter {
	#[serde(default, deserialize_with = "string_or_seq_string")]
	pub id: Vec<String>,
	#[serde(default, deserialize_with = "string_or_seq_string")]
	pub name: Vec<String>,
	#[serde(default, deserialize_with = "string_or_seq_string")]
	pub extension: Vec<String>,

	#[serde(flatten, with = "series_prefix")]
	pub series: Option<SeriesFilter>,
}

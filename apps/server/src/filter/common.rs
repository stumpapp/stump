use std::{marker::PhantomData, str::FromStr};

use serde::{de, Deserialize, Deserializer};
use std::fmt;

use super::query::ReadStatus;

pub fn string_or_seq_string<'de, D>(deserializer: D) -> Result<Vec<String>, D::Error>
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

pub fn read_status_or_seq_read_status<'de, D>(
	deserializer: D,
) -> Result<Vec<ReadStatus>, D::Error>
where
	D: Deserializer<'de>,
{
	struct ReadStatusOrVec(PhantomData<Vec<ReadStatus>>);

	impl<'de> de::Visitor<'de> for ReadStatusOrVec {
		type Value = Vec<ReadStatus>;

		fn expecting(&self, formatter: &mut fmt::Formatter) -> fmt::Result {
			formatter.write_str("string or list of strings")
		}

		fn visit_str<E>(self, value: &str) -> Result<Self::Value, E>
		where
			E: de::Error,
		{
			Ok(vec![ReadStatus::from_str(value).map_err(de::Error::custom)?])
		}

		fn visit_seq<S>(self, visitor: S) -> Result<Self::Value, S::Error>
		where
			S: de::SeqAccess<'de>,
		{
			Deserialize::deserialize(de::value::SeqAccessDeserializer::new(visitor))
		}
	}

	deserializer.deserialize_any(ReadStatusOrVec(PhantomData))
}

// See https://github.com/nox/serde_urlencoded/issues/26 and the workaround solution
// https://docs.rs/serde_qs/0.6.1/serde_qs/#flatten-workaround
// TLDR; there are issues deserializing flattened structs, esp with nested enums.
pub fn from_optional_str<'de, D, S>(deserializer: D) -> Result<Option<S>, D::Error>
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

pub fn decode_path_filter(paths: Vec<String>) -> Vec<String> {
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

#[derive(Debug, Deserialize)]
pub struct AlphabetQueryRecord {
	pub letter: String,
}

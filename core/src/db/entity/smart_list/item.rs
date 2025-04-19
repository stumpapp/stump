use std::str::FromStr;

use serde::{Deserialize, Serialize};
use specta::Type;
use std::fmt;
use utoipa::ToSchema;

use crate::db::entity::{Library, Media, Series};

// TODO: ordering
#[derive(Default, Clone, Copy, Debug, Deserialize, Serialize, Type, ToSchema)]
pub enum SmartListItemGrouping {
	/// Group by books, which is effectively no grouping at all
	#[default]
	#[serde(rename = "BY_BOOKS")]
	ByBooks,
	/// Group the books by their series
	#[serde(rename = "BY_SERIES")]
	BySeries,
	/// Group the books by their library
	#[serde(rename = "BY_LIBRARY")]
	ByLibrary,
}

impl FromStr for SmartListItemGrouping {
	type Err = String;

	fn from_str(s: &str) -> Result<Self, Self::Err> {
		match s.to_lowercase().as_str() {
			"by_books" => Ok(Self::ByBooks),
			"by_series" => Ok(Self::BySeries),
			"by_library" => Ok(Self::ByLibrary),
			_ => Err(format!("Invalid item grouping: {s}")),
		}
	}
}

impl fmt::Display for SmartListItemGrouping {
	fn fmt(&self, f: &mut fmt::Formatter) -> fmt::Result {
		match self {
			SmartListItemGrouping::ByBooks => write!(f, "BY_BOOKS"),
			SmartListItemGrouping::BySeries => write!(f, "BY_SERIES"),
			SmartListItemGrouping::ByLibrary => write!(f, "BY_LIBRARY"),
		}
	}
}

impl From<&str> for SmartListItemGrouping {
	fn from(s: &str) -> Self {
		match s.to_lowercase().as_str() {
			"by_books" => Self::ByBooks,
			"by_series" => Self::BySeries,
			"by_library" => Self::ByLibrary,
			_ => Self::ByBooks,
		}
	}
}

#[derive(Debug, Deserialize, Serialize, Type, ToSchema)]
pub struct SmartListItemGroup<E> {
	pub entity: E,

	pub books: Vec<Media>,
}

#[derive(Debug, Deserialize, Serialize, Type, ToSchema)]
#[serde(tag = "type", content = "items")]
pub enum SmartListItems {
	Books(Vec<Media>),

	Series(Vec<SmartListItemGroup<Series>>),

	Library(Vec<SmartListItemGroup<Library>>),
}

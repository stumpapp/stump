use std::{fmt, str::FromStr};

use serde::{Deserialize, Serialize};
use specta::Type;
use utoipa::ToSchema;

use crate::{
	db::entity::{Cursor, Series, Tag},
	prisma::{library, library_config},
};

use super::LibraryConfig;

#[derive(Debug, Clone, Deserialize, Serialize, Type, ToSchema)]
pub struct Library {
	pub id: String,
	/// The name of the library. ex: "Marvel Comics"
	pub name: String,
	/// The description of the library. ex: "The best library ever"
	pub description: Option<String>,
	/// The emoji associated with the library. ex: "📚"
	pub emoji: Option<String>,
	/// The path to the library. ex: "/home/user/Library"
	pub path: String,
	/// The status of the library since last scan or access. ex: "READY" or "MISSING"
	pub status: String,
	// The date in which the library was last updated. This is usually after a scan. ex: "2022-04-20 04:20:69"
	// TODO(specta): replace with DateTime<FixedOffset>
	pub updated_at: String,
	/// The series that are in this library. Will be `None` only if the relation is not loaded.
	pub series: Option<Vec<Series>>,
	/// The tags associated with this library. Will be `None` only if the relation is not loaded.
	pub tags: Option<Vec<Tag>>,
	/// The configuration for the library. Will be Default only if the relation is not loaded.
	pub config: LibraryConfig,
}

impl Cursor for Library {
	fn cursor(&self) -> String {
		self.id.clone()
	}
}

#[derive(Debug, Clone, Deserialize, Serialize, PartialEq, Eq, Type, ToSchema)]
pub enum LibraryPattern {
	#[serde(rename = "SERIES_BASED")]
	SeriesBased,
	#[serde(rename = "COLLECTION_BASED")]
	CollectionBased,
}

impl FromStr for LibraryPattern {
	type Err = String;

	fn from_str(s: &str) -> Result<Self, Self::Err> {
		let uppercase = s.to_uppercase();

		match uppercase.as_str() {
			"SERIES_BASED" => Ok(LibraryPattern::SeriesBased),
			"COLLECTION_BASED" => Ok(LibraryPattern::CollectionBased),
			"" => Ok(LibraryPattern::default()),
			_ => Err(format!("Invalid library pattern: {}", s)),
		}
	}
}

impl Default for LibraryPattern {
	fn default() -> Self {
		Self::SeriesBased
	}
}

impl From<String> for LibraryPattern {
	fn from(s: String) -> Self {
		LibraryPattern::from_str(&s).unwrap_or_default()
	}
}

impl fmt::Display for LibraryPattern {
	fn fmt(&self, f: &mut fmt::Formatter<'_>) -> fmt::Result {
		match self {
			LibraryPattern::SeriesBased => write!(f, "SERIES_BASED"),
			LibraryPattern::CollectionBased => write!(f, "COLLECTION_BASED"),
		}
	}
}

#[derive(Serialize, Deserialize, Debug, PartialEq, Eq, Copy, Clone, Type, ToSchema)]
pub enum LibraryScanMode {
	#[serde(rename = "DEFAULT")]
	Default,
	#[serde(rename = "NONE")]
	None,
}

impl FromStr for LibraryScanMode {
	type Err = String;

	fn from_str(s: &str) -> Result<Self, Self::Err> {
		let uppercase = s.to_uppercase();

		match uppercase.as_str() {
			"DEFAULT" => Ok(LibraryScanMode::Default),
			"NONE" => Ok(LibraryScanMode::None),
			"" => Ok(LibraryScanMode::default()),
			_ => Err(format!("Invalid library scan mode: {}", s)),
		}
	}
}

impl From<String> for LibraryScanMode {
	fn from(s: String) -> Self {
		LibraryScanMode::from_str(&s).unwrap_or_default()
	}
}

impl Default for LibraryScanMode {
	fn default() -> Self {
		Self::Default
	}
}

#[derive(Deserialize, Serialize, Type, ToSchema)]
pub struct LibraryStats {
	series_count: u64,
	book_count: u64,
	total_bytes: u64,
	completed_books: u64,
	in_progress_books: u64,
}

impl From<library::Data> for Library {
	fn from(data: library::Data) -> Library {
		let series = data
			.series()
			.ok()
			.map(|series| series.iter().map(|s| s.to_owned().into()).collect());

		let tags = data
			.tags()
			.ok()
			.map(|tags| tags.iter().map(|tag| tag.to_owned().into()).collect());

		let config = data.config().map_or_else(
			|_| LibraryConfig::default(),
			|config| config.to_owned().into(),
		);

		Library {
			id: data.id,
			name: data.name,
			description: data.description,
			emoji: data.emoji,
			path: data.path,
			status: data.status,
			updated_at: data.updated_at.to_rfc3339(),
			series,
			tags,
			config,
		}
	}
}

impl From<(library::Data, library_config::Data)> for Library {
	fn from((library, library_config): (library::Data, library_config::Data)) -> Library {
		let series = match library.series() {
			Ok(series) => Some(series.iter().map(|s| s.to_owned().into()).collect()),
			Err(_e) => None,
		};

		let tags = match library.tags() {
			Ok(tags) => Some(tags.iter().map(|tag| tag.to_owned().into()).collect()),
			Err(_e) => None,
		};

		Library {
			id: library.id,
			name: library.name,
			description: library.description,
			emoji: library.emoji,
			path: library.path,
			status: library.status,
			updated_at: library.updated_at.to_rfc3339(),
			series,
			tags,
			config: LibraryConfig::from(library_config),
		}
	}
}

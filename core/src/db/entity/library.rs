use std::{fmt, str::FromStr};

use serde::{Deserialize, Serialize};
use specta::Type;
use utoipa::ToSchema;

use crate::{
	filesystem::image::ImageProcessorOptions,
	prisma::{self, library},
};

use super::{series::Series, tag::Tag, Cursor};

//////////////////////////////////////////////
//////////////// PRISMA MACROS ///////////////
//////////////////////////////////////////////

library::include!(library_series_ids_media_ids_include {
	series: include {
		media: select { id }
	}
});

///////////////////////////////////////////////
//////////////////// MODELS ///////////////////
///////////////////////////////////////////////

#[derive(Debug, Clone, Deserialize, Serialize, Type, ToSchema)]
pub struct Library {
	pub id: String,
	/// The name of the library. ex: "Marvel Comics"
	pub name: String,
	/// The description of the library. ex: "The best library ever"
	pub description: Option<String>,
	/// The path to the library. ex: "/home/user/Library"
	pub path: String,
	/// The status of the library since last scan or access. ex: "READY" or "MISSING"
	pub status: String,
	// The date in which the library was last updated. This is usually after a scan. ex: "2022-04-20 04:20:69"
	pub updated_at: String,
	/// The series that are in this library. Will be `None` only if the relation is not loaded.
	pub series: Option<Vec<Series>>,
	/// The tags associated with this library. Will be `None` only if the relation is not loaded.
	pub tags: Option<Vec<Tag>>,
	/// The options of the library. Will be Default only if the relation is not loaded.
	pub library_options: LibraryOptions,
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

#[derive(Debug, Clone, Deserialize, Serialize, Type, ToSchema, Default)]
pub struct LibraryOptions {
	// Note: this isn't really an Option, but I felt it was a little verbose
	// to create an entirely new struct Create/UpdateLibraryOptions for just one
	// field... even though I ~kinda~ did that below lol for Create/UpdateLibraryArgs lol.
	pub id: Option<String>,
	pub convert_rar_to_zip: bool,
	pub hard_delete_conversions: bool,
	pub library_pattern: LibraryPattern,
	pub thumbnail_config: Option<ImageProcessorOptions>,
	// TODO: don't make Option after pcr supports nested create
	// https://github.com/Brendonovich/prisma-client-rust/issues/44
	pub library_id: Option<String>,
}

impl LibraryOptions {
	pub fn is_collection_based(&self) -> bool {
		self.library_pattern == LibraryPattern::CollectionBased
	}
}

#[derive(Serialize, Deserialize, Debug, PartialEq, Eq, Copy, Clone, Type, ToSchema)]
pub enum LibraryScanMode {
	#[serde(rename = "SYNC")]
	Sync,
	#[serde(rename = "BATCHED")]
	Batched,
	#[serde(rename = "NONE")]
	None,
}

impl FromStr for LibraryScanMode {
	type Err = String;

	fn from_str(s: &str) -> Result<Self, Self::Err> {
		let uppercase = s.to_uppercase();

		match uppercase.as_str() {
			"SYNC" => Ok(LibraryScanMode::Sync),
			"BATCHED" => Ok(LibraryScanMode::Batched),
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
		Self::Batched
	}
}

#[derive(Deserialize, Serialize, Type, ToSchema)]
pub struct LibrariesStats {
	series_count: u64,
	book_count: u64,
	total_bytes: u64,
}

//////////////////////////////////////////////
//////////////////// INPUTS //////////////////
//////////////////////////////////////////////

#[derive(Deserialize, Debug, Type, ToSchema)]
pub struct CreateLibrary {
	/// The name of the library to create.
	pub name: String,
	/// The path to the library to create, i.e. where the directory is on the filesystem.
	pub path: String,
	/// Optional text description of the library.
	pub description: Option<String>,
	/// Optional tags to assign to the library.
	pub tags: Option<Vec<Tag>>,
	/// Optional flag to indicate if the how the library should be scanned after creation. Default is `BATCHED`.
	pub scan_mode: Option<LibraryScanMode>,
	/// Optional options to apply to the library. When not provided, the default options will be used.
	pub library_options: Option<LibraryOptions>,
}

#[derive(Deserialize, Debug, Type, ToSchema)]
pub struct UpdateLibrary {
	pub id: String,
	/// The updated name of the library.
	pub name: String,
	/// The updated path of the library.
	pub path: String,
	/// The updated description of the library.
	pub description: Option<String>,
	/// The updated tags of the library.
	pub tags: Option<Vec<Tag>>,
	/// The tags to remove from the library.
	pub removed_tags: Option<Vec<Tag>>,
	/// The updated options of the library.
	pub library_options: LibraryOptions,
	/// Optional flag to indicate how the library should be automatically scanned after update. Default is `BATCHED`.
	pub scan_mode: Option<LibraryScanMode>,
}

///////////////////////////////////////////////
////////////////// CONVERSIONS ////////////////
///////////////////////////////////////////////

impl From<prisma::library_options::Data> for LibraryOptions {
	fn from(data: prisma::library_options::Data) -> LibraryOptions {
		LibraryOptions {
			id: Some(data.id),
			convert_rar_to_zip: data.convert_rar_to_zip,
			hard_delete_conversions: data.hard_delete_conversions,
			library_pattern: LibraryPattern::from(data.library_pattern),
			thumbnail_config: data.thumbnail_config.map(|config| {
				ImageProcessorOptions::try_from(config).unwrap_or_default()
			}),
			library_id: data.library_id,
		}
	}
}

impl From<&prisma::library_options::Data> for LibraryOptions {
	fn from(data: &prisma::library_options::Data) -> LibraryOptions {
		LibraryOptions {
			id: Some(data.id.clone()),
			convert_rar_to_zip: data.convert_rar_to_zip,
			hard_delete_conversions: data.hard_delete_conversions,
			library_pattern: LibraryPattern::from(data.library_pattern.clone()),
			thumbnail_config: data.thumbnail_config.clone().map(|config| {
				ImageProcessorOptions::try_from(config).unwrap_or_default()
			}),
			library_id: data.library_id.clone(),
		}
	}
}

impl From<prisma::library::Data> for Library {
	fn from(data: prisma::library::Data) -> Library {
		let series = match data.series() {
			Ok(series) => Some(series.iter().map(|s| s.to_owned().into()).collect()),
			Err(_e) => None,
		};

		let tags = match data.tags() {
			Ok(tags) => Some(tags.iter().map(|tag| tag.to_owned().into()).collect()),
			Err(_e) => None,
		};

		let library_options = match data.library_options() {
			Ok(library_options) => library_options.to_owned().into(),
			Err(_e) => LibraryOptions::default(),
		};

		Library {
			id: data.id,
			name: data.name,
			description: data.description,
			path: data.path,
			status: data.status,
			updated_at: data.updated_at.to_string(),
			series,
			tags,
			library_options,
		}
	}
}

impl From<(prisma::library::Data, prisma::library_options::Data)> for Library {
	fn from(
		(library, library_options): (
			prisma::library::Data,
			prisma::library_options::Data,
		),
	) -> Library {
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
			path: library.path,
			status: library.status,
			updated_at: library.updated_at.to_string(),
			series,
			tags,
			library_options: LibraryOptions::from(library_options),
		}
	}
}

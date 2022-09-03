use rocket_okapi::JsonSchema;
use serde::{Deserialize, Serialize};
use specta::Type;

use crate::prisma;

use super::{series::Series, tag::Tag};

#[derive(Debug, Clone, Deserialize, Serialize, JsonSchema, Type)]
#[serde(rename_all = "camelCase")]
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

#[derive(Debug, Clone, Deserialize, Serialize, JsonSchema, Type)]
#[serde(rename_all = "camelCase")]
pub struct LibraryOptions {
	// Note: this isn't really an Option, but I felt it was a little verbose
	// to create an entirely new struct Create/UpdateLibraryOptions for just one
	// field... even though I ~kinda~ did that below lol for Create/UpdateLibraryArgs lol.
	pub id: Option<String>,
	pub convert_rar_to_zip: bool,
	pub hard_delete_conversions: bool,
	pub create_webp_thumbnails: bool,
	// TODO: don't make Option after pcr supports nested create
	// https://github.com/Brendonovich/prisma-client-rust/issues/44
	pub library_id: Option<String>,
}

impl Default for LibraryOptions {
	fn default() -> Self {
		Self {
			id: None,
			convert_rar_to_zip: false,
			hard_delete_conversions: false,
			create_webp_thumbnails: false,
			library_id: None,
		}
	}
}

#[derive(Deserialize, JsonSchema, Type)]
#[serde(rename_all = "camelCase")]
pub struct CreateLibraryArgs {
	/// The name of the library to create.
	pub name: String,
	/// The path to the library to create, i.e. where the directory is on the filesystem.
	pub path: String,
	/// Optional text description of the library.
	pub description: Option<String>,
	/// Optional tags to assign to the library.
	pub tags: Option<Vec<Tag>>,
	/// Optional flag to indicate if the library should be automatically scanned after creation. Default is `true`.
	pub scan: Option<bool>,
	/// Optional options to apply to the library. When not provided, the default options will be used.
	pub library_options: Option<LibraryOptions>,
}

#[derive(Deserialize, JsonSchema, Type)]
#[serde(rename_all = "camelCase")]
pub struct UpdateLibraryArgs {
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
	/// Optional flag to indicate if the library should be automatically scanned after update. Default is `true`.
	pub scan: Option<bool>,
}

#[derive(Deserialize, Serialize, JsonSchema, Type)]
#[serde(rename_all = "camelCase")]
pub struct LibrariesStats {
	series_count: u64,
	book_count: u64,
	total_bytes: u64,
}

impl Into<LibraryOptions> for prisma::library_options::Data {
	fn into(self) -> LibraryOptions {
		LibraryOptions {
			id: Some(self.id),
			convert_rar_to_zip: self.convert_rar_to_zip,
			hard_delete_conversions: self.hard_delete_conversions,
			create_webp_thumbnails: self.create_webp_thumbnails,
			library_id: self.library_id,
		}
	}
}

impl Into<Library> for prisma::library::Data {
	fn into(self) -> Library {
		let series = match self.series() {
			Ok(series) => Some(series.into_iter().map(|s| s.to_owned().into()).collect()),
			Err(e) => {
				log::trace!("Failed to load series for library: {}", e);
				None
			},
		};

		let tags = match self.tags() {
			Ok(tags) => Some(tags.into_iter().map(|tag| tag.to_owned().into()).collect()),
			Err(e) => {
				log::trace!("Failed to load tags for library: {}", e);
				None
			},
		};

		let library_options = match self.library_options() {
			Ok(library_options) => library_options.to_owned().into(),
			Err(e) => {
				log::trace!("Failed to load library options for library: {}", e);
				LibraryOptions::default()
			},
		};

		Library {
			id: self.id,
			name: self.name,
			description: self.description,
			path: self.path,
			status: self.status,
			updated_at: self.updated_at.to_string(),
			series,
			tags,
			library_options,
		}
	}
}

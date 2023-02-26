use serde::{Deserialize, Serialize};
use specta::Type;
use utoipa::ToSchema;

use crate::db::models::{LibraryOptions, LibraryScanMode, Tag};

#[derive(Debug, Clone, Deserialize, Type, ToSchema)]
pub struct UserPreferencesUpdate {
	pub id: String,
	pub locale: String,
	pub library_layout_mode: String,
	pub series_layout_mode: String,
	pub collection_layout_mode: String,
}

#[derive(Debug)]
pub struct DecodedCredentials {
	pub username: String,
	pub password: String,
}

#[derive(Deserialize, Type, ToSchema)]
pub struct LoginOrRegisterArgs {
	pub username: String,
	pub password: String,
}

#[derive(Deserialize, Type, ToSchema)]
pub struct UpdateUserArgs {
	pub username: String,
	pub password: Option<String>,
}

#[derive(Serialize, Type, ToSchema)]
pub struct ClaimResponse {
	pub is_claimed: bool,
}

#[derive(Deserialize, Debug, Type, ToSchema)]
pub struct CreateLibraryArgs {
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
	/// Optional flag to indicate how the library should be automatically scanned after update. Default is `BATCHED`.
	pub scan_mode: Option<LibraryScanMode>,
}

#[derive(Serialize, Deserialize, ToSchema)]
pub struct ScanQueryParam {
	pub scan_mode: Option<String>,
}

#[derive(Debug, Clone, Serialize, Deserialize, Type, ToSchema)]
pub struct CreateReadingList {
	pub id: String,
	pub media_ids: Vec<String>,
}

#[derive(Deserialize, Type, ToSchema)]
pub struct CreateTags {
	pub tags: Vec<String>,
}

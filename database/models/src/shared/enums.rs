use sea_orm::{prelude::*, DeriveActiveEnum, EnumIter};
use serde::{Deserialize, Serialize};
use strum::{Display, EnumString};

/// The different roles a user may have for a role-based access control system scoped
/// to a specific entity
#[derive(
	Eq,
	Copy,
	Hash,
	Debug,
	Clone,
	Default,
	EnumIter,
	PartialEq,
	Serialize,
	Deserialize,
	DeriveActiveEnum,
)]
#[sea_orm(rs_type = "i32", db_type = "Integer")]
pub enum AccessRole {
	#[default]
	Reader = 1,
	Writer = 2,
	CoCreator = 3,
}

/// The visibility of a shareable entity
#[derive(
	Eq,
	Copy,
	Hash,
	Debug,
	Clone,
	Default,
	EnumIter,
	PartialEq,
	Serialize,
	Deserialize,
	DeriveActiveEnum,
)]
#[sea_orm(
	rs_type = "String",
	rename_all = "SCREAMING_SNAKE_CASE",
	db_type = "String(StringLen::None)"
)]
#[serde(rename_all = "SCREAMING_SNAKE_CASE")]
pub enum EntityVisibility {
	Public,
	Shared,
	#[default]
	Private,
}

/// The different statuses a file reference can have
#[derive(
	Eq,
	Copy,
	Hash,
	Debug,
	Clone,
	Default,
	EnumIter,
	PartialEq,
	Serialize,
	Deserialize,
	DeriveActiveEnum,
	EnumString,
	Display,
)]
#[sea_orm(
	rs_type = "String",
	rename_all = "SCREAMING_SNAKE_CASE",
	db_type = "String(StringLen::None)"
)]
#[serde(rename_all = "SCREAMING_SNAKE_CASE")]
pub enum FileStatus {
	Unknown,
	#[default]
	Ready,
	Unsupported,
	Error,
	Missing,
}

/// The different types of layouts a client-side interface might present to a user
/// for a collection of items
#[derive(
	Eq,
	Copy,
	Hash,
	Debug,
	Clone,
	EnumIter,
	PartialEq,
	Serialize,
	Deserialize,
	DeriveActiveEnum,
)]
#[sea_orm(
	rs_type = "String",
	rename_all = "SCREAMING_SNAKE_CASE",
	db_type = "String(StringLen::None)"
)]
#[serde(rename_all = "SCREAMING_SNAKE_CASE")]
pub enum InterfaceLayout {
	Grid,
	Table,
}

/// The different patterns a library may be organized by
#[derive(
	Eq,
	Copy,
	Hash,
	Debug,
	Clone,
	EnumIter,
	PartialEq,
	Serialize,
	Deserialize,
	DeriveActiveEnum,
)]
#[sea_orm(
	rs_type = "String",
	rename_all = "SCREAMING_SNAKE_CASE",
	db_type = "String(StringLen::None)"
)]
#[serde(rename_all = "SCREAMING_SNAKE_CASE")]
pub enum LibraryPattern {
	SeriesBased,
	CollectionBased,
}

/// The different reading directions supported by any Stump reader
#[derive(
	Eq,
	Copy,
	Hash,
	Debug,
	Clone,
	Default,
	EnumIter,
	PartialEq,
	Serialize,
	Deserialize,
	DeriveActiveEnum,
)]
#[sea_orm(
	rs_type = "String",
	rename_all = "SCREAMING_SNAKE_CASE",
	db_type = "String(StringLen::None)"
)]
#[serde(rename_all = "SCREAMING_SNAKE_CASE")]
pub enum ReadingDirection {
	#[default]
	Ltr,
	Rtl,
}

/// The different ways an image may be scaled to fit a reader's viewport
#[derive(
	Eq,
	Copy,
	Hash,
	Debug,
	Clone,
	Default,
	EnumIter,
	PartialEq,
	Serialize,
	Deserialize,
	DeriveActiveEnum,
)]
#[sea_orm(
	rs_type = "String",
	rename_all = "SCREAMING_SNAKE_CASE",
	db_type = "String(StringLen::None)"
)]
#[serde(rename_all = "SCREAMING_SNAKE_CASE")]
pub enum ReadingImageScaleFit {
	#[default]
	Height,
	Width,
	#[serde(alias = "ORIGINAL")]
	None,
}

/// The different reading modes supported by any Stump reader
#[derive(
	Eq,
	Copy,
	Hash,
	Debug,
	Clone,
	Default,
	EnumIter,
	PartialEq,
	Serialize,
	Deserialize,
	DeriveActiveEnum,
)]
#[sea_orm(
	rs_type = "String",
	rename_all = "SCREAMING_SNAKE_CASE",
	db_type = "String(StringLen::None)"
)]
#[serde(rename_all = "SCREAMING_SNAKE_CASE")]
pub enum ReadingMode {
	#[default]
	Paged,
	ContinuousVertical,
	ContinuousHorizontal,
}

/// The permissions a user may be granted
#[derive(
	Eq,
	Copy,
	Hash,
	Debug,
	Clone,
	EnumIter,
	PartialEq,
	Serialize,
	Deserialize,
	DeriveActiveEnum,
	EnumString,
	Display,
)]
#[sea_orm(
	rs_type = "String",
	rename_all = "snake_case",
	db_type = "String(StringLen::None)"
)]
#[serde(rename_all = "snake_case")]
pub enum UserPermission {
	/// Grant access to read/create their own API keys
	AccessAPIKeys,
	/// Grant access to the koreader sync feature
	AccessKoreaderSync,
	///TODO: Expand permissions for bookclub + smartlist
	/// Grant access to the book club feature
	AccessBookClub,
	/// Grant access to create a book club (access book club)
	CreateBookClub,
	/// Grant access to read any emailers in the system
	EmailerRead,
	/// Grant access to create an emailer
	EmailerCreate,
	/// Grant access to manage an emailer
	EmailerManage,
	/// Grant access to send an email
	EmailSend,
	/// Grant access to send an arbitrary email, bypassing any registered device requirements
	EmailArbitrarySend,
	/// Grant access to access the smart list feature. This includes the ability to create and edit smart lists
	AccessSmartList,
	/// Grant access to access the file explorer
	FileExplorer,
	/// Grant access to upload files to a library
	UploadFile,
	/// Grant access to download files from a library
	DownloadFile,
	/// Grant access to create a library
	CreateLibrary,
	/// Grant access to edit basic details about the library
	EditLibrary,
	/// Grant access to scan the library for new files
	ScanLibrary,
	/// Grant access to manage the library (scan,edit,manage relations)
	ManageLibrary,
	/// Grant access to delete the library (manage library)
	DeleteLibrary,
	/// Grant access to read users.
	///
	/// Note that this is explicitly for querying users via user-specific endpoints.
	/// This would not affect relational queries, such as members in a common book club.
	ReadUsers,
	/// Grant access to manage users (create,edit,delete)
	ManageUsers,
	ReadNotifier,
	/// Grant access to create a notifier
	CreateNotifier,
	/// Grant access to manage a notifier
	ManageNotifier,
	/// Grant access to delete a notifier
	DeleteNotifier,
	/// Grant access to manage the server. This is effectively a step below server owner
	ManageServer,
}

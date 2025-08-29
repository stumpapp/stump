use async_graphql::Enum;
use sea_orm::{prelude::*, DeriveActiveEnum, EnumIter};
use serde::{Deserialize, Serialize};
use strum::{Display, EnumString};

// TODO: Consider not using screaming case?

/// The different roles a user may have for a role-based access control system scoped
/// to a specific entity
#[derive(
	Eq,
	Copy,
	Hash,
	Debug,
	Clone,
	Default,
	Enum,
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

// #[derive(
// 	Eq,
// 	Copy,
// 	Hash,
// 	Debug,
// 	Clone,
// 	Default,
// 	EnumIter,
// 	PartialEq,
// 	Serialize,
// 	Deserialize,
// 	DeriveActiveEnum,
// 	Enum,
// 	EnumString,
// 	Display,
// )]
// #[sea_orm(
// 	rs_type = "String",
// 	rename_all = "SCREAMING_SNAKE_CASE",
// 	db_type = "String(StringLen::None)"
// )]
// #[serde(rename_all = "SCREAMING_SNAKE_CASE")]
// #[strum(serialize_all = "SCREAMING_SNAKE_CASE")]
// pub enum DeviceKind {
// 	EbookReader,
// 	Phone,
// 	Tablet,
// 	#[default]
// 	Unknown,
// }

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
	Enum,
	EnumString,
	Display,
)]
#[sea_orm(
	rs_type = "String",
	rename_all = "SCREAMING_SNAKE_CASE",
	db_type = "String(StringLen::None)"
)]
#[serde(rename_all = "SCREAMING_SNAKE_CASE")]
#[strum(serialize_all = "SCREAMING_SNAKE_CASE")]
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
	Enum,
)]
#[sea_orm(
	rs_type = "String",
	rename_all = "SCREAMING_SNAKE_CASE",
	db_type = "String(StringLen::None)"
)]
#[serde(rename_all = "SCREAMING_SNAKE_CASE")]
#[strum(serialize_all = "SCREAMING_SNAKE_CASE")]
pub enum FileStatus {
	Unknown,
	#[default]
	Ready,
	Unsupported,
	Error,
	Missing,
}

impl FileStatus {
	pub fn is_recovered_if_present(&self) -> bool {
		matches!(self, FileStatus::Missing | FileStatus::Unknown)
	}
}

impl From<FileStatus> for String {
	fn from(val: FileStatus) -> Self {
		val.to_string()
	}
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
	Enum,
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

#[derive(
	Eq,
	Copy,
	Hash,
	Debug,
	Default,
	Clone,
	EnumIter,
	PartialEq,
	Serialize,
	Deserialize,
	DeriveActiveEnum,
	Enum,
	EnumString,
	Display,
)]
#[sea_orm(
	rs_type = "String",
	rename_all = "SCREAMING_SNAKE_CASE",
	db_type = "String(StringLen::None)"
)]
#[strum(serialize_all = "SCREAMING_SNAKE_CASE")]
#[serde(rename_all = "SCREAMING_SNAKE_CASE")]
pub enum JobStatus {
	Running,
	Paused,
	Completed,
	Cancelled,
	Failed,
	#[default]
	Queued,
}

impl JobStatus {
	/// A helper function to determine if a job status is resolved. A job is considered
	/// resolved if it is in a final state (Completed, Cancelled, or Failed).
	pub fn is_resolved(&self) -> bool {
		matches!(
			self,
			JobStatus::Completed | JobStatus::Cancelled | JobStatus::Failed
		)
	}

	/// A helper function to determine if a job status is successful. A job is considered
	/// successful if it is in a Completed state.
	pub fn is_success(&self) -> bool {
		matches!(self, JobStatus::Completed)
	}

	/// A helper function to determine if a job status is pending. A job is considered pending
	/// if it is in a Running, Paused, or Queued state.
	pub fn is_pending(&self) -> bool {
		matches!(
			self,
			JobStatus::Running | JobStatus::Paused | JobStatus::Queued
		)
	}
}

/// The different patterns a library may be organized by
#[derive(
	Eq,
	Copy,
	Hash,
	Debug,
	Default,
	Clone,
	EnumIter,
	PartialEq,
	Serialize,
	Deserialize,
	DeriveActiveEnum,
	Enum,
)]
#[sea_orm(
	rs_type = "String",
	rename_all = "SCREAMING_SNAKE_CASE",
	db_type = "String(StringLen::None)"
)]
#[serde(rename_all = "SCREAMING_SNAKE_CASE")]
pub enum LibraryPattern {
	#[default]
	SeriesBased,
	CollectionBased,
}

#[derive(
	Eq,
	Copy,
	Hash,
	Debug,
	Default,
	Clone,
	EnumIter,
	PartialEq,
	Serialize,
	Deserialize,
	DeriveActiveEnum,
	Enum,
	EnumString,
	Display,
)]
#[sea_orm(
	rs_type = "String",
	rename_all = "SCREAMING_SNAKE_CASE",
	db_type = "String(StringLen::None)"
)]
#[strum(serialize_all = "SCREAMING_SNAKE_CASE")]
#[serde(rename_all = "SCREAMING_SNAKE_CASE")]
pub enum LogLevel {
	Error,
	Warn,
	#[default]
	Info,
	Debug,
}

/// An enum representing the different types of metadata resets that can occur,
/// which manifest differently depending on the context
#[derive(
	Eq,
	Copy,
	Hash,
	Debug,
	Clone,
	PartialEq,
	Serialize,
	Deserialize,
	Enum,
	EnumString,
	Display,
)]
#[strum(serialize_all = "SCREAMING_SNAKE_CASE")]
#[serde(rename_all = "SCREAMING_SNAKE_CASE")]
pub enum MetadataResetImpact {
	/// A reset which affects one or more series depending on context:
	/// - When mutating a library, will reset all series metadata
	/// - When mutating a series, will reset all its own metadata
	Series,
	/// A reset which affects one or more books depending on context:
	/// - When mutating a library, will reset all book metadata in all
	///   library's series
	/// - When mutating a series, will reset all its own books
	/// - When mutating a book, will reset all its own metadata
	Books,
	/// A reset which affects multiple different entities (series, books) depending on context:
	/// - When mutating a library, will reset all metadata in all library's series and books
	/// - When mutating a series, will reset all its own metadata and books
	Everything,
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
	Enum,
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
	Enum,
	Display,
)]
#[sea_orm(
	rs_type = "String",
	rename_all = "SCREAMING_SNAKE_CASE",
	db_type = "String(StringLen::None)"
)]
#[serde(rename_all = "SCREAMING_SNAKE_CASE")]
pub enum ReadingStatus {
	#[default]
	Reading,
	Finished,
	Abandoned,
	NotStarted,
}

impl From<ReadingStatus> for String {
	fn from(val: ReadingStatus) -> Self {
		val.to_string()
	}
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
	Enum,
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
	Auto,
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
	Enum,
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
	Enum,
)]
#[sea_orm(
	rs_type = "String",
	rename_all = "SCREAMING_SNAKE_CASE",
	db_type = "String(StringLen::None)"
)]
#[serde(rename_all = "SCREAMING_SNAKE_CASE")]
pub enum SupportedFont {
	AtkinsonHyperlegible,
	Bitter,
	Charis,
	#[default]
	Inter,
	LibreBaskerville,
	Literata,
	Nunito,
	OpenDyslexic,
	// TODO(383): Support custom fonts
	// Custom(String),
}

// TODO(permissions): Consider adding the following:
// - Access to library logs
// - Access to system logs
// - Access to jobs and job management

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
	Enum,
	EnumString,
	Display,
)]
#[sea_orm(
	rs_type = "String",
	rename_all = "SCREAMING_SNAKE_CASE",
	db_type = "String(StringLen::None)"
)]
#[serde(rename_all = "SCREAMING_SNAKE_CASE")]
#[strum(serialize_all = "SCREAMING_SNAKE_CASE")]
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
	/// Grants access to edit any existing metadata for media/series. This will only
	/// be applied to the database-level metadata.
	EditMetadata,
	/// Grants access to write back the database-level metadata for media/series.
	/// This should be treated with caution, as technically it would allow for
	/// overwriting existing metadata at the file-level
	WriteBackMetadata,
	/// Grant access to delete the library (manage library)
	DeleteLibrary,
	/// Grant access to read users.
	///
	/// Note that this is explicitly for querying users via user-specific endpoints.
	/// This would not affect relational queries, such as members in a common book club.
	ReadUsers,
	/// Grant access to manage users (create,edit,delete)
	ManageUsers,
	/// Grant access to read notifiers
	ReadNotifier,
	/// Grant access to create a notifier
	CreateNotifier,
	/// Grant access to manage a notifier
	ManageNotifier,
	/// Grant access to delete a notifier
	DeleteNotifier,
	/// Grant access to read jobs
	ReadJobs,
	/// Grant access to manage jobs, like pausing, resuming, deleting, or cancelling them
	ManageJobs,
	/// Grant access to read application-level logs, e.g. job logs
	ReadPersistedLogs,
	/// Grant access to read system logs
	ReadSystemLogs,
	/// Grant access to manage the server. This is effectively a step below server owner
	ManageServer,
}

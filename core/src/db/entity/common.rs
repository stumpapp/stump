use std::{fmt, str::FromStr};

use serde::{Deserialize, Serialize};
use specta::Type;
use utoipa::ToSchema;

// TODO: this isn't ideal for all ID types, e.g. i32
pub trait Cursor {
	fn cursor(&self) -> String;
}

#[derive(Serialize, Deserialize, Type, ToSchema)]
pub enum LayoutMode {
	#[serde(rename = "GRID")]
	Grid,
	#[serde(rename = "TABLE")]
	TABLE,
}

#[derive(Default, Debug, Clone, Serialize, Deserialize, Type, ToSchema)]
pub enum ReadingDirection {
	#[default]
	#[serde(rename = "ltr")]
	LeftToRight,
	#[serde(rename = "rtl")]
	RightToLeft,
}

impl FromStr for ReadingDirection {
	type Err = String;

	fn from_str(s: &str) -> Result<Self, Self::Err> {
		match s {
			"ltr" => Ok(ReadingDirection::LeftToRight),
			"rtl" => Ok(ReadingDirection::RightToLeft),
			_ => Err(format!("\"{s}\" is not a valid reading direction")),
		}
	}
}

impl fmt::Display for ReadingDirection {
	fn fmt(&self, f: &mut fmt::Formatter) -> fmt::Result {
		match self {
			ReadingDirection::LeftToRight => write!(f, "ltr"),
			ReadingDirection::RightToLeft => write!(f, "rtl"),
		}
	}
}

#[derive(Default, Debug, Clone, Serialize, Deserialize, Type, ToSchema)]
pub enum ReadingMode {
	#[default]
	#[serde(rename = "paged")]
	Paged,
	#[serde(rename = "continuous:vertical")]
	ContinuousVertical,
	#[serde(rename = "continuous:horizontal")]
	ContinuousHorizontal,
}

impl FromStr for ReadingMode {
	type Err = String;

	fn from_str(s: &str) -> Result<Self, Self::Err> {
		match s {
			"paged" => Ok(ReadingMode::Paged),
			"continuous:vertical" => Ok(ReadingMode::ContinuousVertical),
			"continuous:horizontal" => Ok(ReadingMode::ContinuousHorizontal),
			_ => Err(format!("\"{s}\" is not a valid reader mode")),
		}
	}
}

impl fmt::Display for ReadingMode {
	fn fmt(&self, f: &mut fmt::Formatter) -> fmt::Result {
		match self {
			ReadingMode::Paged => write!(f, "paged"),
			ReadingMode::ContinuousVertical => write!(f, "continuous:vertical"),
			ReadingMode::ContinuousHorizontal => write!(f, "continuous:horizontal"),
		}
	}
}

#[derive(Default, Debug, Clone, Serialize, Deserialize, Type, ToSchema)]
pub enum ReadingImageScaleFit {
	#[default]
	#[serde(rename = "height")]
	Height,
	#[serde(rename = "width")]
	Width,
	#[serde(rename = "auto")]
	Auto,
	#[serde(rename = "none", alias = "original")]
	None,
}

impl FromStr for ReadingImageScaleFit {
	type Err = String;

	fn from_str(s: &str) -> Result<Self, Self::Err> {
		match s {
			"height" => Ok(ReadingImageScaleFit::Height),
			"width" => Ok(ReadingImageScaleFit::Width),
			"auto" => Ok(ReadingImageScaleFit::Auto),
			"none" | "original" => Ok(ReadingImageScaleFit::None),
			_ => Err(format!("\"{s}\" is not a valid image scale fit")),
		}
	}
}

impl fmt::Display for ReadingImageScaleFit {
	fn fmt(&self, f: &mut fmt::Formatter) -> fmt::Result {
		match self {
			ReadingImageScaleFit::Height => write!(f, "height"),
			ReadingImageScaleFit::Width => write!(f, "width"),
			ReadingImageScaleFit::Auto => write!(f, "auto"),
			ReadingImageScaleFit::None => write!(f, "none"),
		}
	}
}

/// A struct representing a sort order for a column using react-table (tanstack)
#[derive(Default, Clone, Debug, Deserialize, Serialize, Type, ToSchema)]
pub struct ReactTableColumnSort {
	/// The ID of the column
	id: String,
	/// The position of the column in the table
	position: u32,
}

/// A struct representing a global sort order for a table using react-table (tanstack)
#[derive(Default, Clone, Debug, Deserialize, Serialize, Type, ToSchema)]
pub struct ReactTableGlobalSort {
	/// Whether the sorting is descending
	desc: bool,
	/// The ID of the column that is sorted
	#[serde(rename = "id")]
	column_id: String,
}

#[derive(Debug, Deserialize, Serialize, Type, ToSchema, Clone, Copy, PartialEq, Eq)]
pub enum FileStatus {
	#[serde(rename = "UNKNOWN")]
	Unknown,
	#[serde(rename = "READY")]
	Ready,
	#[serde(rename = "UNSUPPORTED")]
	Unsupported,
	#[serde(rename = "ERROR")]
	Error,
	#[serde(rename = "MISSING")]
	Missing,
}

impl Default for FileStatus {
	fn default() -> Self {
		Self::Ready
	}
}

impl fmt::Display for FileStatus {
	fn fmt(&self, f: &mut fmt::Formatter) -> fmt::Result {
		match self {
			FileStatus::Unknown => write!(f, "UNKNOWN"),
			FileStatus::Ready => write!(f, "READY"),
			FileStatus::Unsupported => write!(f, "UNSUPPORTED"),
			FileStatus::Error => write!(f, "ERROR"),
			FileStatus::Missing => write!(f, "MISSING"),
		}
	}
}

impl FromStr for FileStatus {
	type Err = ();

	fn from_str(s: &str) -> Result<Self, Self::Err> {
		match s {
			"UNKNOWN" => Ok(FileStatus::Unknown),
			"READY" => Ok(FileStatus::Ready),
			"UNSUPPORTED" => Ok(FileStatus::Unsupported),
			"ERROR" => Ok(FileStatus::Error),
			"MISSING" => Ok(FileStatus::Missing),
			_ => Err(()),
		}
	}
}

#[derive(
	Debug, Default, Deserialize, Serialize, Type, ToSchema, Clone, Copy, PartialEq, Eq,
)]
pub enum EntityVisibility {
	#[serde(rename = "PUBLIC")]
	Public,
	#[serde(rename = "SHARED")]
	Shared,
	#[serde(rename = "PRIVATE")]
	#[default]
	Private,
}

impl fmt::Display for EntityVisibility {
	fn fmt(&self, f: &mut fmt::Formatter) -> fmt::Result {
		match self {
			EntityVisibility::Public => write!(f, "PUBLIC"),
			EntityVisibility::Shared => write!(f, "SHARED"),
			EntityVisibility::Private => write!(f, "PRIVATE"),
		}
	}
}

impl FromStr for EntityVisibility {
	type Err = String;

	fn from_str(s: &str) -> Result<Self, Self::Err> {
		match s {
			"PUBLIC" => Ok(EntityVisibility::Public),
			"SHARED" => Ok(EntityVisibility::Shared),
			"PRIVATE" => Ok(EntityVisibility::Private),
			_ => Err(format!("Invalid visibility: {s}")),
		}
	}
}

#[derive(Debug, Default, Deserialize, Serialize, Type, ToSchema, Clone, Copy)]
pub enum AccessRole {
	#[default]
	Reader = 1,
	Writer = 2,
	CoCreator = 3,
}

impl AccessRole {
	pub fn value(&self) -> i32 {
		match self {
			AccessRole::Reader => 1,
			AccessRole::Writer => 2,
			AccessRole::CoCreator => 3,
		}
	}
}

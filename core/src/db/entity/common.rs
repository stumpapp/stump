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
	#[serde(rename = "LIST")]
	List,
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
			_ => Err(format!("Invalid visibility: {}", s)),
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

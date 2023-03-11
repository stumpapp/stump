use std::{fmt, str::FromStr};

use serde::{Deserialize, Serialize};
use specta::Type;
use utoipa::ToSchema;

#[derive(Serialize, Deserialize, Type, ToSchema, Default)]
pub enum UserRole {
	#[serde(rename = "SERVER_OWNER")]
	ServerOwner,
	#[serde(rename = "MEMBER")]
	#[default]
	Member,
}

#[derive(Serialize, Deserialize, Type, ToSchema)]
pub enum LayoutMode {
	#[serde(rename = "GRID")]
	Grid,
	#[serde(rename = "LIST")]
	List,
}

#[derive(Debug, Deserialize, Serialize, Type, ToSchema, Clone, Copy)]
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

impl From<UserRole> for String {
	fn from(role: UserRole) -> String {
		match role {
			UserRole::ServerOwner => "SERVER_OWNER".to_string(),
			UserRole::Member => "MEMBER".to_string(),
		}
	}
}

impl fmt::Display for UserRole {
	fn fmt(&self, f: &mut fmt::Formatter) -> fmt::Result {
		match self {
			UserRole::ServerOwner => write!(f, "SERVER_OWNER"),
			UserRole::Member => write!(f, "MEMBER"),
		}
	}
}

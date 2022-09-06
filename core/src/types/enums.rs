use std::fmt;

use rocket_okapi::JsonSchema;
use serde::{Deserialize, Serialize};
use specta::Type;

#[derive(Serialize, Deserialize, Type)]
pub enum UserRole {
	#[serde(rename = "SERVER_OWNER")]
	ServerOwner,
	#[serde(rename = "MEMBER")]
	Member,
}

#[derive(Serialize, Deserialize, Type)]
pub enum ViewMode {
	#[serde(rename = "GRID")]
	Grid,
	#[serde(rename = "LIST")]
	List,
}

#[derive(Debug, Deserialize, Serialize, JsonSchema, Type)]
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

impl Default for UserRole {
	fn default() -> Self {
		UserRole::Member
	}
}

impl Into<String> for UserRole {
	fn into(self) -> String {
		match self {
			UserRole::ServerOwner => "SERVER_OWNER".to_string(),
			UserRole::Member => "MEMBER".to_string(),
		}
	}
}

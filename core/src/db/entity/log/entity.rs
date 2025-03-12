use std::path::PathBuf;

use serde::{Deserialize, Serialize};
use specta::Type;
use utoipa::ToSchema;

use crate::{db::entity::Cursor, prisma::log};

/// Information about the Stump log file, located at `STUMP_CONFIG_DIR/Stump.log`, or
/// `~/.stump/Stump.log` by default. Information such as the file size, last modified date, etc.
#[derive(Serialize, Deserialize, Type, ToSchema)]
pub struct LogMetadata {
	#[schema(value_type = String)]
	pub path: PathBuf,
	pub size: u64,
	pub modified: String,
}

#[derive(Debug, Clone, Default, Serialize, Deserialize, Type, ToSchema)]
pub enum LogLevel {
	#[serde(rename = "ERROR")]
	Error,
	#[serde(rename = "WARN")]
	Warn,
	#[serde(rename = "INFO")]
	#[default]
	Info,
	#[serde(rename = "DEBUG")]
	Debug,
}

impl From<String> for LogLevel {
	fn from(s: String) -> Self {
		match s.to_lowercase().as_str() {
			"error" => Self::Error,
			"warn" => Self::Warn,
			"info" => Self::Info,
			"debug" => Self::Debug,
			_ => Self::Info,
		}
	}
}

impl std::fmt::Display for LogLevel {
	fn fmt(&self, f: &mut std::fmt::Formatter<'_>) -> std::fmt::Result {
		match self {
			LogLevel::Error => write!(f, "ERROR"),
			LogLevel::Warn => write!(f, "WARN"),
			LogLevel::Info => write!(f, "INFO"),
			LogLevel::Debug => write!(f, "DEBUG"),
		}
	}
}

/// A model representing a persisted log entry. These are different than traces/system logs.
#[derive(Clone, Serialize, Deserialize, Default, Type, ToSchema)]
pub struct Log {
	/// The unique identifier of the log entry
	pub id: i32,
	/// The log level of the message
	pub level: LogLevel,
	/// The message of the log entry
	pub message: String,
	/// Optional context for the log entry
	pub context: Option<String>,
	/// The timestamp of the log entry
	pub timestamp: String,
	/// The job ID associated with the log entry, if any
	#[serde(skip_serializing_if = "Option::is_none")]
	pub job_id: Option<String>,
}

impl From<log::Data> for Log {
	fn from(log: log::Data) -> Self {
		Self {
			id: log.id,
			level: log.level.into(),
			message: log.message,
			context: log.context,
			timestamp: log.timestamp.to_rfc3339(),
			job_id: log.job_id,
		}
	}
}

impl Cursor for Log {
	fn cursor(&self) -> String {
		self.id.to_string()
	}
}

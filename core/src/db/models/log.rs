use std::path::PathBuf;

use serde::{Deserialize, Serialize};
use specta::Type;
use utoipa::ToSchema;

use crate::event::CoreEvent;

/// Information about the Stump log file, located at STUMP_CONFIG_DIR/Stump.log, or
/// ~/.stump/Stump.log by default. Information such as the file size, last modified date, etc.
#[derive(Serialize, Deserialize, Type, ToSchema)]
pub struct LogMetadata {
	pub path: PathBuf,
	pub size: u64,
	pub modified: String,
}

#[derive(Clone, Default, Serialize, Deserialize, Type, ToSchema)]
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

#[derive(Clone, Serialize, Deserialize, Default, Type, ToSchema)]
pub struct Log {
	pub id: String,
	pub level: LogLevel,
	pub message: String,
	pub created_at: String,
	pub job_id: Option<String>,
}

impl From<CoreEvent> for Log {
	fn from(event: CoreEvent) -> Self {
		match event {
			CoreEvent::JobFailed { runner_id, message } => Self {
				level: LogLevel::Error,
				message,
				job_id: Some(runner_id),
				..Default::default()
			},
			CoreEvent::CreateEntityFailed {
				runner_id,
				path,
				message,
			} => Self {
				level: LogLevel::Error,
				message: format!("{}: {}", path, message),
				job_id: runner_id,
				..Default::default()
			},
			_ => unimplemented!(),
		}
	}
}

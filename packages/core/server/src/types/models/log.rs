use std::path::PathBuf;

use rocket_okapi::JsonSchema;
use serde::{Deserialize, Serialize};

/// Information about the Stump log file, located at STUMP_CONFIG_DIR/Stump.log, or
/// ~/.stump/Stump.log by default. Information such as the file size, last modified date, etc.
#[derive(Serialize, Deserialize, JsonSchema)]
pub struct LogMetadata {
	pub path: PathBuf,
	pub size: u64,
	pub modified: String,
}

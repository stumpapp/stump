use async_graphql::{Result, SimpleObject};
use chrono::offset::Utc;
use chrono::DateTime;
use models::entity::log;
use std::fs::File;
use stump_core::config::StumpConfig;

#[derive(Debug, SimpleObject)]
pub struct Log {
	#[graphql(flatten)]
	pub model: log::Model,
}

impl From<log::Model> for Log {
	fn from(entity: log::Model) -> Self {
		Self { model: entity }
	}
}

#[derive(Debug, Clone, SimpleObject)]
pub struct LogFileInfo {
	pub path: String,
	pub size: u64,
	pub modified: String,
}

#[derive(Default, SimpleObject)]
pub struct LogDeleteOutput {
	pub deleted: usize,
}

impl LogFileInfo {
	// TODO: async-ify this since it will be requested in async runtime
	// and we don't want to block the runtime
	pub fn try_from(config: &StumpConfig) -> Result<Self> {
		let log_file_path = config.get_log_file();
		let file = File::open(log_file_path.as_path())?;
		let metadata = file.metadata()?;
		let system_time = metadata.modified()?;
		let datetime: DateTime<Utc> = system_time.into();

		Ok(Self {
			path: log_file_path.to_string_lossy().to_string(),
			size: metadata.len(),
			modified: datetime.format("%d/%m/%Y %T").to_string(),
		})
	}
}

#[cfg(test)]
mod tests {
	use super::*;
	use chrono::Utc;
	use std::{fs::File, io::Write};
	use tempfile::tempdir;

	#[test]
	fn test_logfile_info() {
		let dir = tempdir().unwrap();
		let log_file_path = dir.path().join("Stump.log");
		let mut file = File::create(&log_file_path).unwrap();
		writeln!(file, "Hello, world!").unwrap();

		let config = StumpConfig::new(dir.path().to_string_lossy().to_string());
		let log_file_info = LogFileInfo::try_from(&config).unwrap();

		assert_eq!(
			log_file_info.path,
			log_file_path.to_string_lossy().to_string()
		);
		assert_eq!(log_file_info.size, 14); // add one for newline
		assert_eq!(
			log_file_info.modified,
			Utc::now().format("%d/%m/%Y %T").to_string()
		);
	}
}

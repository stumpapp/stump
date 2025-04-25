use crate::{
	filesystem::series::metadata::ProcessedSeriesMetadata, CoreError, CoreResult,
};
use models::{
	entity::{series, series_metadata},
	shared::enums::FileStatus,
};
use sea_orm::Set;
use std::path::{Path, PathBuf};

pub struct SeriesBuilder {
	path: PathBuf,
	library_id: String,
}

#[derive(Debug, Clone)]
pub struct BuiltSeries {
	pub series: series::ActiveModel,
	pub metadata: Option<series_metadata::ActiveModel>,
}

impl SeriesBuilder {
	pub fn new(path: &Path, library_id: &str) -> Self {
		Self {
			path: path.to_path_buf(),
			library_id: library_id.to_string(),
		}
	}

	pub fn build(self) -> CoreResult<BuiltSeries> {
		let path = self.path.as_path();

		let file_name = path
			.file_name()
			.and_then(|file_name| file_name.to_str().map(String::from))
			.ok_or(CoreError::InternalError(
				"Could not convert series file name to string".to_string(),
			))?;
		let path_str =
			path.to_str()
				.map(String::from)
				.ok_or(CoreError::InternalError(
					"Could not convert series path to string".to_string(),
				))?;
		let metadata = ProcessedSeriesMetadata::from_series_root(path)?;

		tracing::debug!(file_name, path_str, ?metadata, "Parsed series information");

		let series = series::ActiveModel {
			path: Set(path_str),
			name: Set(file_name),
			library_id: Set(Some(self.library_id)),
			status: Set(FileStatus::Ready),
			..Default::default()
		};

		let metadata = metadata.map(|m| m.into_active_model());

		Ok(BuiltSeries { series, metadata })
	}
}

use std::path::{Path, PathBuf};

use crate::{
	db::entity::{LibraryOptions, Media, Series},
	filesystem::{process, FileParts, PathUtils, SeriesJson},
	CoreError, CoreResult,
};

pub struct MediaBuilder {
	path: PathBuf,
	series_id: String,
	library_options: LibraryOptions,
}

impl MediaBuilder {
	pub fn new(path: &Path, series_id: &str, library_options: LibraryOptions) -> Self {
		Self {
			path: path.to_path_buf(),
			series_id: series_id.to_string(),
			library_options,
		}
	}

	pub fn build(self) -> CoreResult<Media> {
		let processed_entry = process(&self.path, self.library_options.into())?;

		tracing::trace!(?processed_entry, "Processed entry");

		let pathbuf = processed_entry.path;
		let path = pathbuf.as_path();

		let FileParts {
			file_name,
			extension,
			..
		} = path.file_parts();
		let path_str = path.to_str().unwrap_or_default().to_string();

		let raw_size = path.metadata().map(|m| m.len()).unwrap_or_else(|e| {
			tracing::error!(error = ?e, "Error occurred trying to calculate file size");
			0
		});
		let converted_size: i32 = raw_size.try_into().unwrap_or_else(|e| {
			tracing::error!(error = ?e, "Error occurred trying to convert file size to i32");
			0
		});

		let pages = if let Some(metadata) = &processed_entry.metadata {
			metadata.page_count.unwrap_or(processed_entry.pages)
		} else {
			processed_entry.pages
		};

		Ok(Media {
			name: file_name,
			size: converted_size,
			extension,
			pages,
			hash: processed_entry.hash,
			path: path_str,
			series_id: self.series_id,
			metadata: processed_entry.metadata,
			..Default::default()
		})
	}
}

pub struct SeriesBuilder {
	path: PathBuf,
	library_id: String,
}

impl SeriesBuilder {
	pub fn new(path: &Path, library_id: &str) -> Self {
		Self {
			path: path.to_path_buf(),
			library_id: library_id.to_string(),
		}
	}

	pub fn build(self) -> CoreResult<Series> {
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
		let metadata = SeriesJson::from_folder(path).map(|json| json.metadata).ok();

		tracing::debug!(file_name, path_str, ?metadata, "Parsed series information");

		Ok(Series {
			path: path_str,
			name: file_name,
			library_id: self.library_id,
			metadata,
			..Default::default()
		})
	}
}

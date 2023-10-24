use std::path::{Path, PathBuf};

use prisma_client_rust::chrono::{DateTime, FixedOffset, Utc};

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

		let (raw_size, last_modified_at) = path.metadata().map(|m| {
			let datetime: Option<DateTime<Utc>> = m.modified().ok().map(|t| t.into());
			let last_modified_at: Option<DateTime<FixedOffset>> =
				datetime.map(|dt| dt.into());
			(m.len(), last_modified_at)
		})?;
		let size = raw_size.try_into().unwrap_or_else(|_| {
			tracing::error!(?raw_size, "Failed to convert file size to i32");
			0
		});

		let pages = processed_entry.pages;
		if let Some(ref metadata) = processed_entry.metadata {
			let conflicting_page_counts = metadata
				.page_count
				.map(|count| count != pages)
				.unwrap_or(false);
			// TODO: should we act here? Or just log the warning?
			if conflicting_page_counts {
				tracing::warn!(
					?pages,
					?metadata.page_count,
					"Page count in metadata does not match actual page count!"
				);
			}
		}

		Ok(Media {
			name: file_name,
			size,
			extension,
			pages: processed_entry.pages,
			hash: processed_entry.hash,
			path: path_str,
			series_id: self.series_id,
			metadata: processed_entry.metadata,
			modified_at: last_modified_at.map(|dt| dt.to_rfc3339()),
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

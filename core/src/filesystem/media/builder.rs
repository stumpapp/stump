use std::path::{Path, PathBuf};

use prisma_client_rust::chrono::{DateTime, FixedOffset, Utc};

use crate::{
	config::StumpConfig,
	db::entity::{LibraryConfig, Media, Series},
	filesystem::{process, FileParts, PathUtils, SeriesJson},
	CoreError, CoreResult,
};

pub struct MediaBuilder {
	path: PathBuf,
	series_id: String,
	library_config: LibraryConfig,
	config: StumpConfig,
}

impl MediaBuilder {
	pub fn new(
		path: &Path,
		series_id: &str,
		library_config: LibraryConfig,
		config: &StumpConfig,
	) -> Self {
		Self {
			path: path.to_path_buf(),
			series_id: series_id.to_string(),
			library_config,
			config: config.clone(),
		}
	}

	pub fn rebuild(self, media: &Media) -> CoreResult<Media> {
		let generated = self.build()?;
		Ok(Media {
			id: media.id.clone(),
			..generated
		})
	}

	pub fn build(self) -> CoreResult<Media> {
		let mut processed_entry =
			process(&self.path, self.library_config.into(), &self.config)?;

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
			tracing::error!(?raw_size, ?path, "Failed to convert file size to i64");
			0
		});

		let pages = processed_entry.pages;
		if let Some(ref mut metadata) = processed_entry.metadata {
			let conflicting_page_counts = metadata
				.page_count
				.map(|count| count != pages)
				.unwrap_or(false);
			if conflicting_page_counts {
				tracing::warn!(
					?pages,
					?metadata.page_count,
					"Page count in metadata does not match actual page count!"
				);
				metadata.page_count = Some(pages);
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

#[cfg(test)]
mod tests {
	use super::*;
	use crate::filesystem::media::tests::{
		get_test_cbz_path, get_test_epub_path, get_test_pdf_path, get_test_rar_path,
		get_test_zip_path,
	};

	#[test]
	fn test_build_media_zip() {
		// Test with zip
		let media = build_media_test_helper(get_test_zip_path());
		assert!(media.is_ok());
		let media = media.unwrap();
		assert_eq!(media.extension, "zip");
	}

	#[test]
	fn test_build_media_cbz() {
		let media = build_media_test_helper(get_test_cbz_path());
		assert!(media.is_ok());
		let media = media.unwrap();
		assert_eq!(media.extension, "cbz");
	}

	#[test]
	fn test_build_media_rar() {
		let media = build_media_test_helper(get_test_rar_path());
		assert!(media.is_ok());
		let media = media.unwrap();
		assert_eq!(media.extension, "rar");
	}

	#[test]
	fn test_build_media_epub() {
		let media = build_media_test_helper(get_test_epub_path());
		assert!(media.is_ok());
		let media = media.unwrap();
		assert_eq!(media.extension, "epub");
	}

	#[test]
	fn test_build_media_pdf() {
		let media = build_media_test_helper(get_test_pdf_path());
		assert!(media.is_ok());
		let media = media.unwrap();
		assert_eq!(media.extension, "pdf");
	}

	fn build_media_test_helper(path: String) -> Result<Media, CoreError> {
		let path = Path::new(&path);
		let library_config = LibraryConfig {
			convert_rar_to_zip: false,
			hard_delete_conversions: false,
			..Default::default()
		};
		let series_id = "series_id";

		MediaBuilder::new(path, series_id, library_config, &StumpConfig::debug()).build()
	}
}

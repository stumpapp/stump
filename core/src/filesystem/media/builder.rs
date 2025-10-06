use std::path::{Path, PathBuf};

use chrono::{DateTime, FixedOffset, Utc};
use models::entity::{library_config, media, media_metadata};
use sea_orm::Set;
use uuid::Uuid;

use crate::{
	config::StumpConfig,
	filesystem::{
		media::process,
		scanner::{CustomVisit, CustomVisitResult},
		FileParts, PathUtils,
	},
	CoreResult,
};

use super::{
	generate_hashes, metadata::ProcessedMediaMetadata, process_metadata,
	ProcessedFileHashes,
};

pub struct MediaBuilder {
	path: PathBuf,
	series_id: String,
	library_config: library_config::Model,
	config: StumpConfig,
}

#[derive(Debug, Clone)]
pub struct BuiltMedia {
	pub media: media::ActiveModel,
	pub metadata: Option<media_metadata::ActiveModel>,
}

impl BuiltMedia {
	#[tracing::instrument(skip(self))]
	pub fn path(&self) -> Option<String> {
		match self.media.path.clone().into_value() {
			Some(path) => Some(path.to_string()),
			_ => {
				tracing::warn!(result = ?self, "Failed to get path from constructed media");
				None
			},
		}
	}
}

impl MediaBuilder {
	pub fn new(
		path: &Path,
		series_id: &str,
		library_config: library_config::Model,
		config: &StumpConfig,
	) -> Self {
		Self {
			path: path.to_path_buf(),
			series_id: series_id.to_string(),
			library_config,
			config: config.clone(),
		}
	}

	pub fn rebuild(self, media: &media::ModelWithMetadata) -> CoreResult<BuiltMedia> {
		let generated = self.build()?;
		Ok(BuiltMedia {
			media: media::ActiveModel {
				id: Set(media.media.id.clone()),
				..generated.media
			},
			metadata: generated.metadata.map(|meta| media_metadata::ActiveModel {
				media_id: Set(Some(media.media.id.clone())),
				..meta
			}),
		})
	}

	pub fn build(self) -> CoreResult<BuiltMedia> {
		let processed_entry =
			process(&self.path, self.library_config.into(), &self.config)?;

		tracing::trace!(?processed_entry, "Processed entry");

		let pathbuf = processed_entry.path;
		let path = pathbuf.as_path();

		let FileParts {
			extension,
			file_stem,
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

		let id = Uuid::new_v4().to_string();
		let pages = processed_entry.pages;
		let mut resolved_metadata = None;

		if let Some(mut metadata) = processed_entry.metadata {
			let conflicting_page_counts =
				metadata.page_count.is_some_and(|count| count != pages);
			if conflicting_page_counts {
				tracing::warn!(
					?pages,
					?metadata.page_count,
					"Page count in metadata does not match actual page count!"
				);
				metadata.page_count = Some(pages);
			}

			resolved_metadata = Some(media_metadata::ActiveModel {
				media_id: Set(Some(id.clone())),
				..metadata.into_active_model()
			});
		}

		let media = media::ActiveModel {
			id: Set(id),
			name: Set(file_stem),
			size: Set(size),
			extension: Set(extension),
			pages: Set(pages),
			hash: Set(processed_entry.hash),
			koreader_hash: Set(processed_entry.koreader_hash),
			path: Set(path_str),
			series_id: Set(Some(self.series_id)),
			modified_at: Set(last_modified_at),
			..Default::default()
		};

		Ok(BuiltMedia {
			media,
			metadata: resolved_metadata,
		})
	}

	pub fn regen_hashes(&self) -> CoreResult<ProcessedFileHashes> {
		Ok(generate_hashes(
			self.path.clone(),
			self.library_config.clone().into(),
		)?)
	}

	pub fn regen_meta(&self) -> CoreResult<Option<ProcessedMediaMetadata>> {
		Ok(process_metadata(self.path.clone())?)
	}

	pub fn custom_visit(self, config: CustomVisit) -> CoreResult<CustomVisitResult> {
		let mut result = CustomVisitResult::default();
		if config.regen_hashes {
			result.hashes = Some(self.regen_hashes()?);
		}
		if config.regen_meta {
			result.meta = self.regen_meta()?.map(Box::new);
		}
		Ok(result)
	}
}

#[cfg(test)]
mod tests {
	use models::shared::enums::{
		LibraryPattern, ReadingDirection, ReadingImageScaleFit, ReadingMode,
	};
	use sea_orm::ActiveValue;

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
		let media = media.unwrap().media;
		assert_eq!(media.extension, ActiveValue::Set("zip".to_string()));
	}

	#[test]
	fn test_build_media_cbz() {
		let media = build_media_test_helper(get_test_cbz_path());
		assert!(media.is_ok());
		let media = media.unwrap().media;
		assert_eq!(media.extension, ActiveValue::Set("cbz".to_string()));
	}

	#[test]
	fn test_build_media_rar() {
		let media = build_media_test_helper(get_test_rar_path());
		assert!(media.is_ok());
		let media = media.unwrap().media;
		assert_eq!(media.extension, ActiveValue::Set("rar".to_string()));
	}

	#[test]
	fn test_build_media_epub() {
		let media = build_media_test_helper(get_test_epub_path());
		assert!(media.is_ok());
		let media = media.unwrap().media;
		assert_eq!(media.extension, ActiveValue::Set("epub".to_string()));
	}

	#[test]
	fn test_build_media_pdf() {
		let media = build_media_test_helper(get_test_pdf_path());
		assert!(media.is_ok());
		let media = media.unwrap().media;
		assert_eq!(media.extension, ActiveValue::Set("pdf".to_string()));
	}

	fn build_media_test_helper(path: String) -> CoreResult<BuiltMedia> {
		let path = Path::new(&path);
		let library_config = library_config::Model {
			convert_rar_to_zip: false,
			hard_delete_conversions: false,
			..library_config()
		};
		let series_id = "series_id";

		MediaBuilder::new(path, series_id, library_config, &StumpConfig::debug()).build()
	}

	#[test]
	fn test_regen_hashes() {
		let path = get_test_zip_path();
		let path = Path::new(&path);
		let library_config = library_config::Model {
			generate_file_hashes: true,
			..library_config()
		};
		let series_id = "series_id";

		let builder =
			MediaBuilder::new(path, series_id, library_config, &StumpConfig::debug());
		let hashes = builder.regen_hashes();
		assert!(hashes.is_ok());
		assert!(hashes.unwrap().hash.is_some());
	}

	fn library_config() -> library_config::Model {
		library_config::Model {
			id: 1,
			convert_rar_to_zip: false,
			generate_file_hashes: false,
			default_reading_dir: ReadingDirection::Ltr,
			default_reading_image_scale_fit: ReadingImageScaleFit::Auto,
			default_reading_mode: ReadingMode::Paged,
			generate_koreader_hashes: false,
			hard_delete_conversions: false,
			ignore_rules: None,
			library_id: Some("library_id".to_string()),
			library_pattern: LibraryPattern::SeriesBased,
			process_metadata: true,
			thumbnail_config: None,
			watch: false,
		}
	}
}

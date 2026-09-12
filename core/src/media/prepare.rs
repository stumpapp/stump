use std::path::Path;

use chrono::{DateTime, FixedOffset, Utc};
use models::{
	entity::{library_config, media, media_metadata},
	shared::enums::FileStatus,
};
use sea_orm::Set;
use uuid::Uuid;

use crate::{
	config::StumpConfig,
	fs_utils::{FileParts, PathUtils},
	media::processor::{
		generate_hashes, process_metadata, GeneratedFileHashes, MediaProcessorOptions,
	},
	media::{metadata::ProcessedMediaMetadata, processor::process_file},
	CoreResult,
};

#[derive(Debug, Clone)]
pub struct MediaDraft {
	pub media: media::ActiveModel,
	pub metadata: Option<media_metadata::ActiveModel>,
	/// Tag names extracted from the file's metadata (e.g. ComicInfo.xml `<Tags>`).
	/// Applied additively to `media_tags` during create/update so user-assigned tags
	/// are never removed by a rescan
	pub tags: Vec<String>,
}

impl MediaDraft {
	pub fn oneshot(self) -> Self {
		Self {
			media: media::ActiveModel {
				is_oneshot: Set(true),
				..self.media
			},
			..self
		}
	}
}

/// Creates a draft of a media entry to be upserted into the database
pub async fn prepare_draft(
	path: &Path,
	series_id: &str,
	library_config: library_config::Model,
	config: &StumpConfig,
	existing: Option<&media::ModelWithMetadata>,
) -> CoreResult<MediaDraft> {
	let options = MediaProcessorOptions::new(&library_config, config);

	let processed = process_file(path, options, config).await?;

	tracing::trace!(?processed, "Processed entry");

	let FileParts {
		extension,
		file_stem,
		..
	} = processed.path.as_path().file_parts();
	let path_str = processed.path.to_str().unwrap_or_default().to_string();

	let (raw_size, last_modified_at) = processed.path.metadata().map(|m| {
		let datetime: Option<DateTime<Utc>> = m.modified().ok().map(|t| t.into());
		let last_modified_at: Option<DateTime<FixedOffset>> =
			datetime.map(|dt| dt.into());
		(m.len(), last_modified_at)
	})?;
	let size = raw_size.try_into().unwrap_or_else(|_| {
		tracing::error!(?raw_size, path = ?processed.path, "Failed to convert file size to i64");
		0
	});

	let id = existing
		.map(|e| e.media.id.clone())
		.unwrap_or_else(|| Uuid::new_v4().to_string());

	let pages = processed.pages;
	// TODO(metadata): we should consider locked metadata fields and only overwrite unlocked fields
	let (resolved_metadata, resolved_tags) = processed
		.metadata
		.map(|mut metadata| {
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

			let tags = metadata.tags.take().unwrap_or_default();
			let active = media_metadata::ActiveModel {
				media_id: Set(Some(id.clone())),
				..metadata.into_active_model()
			};
			(Some(active), tags)
		})
		.unwrap_or_default();

	let active_model = media::ActiveModel {
		id: Set(id),
		name: Set(file_stem),
		size: Set(size),
		extension: Set(extension),
		pages: Set(pages),
		hash: Set(processed.hash),
		koreader_hash: Set(processed.koreader_hash),
		path: Set(path_str),
		series_id: Set(Some(series_id.to_string())),
		modified_at: Set(last_modified_at),
		status: Set(FileStatus::Ready),
		created_at: Set(chrono::Utc::now().into()),
		..Default::default()
	};

	let media = match existing {
		Some(e) => media::ActiveModel {
			id: Set(e.media.id.clone()),
			created_at: Set(e.media.created_at),
			is_oneshot: Set(e.media.is_oneshot),
			..active_model
		},
		None => active_model,
	};

	Ok(MediaDraft {
		media,
		metadata: resolved_metadata,
		tags: resolved_tags,
	})
}

pub async fn regen_hashes(
	path: &Path,
	library_config: &library_config::Model,
	config: &StumpConfig,
) -> CoreResult<GeneratedFileHashes> {
	let options = MediaProcessorOptions::new(library_config, config);
	Ok(generate_hashes(path, options, config).await?)
}

pub async fn regen_meta(
	path: &Path,
	config: &StumpConfig,
) -> CoreResult<Option<ProcessedMediaMetadata>> {
	Ok(process_metadata(path, config).await?)
}

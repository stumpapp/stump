use std::{
	collections::HashMap,
	fs::File,
	io::Read,
	path::{Path, PathBuf},
};

use zip::ZipArchive;

use crate::{
	fs_utils::{
		hash::{self, generate_koreader_hash},
		ContentType, FileParts, PathUtils,
	},
	media::{
		metadata::ProcessedMediaMetadata,
		processor::{
			error::MediaProcessorError, GeneratedFileHashes, MediaProcessor,
			MediaProcessorOptions, ProcessedMediaFile,
		},
		utils::metadata_from_buf,
	},
};

pub struct ZipProcessor;

impl MediaProcessor for ZipProcessor {
	fn generate_stump_hash(&self, path: &Path) -> Result<String, MediaProcessorError> {
		let zip_file = File::open(path)?;
		let mut archive = ZipArchive::new(zip_file)?;

		let mut sample_size = 0;

		for i in 0..archive.len() {
			if i > 5 {
				break;
			}

			if let Ok(file) = archive.by_index(i) {
				sample_size += file.size();
			}
		}

		Ok(hash::generate(path, sample_size)?)
	}

	fn generate_hashes(
		&self,
		path: &Path,
		MediaProcessorOptions {
			generate_file_hashes,
			generate_koreader_hashes,
			..
		}: MediaProcessorOptions,
	) -> Result<GeneratedFileHashes, MediaProcessorError> {
		let stump_hash = generate_file_hashes
			.then(|| self.generate_stump_hash(path))
			.transpose()?;
		// TODO(koreader): should confirm whether we care about generating for
		// zip files, or just keep it for epubs
		let koreader_hash = generate_koreader_hashes
			.then(|| generate_koreader_hash(path))
			.transpose()?;

		Ok(GeneratedFileHashes {
			stump: stump_hash,
			koreader: koreader_hash,
		})
	}

	fn process_metadata(
		&self,
		path: &Path,
	) -> Result<Option<ProcessedMediaMetadata>, MediaProcessorError> {
		let zip_file = File::open(path)?;
		let mut archive = ZipArchive::new(zip_file)?;

		// Note: as part of re-organizing i considered refactoring this entire loop to just
		// use by_name() and then boom bam done, but i was unsure if it would be a
		// guarantee that folks don't have ComicInfo.xml in a subdir, so left it as it was.
		// it was so much simpler tho :'(
		for i in 0..archive.len() {
			let mut file = archive.by_index(i)?;

			if file.is_dir() {
				tracing::trace!("Skipping directory");
				continue;
			}

			let path_buf = file.enclosed_name().unwrap_or_else(|| {
				tracing::warn!("Failed to get enclosed name for zip entry");
				PathBuf::from(file.name())
			});
			let path = path_buf.as_path();

			if path.is_hidden_file() {
				tracing::trace!(path = ?path, "Skipping hidden file");
				continue;
			}

			let FileParts { file_name, .. } = path.file_parts();

			if file_name.to_lowercase() == "comicinfo.xml" {
				tracing::trace!("Found ComicInfo.xml");
				let contents = {
					let mut contents = Vec::new();
					file.read_to_end(&mut contents)?;
					String::from_utf8_lossy(&contents).to_string()
				};
				tracing::trace!(contents_len = contents.len(), "Read ComicInfo.xml");
				return Ok(metadata_from_buf(&contents));
			}
		}

		Ok(None)
	}

	fn process(
		&self,
		path: &Path,
		options: MediaProcessorOptions,
	) -> Result<ProcessedMediaFile, MediaProcessorError> {
		let hashes = self.generate_hashes(path, options)?;
		let mut metadata = None;
		let mut pages = 0;

		let zip_file = File::open(path)?;
		let mut archive = ZipArchive::new(zip_file)?;

		for i in 0..archive.len() {
			let mut file = archive.by_index(i)?;

			if file.is_dir() {
				tracing::trace!("Skipping directory");
				continue;
			}

			let path_buf = file.enclosed_name().unwrap_or_else(|| {
				tracing::warn!("Failed to get enclosed name for zip entry");
				PathBuf::from(file.name())
			});
			let path = path_buf.as_path();

			if path.is_hidden_file() {
				tracing::trace!(path = ?path, "Skipping hidden file");
				continue;
			}

			let content_type = path.naive_content_type();
			let FileParts { file_name, .. } = path.file_parts();

			if file_name.to_lowercase() == "comicinfo.xml" {
				tracing::trace!("Found ComicInfo.xml");
				let contents = {
					let mut contents = Vec::new();
					file.read_to_end(&mut contents)?;
					String::from_utf8_lossy(&contents).to_string()
				};
				tracing::trace!(contents_len = contents.len(), "Read ComicInfo.xml");
				metadata = metadata_from_buf(&contents);
			} else if content_type.is_image() {
				pages += 1;
			}
		}

		Ok(ProcessedMediaFile {
			path: path.to_path_buf(),
			hash: hashes.stump,
			koreader_hash: hashes.koreader,
			metadata,
			pages,
		})
	}

	fn get_page(
		path: &Path,
		page: i32,
		// config: &StumpConfig,
	) -> Result<(ContentType, Vec<u8>), MediaProcessorError> {
		todo!()
	}

	fn get_page_count(path: &Path) -> Result<i32, MediaProcessorError> {
		todo!()
	}

	fn get_page_content_types(
		path: &Path,
		pages: Vec<i32>,
	) -> Result<HashMap<i32, ContentType>, MediaProcessorError> {
		todo!()
	}
}

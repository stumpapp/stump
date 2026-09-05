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
			error::MediaProcessorError, AnalyzedPage, GeneratedFileHashes,
			MediaProcessor, MediaProcessorOptions, ProcessedMediaFile,
		},
		utils::{metadata_from_buf, sort_file_names},
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
				tracing::trace!(file_path = ?path, "Skipping hidden file");
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
		&self,
		path: &Path,
		page: i32,
	) -> Result<(ContentType, Vec<u8>), MediaProcessorError> {
		let zip_file = File::open(path)?;

		let mut archive = zip::ZipArchive::new(&zip_file)?;
		let file_names_archive = archive.clone();

		if archive.is_empty() {
			return Err(MediaProcessorError::ArchiveEmpty);
		}

		let mut file_names = file_names_archive.file_names().collect::<Vec<_>>();
		sort_file_names(&mut file_names);

		let mut images_seen = 0;
		for name in file_names {
			let mut file = archive.by_name(name)?;

			if file.is_dir() {
				continue;
			}

			let path_buf = file.enclosed_name().unwrap_or_else(|| {
				tracing::warn!("Failed to get enclosed name for zip entry");
				PathBuf::from(name)
			});
			let path = path_buf.as_path();

			if path.is_hidden_file() {
				tracing::trace!(zip_entry = ?path_buf, "Skipping hidden file");
				continue;
			}

			let content_type = path.naive_content_type();
			if images_seen + 1 == page && content_type.is_image() {
				let contents = {
					let mut contents = Vec::new();
					file.read_to_end(&mut contents)?;
					contents
				};
				tracing::trace!(?name, size = contents.len(), "Found targeted zip entry");
				return Ok((content_type, contents));
			} else if content_type.is_image() {
				images_seen += 1;
			}
		}

		tracing::error!("Failed to find valid image in zip file");

		Err(MediaProcessorError::PageNotFound)
	}

	fn get_page_count(&self, path: &Path) -> Result<i32, MediaProcessorError> {
		let zip_file = File::open(path)?;

		let mut archive = ZipArchive::new(&zip_file)?;
		let file_names_archive = archive.clone();

		if archive.is_empty() {
			return Err(MediaProcessorError::ArchiveEmpty);
		}

		let mut pages = 0;
		let file_names = file_names_archive.file_names().collect::<Vec<_>>();
		for name in file_names {
			let file = archive.by_name(name)?;
			let path_buf = file.enclosed_name().unwrap_or_else(|| {
				tracing::warn!("Failed to get enclosed name for zip entry");
				PathBuf::from(name)
			});
			let content_type = path_buf.as_path().naive_content_type();
			let is_hidden = path_buf.as_path().is_hidden_file();

			if content_type.is_image() && !is_hidden {
				pages += 1;
			}
		}

		Ok(pages)
	}

	fn get_page_content_types(
		&self,
		path: &Path,
		pages: Vec<i32>,
	) -> Result<HashMap<i32, ContentType>, MediaProcessorError> {
		let zip_file = File::open(path)?;
		let mut archive = ZipArchive::new(&zip_file)?;

		if archive.is_empty() {
			return Err(MediaProcessorError::ArchiveEmpty);
		}

		let file_names_archive = archive.clone();
		let mut file_names = file_names_archive.file_names().collect::<Vec<_>>();
		sort_file_names(&mut file_names);

		let mut content_types = HashMap::new();

		let mut pages_found = 0;
		for name in file_names {
			let file = archive.by_name(name)?;
			if file.is_dir() {
				continue;
			}
			let path_buf = file.enclosed_name().unwrap_or_else(|| {
				tracing::warn!("Failed to get enclosed name for zip entry");
				PathBuf::from(name)
			});
			let path = path_buf.as_path();

			if path.is_hidden_file() {
				tracing::trace!(zip_entry = ?path_buf, "Skipping hidden file");
				continue;
			}

			let content_type = path.naive_content_type();
			let is_page_in_target = pages.contains(&(pages_found + 1));

			if is_page_in_target && content_type.is_image() {
				tracing::trace!(?name, ?content_type, "found a targeted zip entry");
				content_types.insert(pages_found + 1, content_type);
				pages_found += 1;
			}

			// If we've found all the pages we need, we can stop
			if pages_found == pages.len() as i32 {
				break;
			}
		}

		Ok(content_types)
	}

	fn analyze_page(
		&self,
		path: &Path,
		page: i32,
	) -> Result<AnalyzedPage, MediaProcessorError> {
		let zip_file = File::open(path)?;
		let mut archive = ZipArchive::new(&zip_file)?;
		let file_names_archive = archive.clone();

		if archive.is_empty() {
			return Err(MediaProcessorError::ArchiveEmpty);
		}

		let mut file_names = file_names_archive.file_names().collect::<Vec<_>>();
		sort_file_names(&mut file_names);

		// imagesize only needs the first few KB to read dimensions from headers, taking
		// extra as a precaution. 64kb should be plenty
		const MAX_HEADER_BYTES: usize = 64 * 1024;

		let mut images_seen = 0;
		for name in file_names {
			let file = archive.by_name(name)?;

			if file.is_dir() {
				continue;
			}

			let path_buf = file.enclosed_name().unwrap_or_else(|| {
				tracing::warn!("Failed to get enclosed name for zip entry");
				PathBuf::from(name)
			});
			let entry_path = path_buf.as_path();

			if entry_path.is_hidden_file() {
				tracing::trace!(zip_entry = ?path_buf, "Skipping hidden file");
				continue;
			}

			let content_type = entry_path.naive_content_type();

			if images_seen + 1 == page && content_type.is_image() {
				tracing::trace!(
					?name,
					?content_type,
					"Found targeted zip entry for analysis"
				);
				let mut buf = Vec::with_capacity(MAX_HEADER_BYTES);
				file.take(MAX_HEADER_BYTES as u64).read_to_end(&mut buf)?;

				let size = imagesize::blob_size(&buf)?;

				return Ok(AnalyzedPage {
					width: size.width as u32,
					height: size.height as u32,
					content_type,
				});
			} else if content_type.is_image() {
				images_seen += 1;
			}
		}

		Err(MediaProcessorError::PageNotFound)
	}
}

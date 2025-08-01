use std::{collections::HashMap, fs::File, io::Read, path::PathBuf};
use tracing::{debug, error, trace};

use crate::{
	config::StumpConfig,
	filesystem::{
		content_type::ContentType,
		error::FileError,
		hash,
		media::{
			process::{FileProcessor, FileProcessorOptions, ProcessedFile},
			utils::{metadata_from_buf, sort_file_names},
			ProcessedFileHashes, ProcessedMediaMetadata,
		},
		FileParts, PathUtils,
	},
};

/// A file processor for ZIP files.
pub struct ZipProcessor;

impl FileProcessor for ZipProcessor {
	fn get_sample_size(path: &str) -> Result<u64, FileError> {
		let zip_file = File::open(path)?;
		let mut archive = zip::ZipArchive::new(zip_file)?;

		let mut sample_size = 0;

		for i in 0..archive.len() {
			if i > 5 {
				break;
			}

			if let Ok(file) = archive.by_index(i) {
				sample_size += file.size();
			}
		}

		// TODO: sample size needs to be > 0...
		Ok(sample_size)
	}

	fn generate_stump_hash(path: &str) -> Option<String> {
		let sample_result = Self::get_sample_size(path);

		if let Ok(sample) = sample_result {
			match hash::generate(path, sample) {
				Ok(digest) => Some(digest),
				Err(e) => {
					debug!(error = ?e, path, "Failed to digest zip file");

					None
				},
			}
		} else {
			None
		}
	}

	fn generate_hashes(
		path: &str,
		FileProcessorOptions {
			generate_file_hashes,
			// generate_koreader_hashes,
			..
		}: FileProcessorOptions,
	) -> Result<ProcessedFileHashes, FileError> {
		let hash = generate_file_hashes
			.then(|| ZipProcessor::generate_stump_hash(path))
			.flatten();
		// TODO(koreader): Do we want to hash ZIP files?
		// let koreader_hash = generate_koreader_hashes
		// 	.then(|| generate_koreader_hash(path))
		// 	.transpose()?;

		Ok(ProcessedFileHashes {
			hash,
			koreader_hash: None,
		})
	}

	fn process_metadata(path: &str) -> Result<Option<ProcessedMediaMetadata>, FileError> {
		let zip_file = File::open(path)?;
		let mut archive = zip::ZipArchive::new(zip_file)?;

		let mut metadata = None;

		for i in 0..archive.len() {
			let mut file = archive.by_index(i)?;

			if file.is_dir() {
				trace!("Skipping directory");
				continue;
			}

			let path_buf = file.enclosed_name().unwrap_or_else(|| {
				tracing::warn!("Failed to get enclosed name for zip entry");
				PathBuf::from(file.name())
			});
			let path = path_buf.as_path();

			if path.is_hidden_file() {
				trace!(path = ?path, "Skipping hidden file");
				continue;
			}

			let FileParts { file_name, .. } = path.file_parts();

			if file_name == "ComicInfo.xml" {
				trace!("Found ComicInfo.xml");
				let mut contents = Vec::new();
				file.read_to_end(&mut contents)?;
				let contents = String::from_utf8_lossy(&contents).to_string();
				trace!(contents_len = contents.len(), "Read ComicInfo.xml");
				metadata = metadata_from_buf(&contents);
				break;
			}
		}

		Ok(metadata)
	}

	fn process(
		path: &str,
		options: FileProcessorOptions,
		_: &StumpConfig,
	) -> Result<ProcessedFile, FileError> {
		let zip_file = File::open(path)?;
		let mut archive = zip::ZipArchive::new(zip_file)?;

		let mut metadata = None;
		let mut pages = 0;

		let ProcessedFileHashes {
			hash,
			koreader_hash,
		} = Self::generate_hashes(path, options)?;

		for i in 0..archive.len() {
			let mut file = archive.by_index(i)?;

			if file.is_dir() {
				trace!("Skipping directory");
				continue;
			}

			let path_buf = file.enclosed_name().unwrap_or_else(|| {
				tracing::warn!("Failed to get enclosed name for zip entry");
				PathBuf::from(file.name())
			});
			let path = path_buf.as_path();

			if path.is_hidden_file() {
				trace!(path = ?path, "Skipping hidden file");
				continue;
			}

			let content_type = path.naive_content_type();
			let FileParts { file_name, .. } = path.file_parts();

			if file_name == "ComicInfo.xml" && options.process_metadata {
				trace!("Found ComicInfo.xml");
				let mut contents = Vec::new();
				file.read_to_end(&mut contents)?;
				let contents = String::from_utf8_lossy(&contents).to_string();
				trace!(contents_len = contents.len(), "Read ComicInfo.xml");
				metadata = metadata_from_buf(&contents);
			} else if content_type.is_image() {
				pages += 1;
			}
		}

		Ok(ProcessedFile {
			path: PathBuf::from(path),
			hash,
			koreader_hash,
			metadata,
			pages,
		})
	}

	fn get_page(
		path: &str,
		page: i32,
		_: &StumpConfig,
	) -> Result<(ContentType, Vec<u8>), FileError> {
		let zip_file = File::open(path)?;

		let mut archive = zip::ZipArchive::new(&zip_file)?;
		let file_names_archive = archive.clone();

		if archive.is_empty() {
			error!(path, "Empty zip file");
			return Err(FileError::ArchiveEmptyError);
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
				tracing::trace!(path = ?path_buf, "Skipping hidden file");
				continue;
			}

			let content_type = path.naive_content_type();

			if images_seen + 1 == page && content_type.is_image() {
				trace!(?name, page, ?content_type, "Found targeted zip entry");

				let mut contents = Vec::new();
				file.read_to_end(&mut contents)?;
				trace!(contents_len = contents.len(), "Read zip entry");

				return Ok((content_type, contents));
			} else if content_type.is_image() {
				images_seen += 1;
			}
		}

		error!(page, path, "Failed to find valid image in zip file");

		Err(FileError::NoImageError)
	}

	fn get_page_count(path: &str, _: &StumpConfig) -> Result<i32, FileError> {
		let zip_file = File::open(path)?;

		let mut archive = zip::ZipArchive::new(&zip_file)?;
		let file_names_archive = archive.clone();

		if archive.is_empty() {
			error!(path, "Empty zip file");
			return Err(FileError::ArchiveEmptyError);
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
		path: &str,
		pages: Vec<i32>,
	) -> Result<HashMap<i32, ContentType>, FileError> {
		let zip_file = File::open(path)?;
		let mut archive = zip::ZipArchive::new(&zip_file)?;

		if archive.is_empty() {
			return Err(FileError::ArchiveEmptyError);
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
				trace!(path = ?path_buf, "Skipping hidden file");
				continue;
			}

			let content_type = path.naive_content_type();
			let is_page_in_target = pages.contains(&(pages_found + 1));

			if is_page_in_target && content_type.is_image() {
				trace!(?name, ?content_type, "found a targeted zip entry");
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
}

#[cfg(test)]
mod tests {
	use super::*;
	use crate::filesystem::media::tests::{
		get_nested_macos_compressed_cbz_path, get_test_cbz_path,
		get_test_complex_zip_path, get_test_zip_path,
	};

	#[test]
	fn test_process() {
		let path = get_test_zip_path();
		let config = StumpConfig::debug();

		let processed_file = ZipProcessor::process(
			&path,
			FileProcessorOptions {
				convert_rar_to_zip: false,
				delete_conversion_source: false,
				..Default::default()
			},
			&config,
		);
		assert!(processed_file.is_ok());
	}

	#[test]
	fn test_process_cbz() {
		let path = get_test_cbz_path();
		let config = StumpConfig::debug();

		let processed_file = ZipProcessor::process(
			&path,
			FileProcessorOptions {
				convert_rar_to_zip: false,
				delete_conversion_source: false,
				..Default::default()
			},
			&config,
		);
		assert!(processed_file.is_ok());
	}

	#[test]
	fn test_process_nested_cbz() {
		let path = get_nested_macos_compressed_cbz_path();
		let config = StumpConfig::debug();

		let processed_file = ZipProcessor::process(
			&path,
			FileProcessorOptions {
				convert_rar_to_zip: false,
				delete_conversion_source: false,
				..Default::default()
			},
			&config,
		);
		assert!(processed_file.is_ok());
		assert_eq!(processed_file.unwrap().pages, 3);
	}

	#[test]
	fn test_get_page_cbz() {
		// Note: This doesn't work with the other test book, because it has no pages.
		let path = get_test_cbz_path();
		let config = StumpConfig::debug();

		let page = ZipProcessor::get_page(&path, 1, &config);
		assert!(page.is_ok());
	}

	#[test]
	fn test_get_page_nested_cbz() {
		let path = get_nested_macos_compressed_cbz_path();

		let (content_type, buf) = ZipProcessor::get_page(&path, 1, &StumpConfig::debug())
			.expect("Failed to get page");
		assert_eq!(content_type.mime_type(), "image/jpeg");
		// Note: this is known and expected to be 96623 bytes.
		assert_eq!(buf.len(), 96623);
	}

	#[test]
	fn test_get_page_content_types() {
		let path = get_test_zip_path();

		let content_types = ZipProcessor::get_page_content_types(&path, vec![1]);
		assert!(content_types.is_ok());
	}

	#[test]
	fn test_get_page_content_types_cbz() {
		let path = get_test_cbz_path();

		let content_types =
			ZipProcessor::get_page_content_types(&path, vec![1, 2, 3, 4, 5]);
		assert!(content_types.is_ok());
	}

	#[test]
	fn test_get_page_content_types_nested_cbz() {
		let path = get_nested_macos_compressed_cbz_path();

		let content_types = ZipProcessor::get_page_content_types(&path, vec![1, 2, 3])
			.expect("Failed to get page content types");
		assert_eq!(content_types.len(), 3);
		assert!(content_types
			.values()
			.all(|ct| ct.mime_type() == "image/jpeg"));
	}

	#[test]
	fn test_zip_with_complex_file_tree() {
		let path = get_test_complex_zip_path();

		let config = StumpConfig::debug();
		let processed_file = ZipProcessor::process(
			&path,
			FileProcessorOptions {
				process_metadata: true,
				..Default::default()
			},
			&config,
		)
		.expect("Failed to process ZIP file");

		// See https://github.com/stumpapp/stump/issues/641
		assert!(processed_file.metadata.is_some());
	}
}

use std::{
	collections::HashMap,
	fs::File,
	io::Read,
	path::{Path, PathBuf},
};
use tracing::{debug, error, trace};
use zip::read::ZipFile;

use crate::{
	config::StumpConfig,
	filesystem::{
		content_type::ContentType,
		error::FileError,
		hash,
		media::common::{metadata_from_buf, sort_file_names},
	},
};

use super::{FileProcessor, FileProcessorOptions, ProcessedFile};

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

	fn hash(path: &str) -> Option<String> {
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

	fn process(
		path: &str,
		_: FileProcessorOptions,
		_: &StumpConfig,
	) -> Result<ProcessedFile, FileError> {
		debug!(path, "Processing zip");

		let hash = ZipProcessor::hash(path);
		let zip_file = File::open(path)?;
		let mut archive = zip::ZipArchive::new(zip_file)?;

		let mut metadata = None;
		let mut pages = 0;

		for i in 0..archive.len() {
			let mut file = archive.by_index(i)?;
			let (content_type, buf) = get_zip_entry_content_type(&mut file)?;
			if file.name() == "ComicInfo.xml" {
				trace!("Found ComicInfo.xml");
				// we have the first few bytes of the file in buf, so we need to read the rest and make it a string
				let mut contents = buf.to_vec();
				file.read_to_end(&mut contents)?;
				let contents = String::from_utf8_lossy(&contents).to_string();
				trace!(contents_len = contents.len(), "Read ComicInfo.xml");
				metadata = metadata_from_buf(contents);
			} else if content_type.is_image() {
				pages += 1;
			}
		}

		Ok(ProcessedFile {
			path: PathBuf::from(path),
			hash,
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
			let (content_type, buf) = get_zip_entry_content_type(&mut file)?;

			if images_seen + 1 == page && content_type.is_image() {
				trace!(?name, page, ?content_type, "found target zip entry");
				// read_to_end maintains the current cursor, so we want to start
				// with what we already read
				let mut contents = buf.to_vec();
				file.read_to_end(&mut contents)?;

				return Ok((content_type, contents));
			} else if content_type.is_image() {
				images_seen += 1;
			}
		}

		error!(page, path, "Failed to find valid image");

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
			let mut file = archive.by_name(name)?;
			let (content_type, _) = get_zip_entry_content_type(&mut file)?;

			if content_type.is_image() {
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

		let mut images_seen = 0;
		for name in file_names {
			let mut file = archive.by_name(name)?;
			let (content_type, _) = get_zip_entry_content_type(&mut file)?;
			let is_page_in_target = pages.contains(&(images_seen + 1));

			if is_page_in_target && content_type.is_image() {
				trace!(?name, ?content_type, "found a targeted zip entry");
				content_types.insert(images_seen + 1, content_type);
				images_seen += 1;
			} else if content_type.is_image() {
				images_seen += 1;
			}

			if images_seen == pages.len() as i32 {
				break;
			}
		}

		Ok(content_types)
	}
}

fn get_zip_entry_content_type(
	zipfile: &mut ZipFile,
) -> Result<(ContentType, Vec<u8>), FileError> {
	let file_size = zipfile.size();
	let file_name = zipfile.name().to_string();
	let buf_size = if file_size < 5 { file_size } else { 5 };

	if buf_size < 5 {
		trace!(?buf_size, "Found small zip entry");
	}

	let extension = Path::new(&file_name)
		.extension()
		.and_then(|e| e.to_str())
		.unwrap_or_default();

	let mut buf = vec![0; buf_size as usize];
	zipfile.read_exact(&mut buf)?;
	let content_type = ContentType::from_bytes_with_fallback(&buf, extension);

	Ok((content_type, buf))
}

#[cfg(test)]
mod tests {
	use super::*;
	use crate::filesystem::media::tests::{get_test_cbz_path, get_test_zip_path};

	#[test]
	fn test_process() {
		let path = get_test_zip_path();
		let config = StumpConfig::debug();

		let processed_file = ZipProcessor::process(
			&path,
			FileProcessorOptions {
				convert_rar_to_zip: false,
				delete_conversion_source: false,
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
			},
			&config,
		);
		assert!(processed_file.is_ok());
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
}

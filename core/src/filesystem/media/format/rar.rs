use itertools::Itertools;
use models::shared::image_processor_options::SupportedImageFormat;
use std::{
	collections::HashMap,
	fs::File,
	path::{Path, PathBuf},
};
use tracing::{debug, error, trace, warn};
use unrar::{Archive, CursorBeforeHeader, List, OpenArchive, Process, UnrarResult};

use crate::{
	config::StumpConfig,
	filesystem::{
		archive::create_zip_archive,
		content_type::ContentType,
		error::FileError,
		hash::{self, HASH_SAMPLE_COUNT, HASH_SAMPLE_SIZE},
		media::{
			process::{
				FileConverter, FileProcessor, FileProcessorOptions, ProcessedFile,
				ProcessedFileHashes,
			},
			utils::metadata_from_buf,
			zip::ZipProcessor,
			ProcessedMediaMetadata,
		},
		FileParts, PathUtils,
	},
};

/// A file processor for RAR files.
pub struct RarProcessor;

impl RarProcessor {
	fn init() {
		// See https://github.com/muja/unrar.rs/issues/44
		#[cfg(target_os = "linux")]
		{
			let locale =
				std::env::var("LIBC_LOCALE").unwrap_or_else(|_| "en_US.utf8".to_string());
			tracing::debug!(?locale, "Setting locale for unrar");

			let locale =
				std::ffi::CString::new(locale).expect("Failed to convert locale!");
			unsafe { libc::setlocale(libc::LC_ALL, locale.as_ptr()) };
		}
	}

	fn open_for_processing(
		path: &str,
	) -> UnrarResult<OpenArchive<Process, CursorBeforeHeader>> {
		Self::init();
		Archive::new(path).open_for_processing()
	}

	fn open_for_listing(
		path: &str,
	) -> UnrarResult<OpenArchive<List, CursorBeforeHeader>> {
		Self::init();
		Archive::new(path).open_for_listing()
	}
}

impl FileProcessor for RarProcessor {
	fn get_sample_size(path: &str) -> Result<u64, FileError> {
		let file = File::open(path)?;

		let file_size = file.metadata()?.len();
		let threshold = HASH_SAMPLE_SIZE * HASH_SAMPLE_COUNT;

		if file_size < threshold {
			return Ok(file_size);
		}

		let division = file_size / threshold;

		// if the file size is 4x the threshold, we'll take up to the threshold.
		if division > 4 {
			Ok(threshold)
		} else {
			Ok(file_size / 2)
		}
	}

	fn generate_stump_hash(path: &str) -> Option<String> {
		let sample_result = RarProcessor::get_sample_size(path).ok();

		if let Some(sample) = sample_result {
			match hash::generate(path, sample) {
				Ok(digest) => Some(digest),
				Err(e) => {
					debug!(error = ?e, path, "Failed to digest RAR file");

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
			.then(|| RarProcessor::generate_stump_hash(path))
			.flatten();
		// TODO(koreader): Do we want to hash RAR files?
		// let koreader_hash = generate_koreader_hashes
		// 	.then(|| generate_koreader_hash(path))
		// 	.transpose()?;

		Ok(ProcessedFileHashes {
			hash,
			koreader_hash: None,
		})
	}

	fn process_metadata(path: &str) -> Result<Option<ProcessedMediaMetadata>, FileError> {
		let mut archive = RarProcessor::open_for_processing(path)?;
		let mut metadata_buf = None;

		while let Ok(Some(header)) = archive.read_header() {
			let entry = header.entry();

			if entry.is_directory() {
				archive = header.skip()?;
				continue;
			}

			if entry.filename.is_hidden_file() {
				archive = header.skip()?;
				continue;
			}

			if entry.filename.as_os_str() == "ComicInfo.xml" {
				let (data, _) = header.read()?;
				metadata_buf = Some(data);
				break;
			} else {
				archive = header.skip()?;
			}
		}

		if let Some(buf) = metadata_buf {
			let content_str = std::str::from_utf8(&buf)?;
			Ok(metadata_from_buf(content_str))
		} else {
			Ok(None)
		}
	}

	fn process(
		path: &str,
		options: FileProcessorOptions,
		config: &StumpConfig,
	) -> Result<ProcessedFile, FileError> {
		if options.convert_rar_to_zip {
			let zip_path_buf = RarProcessor::to_zip(
				path,
				options.delete_conversion_source,
				None,
				config,
			)?;
			let zip_path = zip_path_buf.to_str().ok_or_else(|| {
				FileError::UnknownError(
					"Converted RAR file failed to be discovered".to_string(),
				)
			})?;
			return ZipProcessor::process(zip_path, options, config);
		}

		let ProcessedFileHashes {
			hash,
			koreader_hash,
		} = RarProcessor::generate_hashes(path, options)?;

		let mut archive = RarProcessor::open_for_processing(path)?;
		let mut pages = 0;
		let mut metadata_buf = None;

		while let Ok(Some(header)) = archive.read_header() {
			let entry = header.entry();

			let Some(filename) = entry.filename.as_path().file_name() else {
				tracing::warn!(?entry.filename, "Failed to get filename from entry");
				archive = header.skip()?;
				continue;
			};

			if entry.is_directory() {
				archive = header.skip()?;
				continue;
			}

			if entry.filename.is_hidden_file() {
				archive = header.skip()?;
				continue;
			}

			if filename == "ComicInfo.xml" && options.process_metadata {
				let (data, rest) = header.read()?;
				metadata_buf = Some(data);
				archive = rest;
			} else {
				// If the entry is not an image then it cannot be a valid page
				if entry.filename.is_img() {
					pages += 1;
				}
				archive = header.skip()?;
			}
		}

		let metadata = if let Some(buf) = metadata_buf {
			let content_str = std::str::from_utf8(&buf)?;
			metadata_from_buf(content_str)
		} else {
			None
		};

		Ok(ProcessedFile {
			path: PathBuf::from(path),
			hash,
			koreader_hash,
			metadata,
			pages,
		})
	}

	fn get_page(
		file: &str,
		page: i32,
		_: &StumpConfig,
	) -> Result<(ContentType, Vec<u8>), FileError> {
		let archive = RarProcessor::open_for_listing(file)?;

		let sorted_entries = archive
			.into_iter()
			.filter_map(Result::ok)
			.filter(|entry| entry.filename.is_img() && !entry.filename.is_hidden_file())
			.sorted_by(|a, b| alphanumeric_sort::compare_path(&a.filename, &b.filename))
			.collect::<Vec<_>>();

		let target_entry = sorted_entries
			.into_iter()
			.nth((page - 1) as usize)
			.ok_or(FileError::RarReadError)?;
		let FileParts { extension, .. } = target_entry.filename.as_path().file_parts();

		let mut bytes = None;
		let mut archive = RarProcessor::open_for_processing(file)?;
		while let Ok(Some(header)) = archive.read_header() {
			let is_target = header.entry().filename == target_entry.filename;
			if is_target {
				let (data, _) = header.read()?;
				bytes = Some(data);
				break;
			}

			// Otherwise, skip
			archive = header.skip()?;
		}

		let Some(bytes) = bytes else {
			return Err(FileError::NoImageError);
		};

		if bytes.len() < 5 {
			debug!(path = ?file, ?bytes, "File is too small to determine content type");
			return Err(FileError::NoImageError);
		}
		let mut magic_header = [0; 5];
		magic_header.copy_from_slice(&bytes[0..5]);
		let content_type =
			ContentType::from_bytes_with_fallback(&magic_header, &extension);

		Ok((content_type, bytes))
	}

	fn get_page_count(path: &str, _: &StumpConfig) -> Result<i32, FileError> {
		let archive = RarProcessor::open_for_listing(path)?;

		let page_count = archive
			.into_iter()
			.filter_map(Result::ok)
			.filter(|entry| entry.filename.is_img() && !entry.filename.is_hidden_file())
			.count();

		Ok(page_count as i32)
	}

	fn get_page_content_types(
		path: &str,
		pages: Vec<i32>,
	) -> Result<HashMap<i32, ContentType>, FileError> {
		let archive = RarProcessor::open_for_listing(path)?;

		let sorted_entries = archive
			.into_iter()
			.filter_map(Result::ok)
			.filter(|entry| entry.filename.is_img())
			.sorted_by(|a, b| alphanumeric_sort::compare_path(&a.filename, &b.filename))
			.collect::<Vec<_>>();

		let mut content_types = HashMap::new();

		let mut pages_found = 0;
		for entry in sorted_entries {
			let path = entry.filename;

			if path.is_hidden_file() {
				trace!(path = ?path, "Skipping hidden file");
				continue;
			}

			let content_type = path.naive_content_type();
			let is_page_in_target = pages.contains(&(pages_found + 1));

			if is_page_in_target && content_type.is_image() {
				trace!(?path, ?content_type, "found a targeted rar entry");
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

impl FileConverter for RarProcessor {
	fn to_zip(
		path: &str,
		delete_source: bool,
		_: Option<SupportedImageFormat>,
		config: &StumpConfig,
	) -> Result<PathBuf, FileError> {
		debug!(path, "Converting RAR to ZIP");

		// TODO: remove these defaults and bubble up an error...
		let path_buf = PathBuf::from(path);
		let parent = path_buf.parent().unwrap_or_else(|| Path::new("/"));
		let FileParts {
			extension,
			file_stem,
			file_name,
		} = path_buf.as_path().file_parts();

		let cache_dir = config.get_cache_dir();
		let unpacked_path = cache_dir.join(file_stem);

		trace!(?unpacked_path, "Extracting RAR to disk");

		let mut archive = RarProcessor::open_for_processing(path)?;
		while let Ok(Some(header)) = archive.read_header() {
			archive = if header.entry().is_file() {
				header.extract_to(&unpacked_path)?
			} else {
				header.skip()?
			};
		}

		let zip_path =
			create_zip_archive(&unpacked_path, &file_name, &extension, parent)?;

		// TODO: won't work in docker
		if delete_source {
			if let Err(err) = trash::delete(path) {
				warn!(error = ?err, path, "Failed to delete converted RAR file");
			}
		}

		// TODO: maybe check that this path isn't in a pre-defined list of important paths?
		if let Err(err) = std::fs::remove_dir_all(&unpacked_path) {
			error!(
				error = ?err, ?cache_dir, ?unpacked_path, "Failed to delete unpacked RAR contents after conversion",
			);
		}

		Ok(zip_path)
	}
}

#[cfg(test)]
mod tests {
	use super::*;
	use crate::filesystem::media::tests::{
		get_test_complex_rar_path, get_test_rar_file_data, get_test_rar_path,
	};

	use std::fs;

	#[test]
	fn test_process() {
		// Create temporary directory and place a copy of our mock book.rar in it
		let tempdir = tempfile::tempdir().expect("Failed to create temporary directory");
		let temp_rar_file_path = tempdir
			.path()
			.join("book.rar")
			.to_string_lossy()
			.to_string();
		fs::write(&temp_rar_file_path, get_test_rar_file_data())
			.expect("Failed to write temporary book.rar");
		let config = StumpConfig::debug();

		// We can test deletion since it's a temporary file
		let processed_file = RarProcessor::process(
			&temp_rar_file_path,
			FileProcessorOptions {
				convert_rar_to_zip: true,
				delete_conversion_source: true,
				..Default::default()
			},
			&config,
		);

		// Assert that the operation succeeded
		assert!(processed_file.is_ok());
		// And that the original file was deleted
		assert!(!Path::new(&temp_rar_file_path).exists());
	}

	#[test]
	fn test_rar_to_zip() {
		// Create temporary directory and place a copy of our mock book.rar in it
		let tempdir = tempfile::tempdir().expect("Failed to create temporary directory");
		let temp_rar_file_path = tempdir
			.path()
			.join("book.rar")
			.to_string_lossy()
			.to_string();
		fs::write(&temp_rar_file_path, get_test_rar_file_data())
			.expect("Failed to write temporary book.rar");
		let config = StumpConfig::debug();

		// We have a temporary file, so we may as well test deletion also
		let zip_result = RarProcessor::to_zip(&temp_rar_file_path, true, None, &config);
		// Assert that operation succeeded
		assert!(zip_result.is_ok());
		// And that the original file was deleted
		assert!(!Path::new(&temp_rar_file_path).exists());
	}

	#[test]
	fn test_get_page_content_types() {
		let path = get_test_rar_path();

		let content_types = RarProcessor::get_page_content_types(&path, vec![1]);
		assert!(content_types.is_ok());
	}

	#[test]
	fn test_rar_with_complex_file_tree() {
		let path = get_test_complex_rar_path();

		let config = StumpConfig::debug();
		let processed_file = RarProcessor::process(
			&path,
			FileProcessorOptions {
				process_metadata: true,
				..Default::default()
			},
			&config,
		)
		.expect("Failed to process RAR file");

		// See https://github.com/stumpapp/stump/issues/641
		assert!(processed_file.metadata.is_some());
	}
}

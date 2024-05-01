use itertools::Itertools;
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
		image::ImageFormat,
		media::common::metadata_from_buf,
		zip::ZipProcessor,
		FileParts, PathUtils,
	},
};

use super::{process::FileConverter, FileProcessor, FileProcessorOptions, ProcessedFile};

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

	fn hash(path: &str) -> Option<String> {
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

		debug!(path, "Processing RAR");

		let hash: Option<String> = RarProcessor::hash(path);

		let mut archive = RarProcessor::open_for_processing(path)?;
		let mut pages = 0;
		let mut metadata_buf = None;

		while let Ok(Some(header)) = archive.read_header() {
			let entry = header.entry();
			if entry.filename.as_os_str() == "ComicInfo.xml" {
				let (data, rest) = header.read()?;
				metadata_buf = Some(data);
				archive = rest;
			} else {
				// TODO: check for valid page type before incrementing
				pages += 1;
				archive = header.skip()?;
			}
		}

		let metadata = if let Some(buf) = metadata_buf {
			let content_str = std::str::from_utf8(&buf)?;
			metadata_from_buf(content_str.to_string())
		} else {
			None
		};

		Ok(ProcessedFile {
			path: PathBuf::from(path),
			hash,
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

		let mut valid_entries = archive
			.into_iter()
			.filter_map(|entry| entry.ok())
			.filter(|entry| {
				if entry.is_file() {
					let filename =
						entry.filename.as_path().to_string_lossy().to_lowercase();
					filename.ends_with(".jpg")
						|| filename.ends_with(".jpeg")
						|| filename.ends_with(".png")
				} else {
					false
				}
			})
			.collect::<Vec<_>>();
		valid_entries
			.sort_by(|a, b| alphanumeric_sort::compare_path(&a.filename, &b.filename));

		let target_entry = valid_entries
			.into_iter()
			.nth((page - 1) as usize)
			.ok_or(FileError::RarReadError)?;

		let mut bytes = None;
		let mut archive = RarProcessor::open_for_processing(file)?;
		while let Ok(Some(header)) = archive.read_header() {
			let is_target =
				header.entry().filename.as_os_str() == target_entry.filename.as_os_str();
			if is_target {
				let (data, _) = header.read()?;
				bytes = Some(data);
				break;
			} else {
				archive = header.skip()?;
			}
		}

		let content_type = if let Some(bytes) = &bytes {
			if bytes.len() < 5 {
				return Err(FileError::NoImageError);
			}
			let mut magic_header = [0; 5];
			magic_header.copy_from_slice(&bytes[0..5]);
			ContentType::from_bytes(&magic_header)
		} else {
			ContentType::UNKNOWN
		};

		Ok((content_type, bytes.ok_or(FileError::NoImageError)?))
	}

	fn get_page_content_types(
		path: &str,
		pages: Vec<i32>,
	) -> Result<HashMap<i32, ContentType>, FileError> {
		let archive = RarProcessor::open_for_listing(path)?;

		let entries = archive
			.into_iter()
			.filter_map(|entry| entry.ok())
			.filter(|entry| {
				if entry.is_file() {
					let filename =
						entry.filename.as_path().to_string_lossy().to_lowercase();
					filename.ends_with(".jpg")
						|| filename.ends_with(".jpeg")
						|| filename.ends_with(".png")
				} else {
					false
				}
			})
			.sorted_by(|a, b| alphanumeric_sort::compare_path(&a.filename, &b.filename))
			.enumerate()
			.map(|(idx, header)| (PathBuf::from(header.filename.as_os_str()), idx))
			.collect::<HashMap<_, _>>();

		let mut content_types = HashMap::new();
		let mut archive = RarProcessor::open_for_processing(path)?;
		while let Ok(Some(header)) = archive.read_header() {
			archive = if let Some(tuple) =
				entries.get_key_value(&PathBuf::from(header.entry().filename.as_os_str()))
			{
				let page = *tuple.1 as i32;
				if pages.contains(&page) {
					let (data, rest) = header.read()?;
					let path = Path::new(tuple.0);
					let extension = path
						.extension()
						.and_then(|s| s.to_str())
						.unwrap_or_default();

					content_types.insert(
						page,
						ContentType::from_bytes_with_fallback(&data, extension),
					);
					rest
				} else {
					header.skip()?
				}
			} else {
				header.skip()?
			}
		}

		Ok(content_types)
	}
}

impl FileConverter for RarProcessor {
	fn to_zip(
		path: &str,
		delete_source: bool,
		_: Option<ImageFormat>,
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

		trace!(?unpacked_path, "Extracting RAR to cache");

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
				warn!(error = ?err, path,"Failed to delete converted RAR file");
			}
		}

		// TODO: maybe check that this path isn't in a pre-defined list of important paths?
		if let Err(err) = std::fs::remove_dir_all(&unpacked_path) {
			error!(
				error = ?err, ?cache_dir, ?unpacked_path, "Failed to delete unpacked RAR contents in cache",
			);
		}

		Ok(zip_path)
	}
}

#[cfg(test)]
mod tests {
	use super::*;
	use std::fs;

	#[test]
	fn test_process() {
		// Create temporary directory and place a copy of our mock book.rar in it
		let tempdir = tempfile::tempdir().expect("Failed to create temporary directory");
		let temp_rar_file_path = tempdir
			.path()
			.join("epub.rar")
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
			},
			&config,
		);
		assert!(processed_file.is_ok());
	}

	#[test]
	fn test_rar_to_zip() {
		// Create temporary directory and place a copy of our mock book.rar in it
		let tempdir = tempfile::tempdir().expect("Failed to create temporary directory");
		let temp_rar_file_path = tempdir
			.path()
			.join("epub.rar")
			.to_string_lossy()
			.to_string();
		fs::write(&temp_rar_file_path, get_test_rar_file_data())
			.expect("Failed to write temporary book.rar");
		let config = StumpConfig::debug();

		// We have a temporary file, so we may as well test deletion also
		let zip_result = RarProcessor::to_zip(&temp_rar_file_path, true, None, &config);
		assert!(zip_result.is_ok());
	}

	#[test]
	fn test_get_page_content_types() {
		let path = get_test_rar_path();

		let content_types = RarProcessor::get_page_content_types(&path, vec![1]);
		assert!(content_types.is_ok());
	}

	fn get_test_rar_path() -> String {
		PathBuf::from(env!("CARGO_MANIFEST_DIR"))
			.join("integration-tests/data/book.rar")
			.to_string_lossy()
			.to_string()
	}

	fn get_test_rar_file_data() -> Vec<u8> {
		let test_rar_path = get_test_rar_path();

		fs::read(test_rar_path).expect("Failed to fetch mock config file")
	}
}

use std::{
	collections::HashMap,
	fs::{self, create_dir_all, remove_dir_all, remove_file, File},
	path::{Path, PathBuf},
};

use itertools::Itertools;
use unrar::{Archive, CursorBeforeHeader, List, OpenArchive, Process};
use zip::ZipArchive;

use crate::{
	fs_utils::{
		archive::create_zip_archive,
		hash::{self, generate_koreader_hash, HASH_SAMPLE_COUNT, HASH_SAMPLE_SIZE},
		ContentType, FileParts, PathUtils,
	},
	media::processor::{
		error::MediaProcessorError, zip::ZipProcessor, AnalyzedPage, GeneratedFileHashes,
		MediaProcessor, MediaProcessorOptions, ProcessedMediaFile,
	},
	metadata::{utils::metadata_from_buf, ProcessedMediaMetadata},
};

pub struct RarProcessor;

impl MediaProcessor for RarProcessor {
	fn generate_stump_hash(&self, path: &Path) -> Result<String, MediaProcessorError> {
		let file = File::open(path)?;

		let mut sample_size = file.metadata()?.len();
		let threshold = HASH_SAMPLE_SIZE * HASH_SAMPLE_COUNT;

		if sample_size > threshold {
			// if the file size is 4x the threshold, we'll take up to
			// the threshold amount
			if sample_size / threshold > 4 {
				sample_size = threshold;
			} else {
				sample_size = sample_size / 2;
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
		// rar files, or just keep it for epubs
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
		let mut archive = process_archive(path)?;

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
				let content_str = std::str::from_utf8(&data)?;
				return Ok(metadata_from_buf(content_str));
			} else {
				archive = header.skip()?;
			}
		}

		Ok(None)
	}

	fn process(
		&self,
		path: &Path,
		options: MediaProcessorOptions,
	) -> Result<ProcessedMediaFile, MediaProcessorError> {
		let hashes = self.generate_hashes(path, options.clone())?;

		if options.convert_rar_to_zip {
			let zip_path = convert_to_zip(path, options.clone())?;
			return ZipProcessor.process(&zip_path, options);
		}

		let mut archive = process_archive(path)?;
		let mut pages = 0;
		let mut metadata = None;

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
				metadata = {
					let content_str = std::str::from_utf8(&data)?;
					metadata_from_buf(content_str)
				};
				archive = rest;
			} else {
				// If the entry is not an image then it cannot be a valid page
				if entry.filename.is_image() {
					pages += 1;
				}
				archive = header.skip()?;
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
		let archive = list_archive(path)?;

		let sorted_entries = archive
			.into_iter()
			.filter_map(Result::ok)
			.filter(|entry| entry.filename.is_image() && !entry.filename.is_hidden_file())
			.sorted_by(|a, b| alphanumeric_sort::compare_path(&a.filename, &b.filename))
			.collect::<Vec<_>>();
		let target_entry = sorted_entries
			.into_iter()
			.nth((page - 1) as usize)
			.ok_or(MediaProcessorError::PageNotFound)?;

		let FileParts { extension, .. } = target_entry.filename.as_path().file_parts();

		let mut archive = process_archive(path)?;
		while let Ok(Some(header)) = archive.read_header() {
			let entry = header.entry();
			if entry.filename == target_entry.filename {
				let (data, _) = header.read()?;
				let content_type = ContentType::from_extension(&extension);
				return Ok((content_type, data));
			} else {
				archive = header.skip()?;
			}
		}

		Err(MediaProcessorError::PageNotFound)
	}

	fn get_page_count(&self, path: &Path) -> Result<i32, MediaProcessorError> {
		let archive = list_archive(path)?;

		let page_count = archive
			.into_iter()
			.filter_map(Result::ok)
			.filter(|entry| entry.filename.is_image() && !entry.filename.is_hidden_file())
			.count();

		Ok(page_count as i32)
	}

	fn get_page_content_types(
		&self,
		path: &Path,
		pages: Vec<i32>,
	) -> Result<HashMap<i32, ContentType>, MediaProcessorError> {
		let archive = list_archive(path)?;

		let sorted_entries = archive
			.into_iter()
			.filter_map(Result::ok)
			.filter(|entry| entry.filename.is_image())
			.sorted_by(|a, b| alphanumeric_sort::compare_path(&a.filename, &b.filename))
			.collect::<Vec<_>>();

		let mut content_types = HashMap::new();

		let mut pages_found = 0;
		for entry in sorted_entries {
			let entry_path = entry.filename;

			if entry_path.is_hidden_file() {
				tracing::trace!(?entry_path, "Skipping hidden file");
				continue;
			}

			let content_type = entry_path.naive_content_type();
			let is_page_in_target = pages.contains(&(pages_found + 1));

			if is_page_in_target && content_type.is_image() {
				tracing::trace!(?entry_path, ?content_type, "Found target RAR entry");
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
		let (content_type, data) = self.get_page(path, page)?;
		let size = imagesize::blob_size(&data)?;

		Ok(AnalyzedPage {
			width: size.width as u32,
			height: size.height as u32,
			content_type,
		})
	}
}

// TODO(chore): read through issue and see what resolution is, this is quite
// stale and may not be needed anymore but leaving for now
fn set_flags() {
	// See https://github.com/muja/unrar.rs/issues/44
	#[cfg(target_os = "linux")]
	{
		let locale =
			std::env::var("LIBC_LOCALE").unwrap_or_else(|_| "en_US.utf8".to_string());
		tracing::debug!(?locale, "Setting locale for unrar");

		let locale = std::ffi::CString::new(locale).expect("Failed to convert locale!");
		unsafe { libc::setlocale(libc::LC_ALL, locale.as_ptr()) };
	}
}

fn process_archive(
	path: &Path,
) -> Result<OpenArchive<Process, CursorBeforeHeader>, MediaProcessorError> {
	set_flags();
	Ok(Archive::new(path).open_for_processing()?)
}

fn list_archive(
	path: &Path,
) -> Result<OpenArchive<List, CursorBeforeHeader>, MediaProcessorError> {
	set_flags();
	Ok(Archive::new(path).open_for_listing()?)
}

fn convert_to_zip(
	path: &Path,
	options: MediaProcessorOptions,
) -> Result<PathBuf, MediaProcessorError> {
	let parent_path = path.parent().unwrap_or_else(|| Path::new("/"));
	let FileParts {
		extension,
		file_stem,
		..
	} = path.file_parts();
	// stem as to not get double extensions like .cbr.cbz, see
	// https://github.com/stumpapp/stump/issues/1284
	let unpacked_path = options.cache_directory.join(&file_stem);

	tracing::trace!(?unpacked_path, "Unpacking RAR to cache directory");

	create_dir_all(&unpacked_path)?;

	let mut archive = process_archive(path)?;
	let mut extracted_count = 0;

	while let Ok(Some(header)) = archive.read_header() {
		let entry = header.entry();
		if entry.is_file() {
			let entry_path = entry.filename.as_path();
			let target_path = unpacked_path.join(entry_path);

			if let Some(parent_dir) = target_path.parent() {
				create_dir_all(parent_dir)?;
			}

			archive = header.extract_to(&target_path)?;
			extracted_count += 1;
		} else {
			archive = header.skip()?;
		}
	}

	if extracted_count == 0 {
		if let Err(error) = remove_dir_all(&unpacked_path) {
			tracing::error!(
				?error,
				?unpacked_path,
				"Failed to clean up empty extraction directory"
			);
		}
		return Err(MediaProcessorError::ArchiveEmpty);
	}

	let new_extension = if extension.to_lowercase() == "cbr" {
		"cbz"
	} else {
		"zip"
	};
	let zip_path =
		create_zip_archive(&unpacked_path, &file_stem, new_extension, parent_path)?;

	if let Err(error) = validate_converted_zip(&zip_path) {
		tracing::error!(
			?error,
			?zip_path,
			"Validation of converted file failed, aborting"
		);
		remove_file(&zip_path)?;
		remove_dir_all(unpacked_path)?;
		return Err(error);
	}

	if options.delete_conversion_source {
		if let Err(error) = trash::delete(path) {
			tracing::error!(
				?error,
				"Failed to trash original RAR file after conversion!"
			);
		}
	}

	if let Err(error) = remove_dir_all(unpacked_path) {
		tracing::error!(
			?error,
			"Failed to clean up unpacked RAR directory after conversion!"
		);
	}

	Ok(zip_path)
}

fn validate_converted_zip(zip_path: &Path) -> Result<(), MediaProcessorError> {
	if !zip_path.exists() {
		return Err(MediaProcessorError::FileNotFound);
	}

	if fs::metadata(zip_path)?.len() == 0 {
		return Err(MediaProcessorError::ArchiveEmpty);
	}

	let file = File::open(zip_path)?;
	let archive = ZipArchive::new(file)?;

	if archive.is_empty() {
		return Err(MediaProcessorError::ArchiveEmpty);
	}

	// note: there are more checks we can likely add here, however i'd like to think
	// about it a bit more before adding them to prevent accidentally failing valid
	// conversions. see https://github.com/stumpapp/stump/issues/1284

	Ok(())
}

#[cfg(test)]
mod tests {
	use super::*;
	use crate::media::fixtures::{
		get_test_complex_rar_path, get_test_rar_file_data, get_test_rar_path,
	};

	use std::fs;

	#[test]
	fn test_process() {
		// Create temporary directory and place a copy of our mock book.rar in it
		let tempdir = tempfile::tempdir().expect("Failed to create temporary directory");
		let temp_rar_file_path = tempdir
			.path()
			.join("test_process.rar")
			.to_string_lossy()
			.to_string();
		fs::write(&temp_rar_file_path, get_test_rar_file_data())
			.expect("Failed to write temporary test_process.rar");

		// We can test deletion since it's a temporary file
		let processed_file = RarProcessor.process(
			Path::new(&temp_rar_file_path),
			MediaProcessorOptions {
				convert_rar_to_zip: true,
				delete_conversion_source: true,
				..Default::default()
			},
		);

		assert!(
			processed_file.is_ok(),
			"Failed to process RAR: {:?}",
			processed_file.err()
		);
		assert!(!Path::new(&temp_rar_file_path).exists());
	}

	#[test]
	fn test_rar_to_zip() {
		let tempdir = tempfile::tempdir().expect("Failed to create temporary directory");
		let temp_cbr_path = tempdir
			.path()
			.join("test_rar_to_zip.cbr")
			.to_string_lossy()
			.to_string();
		fs::write(&temp_cbr_path, get_test_rar_file_data())
			.expect("failed to write temporary test_rar_to_zip.cbr");

		let options = MediaProcessorOptions {
			delete_conversion_source: true,
			..Default::default()
		};
		let cbz_result = convert_to_zip(Path::new(&temp_cbr_path), options);
		assert!(
			cbz_result.is_ok(),
			"conversion failed: {:?}",
			cbz_result.err()
		);
		let cbz_path = cbz_result.unwrap();

		assert!(
			!Path::new(&temp_cbr_path).exists(),
			"original should be deleted"
		);
		assert!(
			cbz_path.extension().is_some_and(|ext| ext == "cbz"),
			"should convert to .cbz, got: {:?}",
			cbz_path.extension()
		);
		// https://github.com/stumpapp/stump/issues/1284
		assert!(
			!cbz_path.to_string_lossy().contains(".cbr.cbz"),
			"should not have double extension .cbr.cbz"
		);

		let cbz_file = fs::File::open(&cbz_path).expect("failed to open CBZ");
		let cbz_archive =
			zip::ZipArchive::new(cbz_file).expect("failed to read CBZ archive");
		assert!(cbz_archive.len() > 0, "should contain at least one entry");
	}

	#[test]
	fn test_get_page_content_types() {
		let path = get_test_rar_path();
		let content_types =
			RarProcessor.get_page_content_types(Path::new(&path), vec![1]);
		assert!(content_types.is_ok());
	}

	#[test]
	fn test_rar_with_complex_file_tree() {
		let path = get_test_complex_rar_path();
		let processed_file = RarProcessor
			.process(
				Path::new(&path),
				MediaProcessorOptions {
					process_metadata: true,
					..Default::default()
				},
			)
			.expect("Failed to process RAR file");
		// See https://github.com/stumpapp/stump/issues/641
		assert!(processed_file.metadata.is_some());
	}
}

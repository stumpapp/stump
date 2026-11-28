use models::shared::enums::OrganizationMode;
use std::{
	collections::HashMap,
	fs::{self, File, create_dir_all, remove_file},
	path::{Component, Path, PathBuf},
};

use itertools::Itertools;
use tempfile::{Builder as TempDirBuilder, TempDir};
use unrar::{Archive, CursorBeforeHeader, List, OpenArchive, Process};
use zip::ZipArchive;

use crate::{
	fs_utils::{
		ContentType, FileParts, PathUtils,
		archive::create_zip_archive,
		hash::{self, HASH_SAMPLE_COUNT, HASH_SAMPLE_SIZE, generate_koreader_hash},
	},
	media::processor::{
		AnalyzedPage, GeneratedFileHashes, MediaProcessor, MediaProcessorOptions,
		ProcessedMediaFile, error::MediaProcessorError, zip::ZipProcessor,
	},
	metadata::{ProcessedMediaMetadata, utils::comic_info_metadata},
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
				sample_size /= 2;
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
		organization_mode: OrganizationMode,
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
				return comic_info_metadata(content_str, organization_mode);
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
					comic_info_metadata(content_str, options.organization_mode)?
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

fn has_windows_drive_prefix(path: &str) -> bool {
	let bytes = path.as_bytes();
	bytes.len() >= 2 && bytes[0].is_ascii_alphabetic() && bytes[1] == b':'
}

/// Validate and normalize a RAR entry path so extraction cannot escape the target directory.
fn sanitize_rar_entry_path(entry_path: &Path) -> Result<PathBuf, MediaProcessorError> {
	if entry_path.as_os_str().as_encoded_bytes().contains(&b'\0') {
		tracing::warn!(?entry_path, "Rejecting RAR entry containing NUL byte");
		return Err(MediaProcessorError::InvalidArchivePath(
			entry_path.display().to_string(),
		));
	}

	let raw_str = entry_path.to_str().ok_or_else(|| {
		tracing::warn!(?entry_path, "Rejecting RAR entry with non-UTF-8 path");
		MediaProcessorError::InvalidArchivePath(entry_path.display().to_string())
	})?;

	// Normalize Windows separators so traversal and drive-prefix payloads like
	// `..\evil` and `C:\evil` are rejected consistently on Unix as well as Windows.
	let normalized = raw_str.replace('\\', "/");
	if has_windows_drive_prefix(&normalized) {
		tracing::warn!(?entry_path, "Rejecting RAR entry with Windows drive prefix");
		return Err(MediaProcessorError::InvalidArchivePath(
			entry_path.display().to_string(),
		));
	}

	let mut sanitized = PathBuf::new();
	for component in Path::new(&normalized).components() {
		match component {
			Component::Normal(part) => {
				if sanitized.as_os_str().is_empty()
					&& part.to_str().is_some_and(has_windows_drive_prefix)
				{
					tracing::warn!(
						?entry_path,
						"Rejecting RAR entry with Windows drive prefix"
					);
					return Err(MediaProcessorError::InvalidArchivePath(
						entry_path.display().to_string(),
					));
				}
				sanitized.push(part);
			},
			Component::CurDir => {},
			Component::ParentDir | Component::RootDir | Component::Prefix(_) => {
				tracing::warn!(
					?entry_path,
					"Rejecting RAR entry with unsafe path component"
				);
				return Err(MediaProcessorError::InvalidArchivePath(
					entry_path.display().to_string(),
				));
			},
		}
	}

	if sanitized.as_os_str().is_empty() {
		tracing::warn!(?entry_path, "Rejecting RAR entry with empty sanitized path");
		return Err(MediaProcessorError::InvalidArchivePath(
			entry_path.display().to_string(),
		));
	}

	Ok(sanitized)
}

fn create_unpack_dir(
	cache_directory: &Path,
	file_stem: &str,
) -> Result<TempDir, MediaProcessorError> {
	let sanitized_stem: String = file_stem
		.chars()
		.map(|c| {
			if matches!(c, '/' | '\\' | '\0' | ':') {
				'_'
			} else {
				c
			}
		})
		.collect();
	let prefix = if sanitized_stem.is_empty() {
		"rar-".to_string()
	} else {
		format!("{sanitized_stem}-")
	};

	if cache_directory.as_os_str().is_empty() {
		Ok(TempDirBuilder::new().prefix(&prefix).tempdir()?)
	} else {
		create_dir_all(cache_directory)?;
		Ok(TempDirBuilder::new()
			.prefix(&prefix)
			.tempdir_in(cache_directory)?)
	}
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
	let unpacked_dir = create_unpack_dir(&options.cache_directory, &file_stem)?;

	tracing::trace!(
		unpacked_path = ?unpacked_dir.path(),
		"Unpacking RAR to cache directory"
	);

	let mut archive = process_archive(path)?;
	let mut extracted_count = 0;

	while let Ok(Some(header)) = archive.read_header() {
		let entry = header.entry();
		if entry.is_file() {
			let sanitized_path = sanitize_rar_entry_path(entry.filename.as_path())?;
			let target_path = unpacked_dir.path().join(sanitized_path);

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
		if let Err(error) = unpacked_dir.close() {
			tracing::error!(?error, "Failed to clean up empty extraction directory");
		}
		return Err(MediaProcessorError::ArchiveEmpty);
	}

	let new_extension = if extension.to_lowercase() == "cbr" {
		"cbz"
	} else {
		"zip"
	};
	let zip_path =
		create_zip_archive(unpacked_dir.path(), &file_stem, new_extension, parent_path)?;

	if let Err(error) = validate_converted_zip(&zip_path) {
		tracing::error!(
			?error,
			?zip_path,
			"Validation of converted file failed, aborting"
		);
		if let Err(remove_err) = remove_file(&zip_path) {
			tracing::error!(
				?remove_err,
				?zip_path,
				"Failed to remove invalid converted zip file"
			);
		}
		if let Err(close_err) = unpacked_dir.close() {
			tracing::error!(
				?close_err,
				"Failed to clean up unpacked RAR directory after validation failure"
			);
		}
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

	if let Err(error) = unpacked_dir.close() {
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

	fn crc32(data: &[u8]) -> u32 {
		let mut crc = 0xFFFF_FFFFu32;
		for &byte in data {
			crc ^= u32::from(byte);
			for _ in 0..8 {
				let mask = (crc & 1).wrapping_neg();
				crc = (crc >> 1) ^ (0xEDB8_8320 & mask);
			}
		}
		!crc
	}

	fn push_rar4_block(out: &mut Vec<u8>, head_type: u8, head_flags: u16, body: &[u8]) {
		let head_size = (7 + body.len()) as u16;
		let mut block = Vec::with_capacity(head_size as usize);
		block.extend_from_slice(&0u16.to_le_bytes());
		block.push(head_type);
		block.extend_from_slice(&head_flags.to_le_bytes());
		block.extend_from_slice(&head_size.to_le_bytes());
		block.extend_from_slice(body);

		let head_crc = (crc32(&block[2..]) & 0xFFFF) as u16;
		block[0..2].copy_from_slice(&head_crc.to_le_bytes());
		out.extend_from_slice(&block);
	}

	fn build_stored_rar4(entries: &[(&str, &[u8], bool)]) -> Vec<u8> {
		let mut out = Vec::new();
		out.extend_from_slice(&[0x52, 0x61, 0x72, 0x21, 0x1A, 0x07, 0x00]);
		push_rar4_block(&mut out, 0x73, 0x0000, &[0u8; 6]);

		for &(name, data, corrupt_crc) in entries {
			let size = data.len() as u32;
			let file_crc = if corrupt_crc {
				crc32(data) ^ 0xDEAD_BEEF
			} else {
				crc32(data)
			};

			let mut body = Vec::with_capacity(25 + name.len());
			body.extend_from_slice(&size.to_le_bytes());
			body.extend_from_slice(&size.to_le_bytes());
			body.push(0x03); // HOST_OS = Unix so backslashes stay intact for cross-platform checks
			body.extend_from_slice(&file_crc.to_le_bytes());
			body.extend_from_slice(&0x5421_0000u32.to_le_bytes());
			body.push(29);
			body.push(0x30); // METHOD = Stored
			body.extend_from_slice(&(name.len() as u16).to_le_bytes());
			body.extend_from_slice(&0x0000_01A4u32.to_le_bytes());
			body.extend_from_slice(name.as_bytes());

			push_rar4_block(&mut out, 0x74, 0x8000, &body);
			out.extend_from_slice(data);
		}

		push_rar4_block(&mut out, 0x7B, 0x4000, &[]);
		out
	}

	fn assert_dir_empty(dir: &Path) {
		if dir.exists() {
			let remaining = fs::read_dir(dir)
				.expect("read cache dir")
				.collect::<Result<Vec<_>, _>>()
				.expect("collect cache dir entries");
			assert!(
				remaining.is_empty(),
				"expected directory {dir:?} to be empty, found: {remaining:?}"
			);
		}
	}

	fn read_zip_entries(zip_path: &Path) -> HashMap<String, Vec<u8>> {
		use std::io::Read;

		let file = File::open(zip_path).expect("open zip");
		let mut archive = ZipArchive::new(file).expect("read zip archive");
		let mut entries = HashMap::new();

		for idx in 0..archive.len() {
			let mut entry = archive.by_index(idx).expect("zip entry");
			if entry.is_dir() {
				continue;
			}
			let name = entry
				.enclosed_name()
				.map(|p| p.to_string_lossy().replace('\\', "/"))
				.unwrap_or_else(|| entry.name().trim_start_matches('/').to_string());
			let mut buf = Vec::new();
			entry.read_to_end(&mut buf).expect("read zip entry");
			entries.insert(name, buf);
		}

		entries
	}

	#[test]
	fn test_sanitize_rar_entry_path() {
		assert_eq!(
			sanitize_rar_entry_path(Path::new("page1.jpg")).unwrap(),
			PathBuf::from("page1.jpg")
		);
		assert_eq!(
			sanitize_rar_entry_path(Path::new("./page1.jpg")).unwrap(),
			PathBuf::from("page1.jpg")
		);
		assert_eq!(
			sanitize_rar_entry_path(Path::new("chapter1/./page1.jpg")).unwrap(),
			PathBuf::from("chapter1/page1.jpg")
		);
		assert_eq!(
			sanitize_rar_entry_path(Path::new(r"chapter1\page1.jpg")).unwrap(),
			PathBuf::from("chapter1/page1.jpg")
		);
		assert_eq!(
			sanitize_rar_entry_path(Path::new("Re:Zero/01.jpg")).unwrap(),
			PathBuf::from("Re:Zero/01.jpg")
		);

		let unsafe_paths = [
			"../escape.txt",
			"nested/../../escape.txt",
			r"..\escape.txt",
			r"nested\..\..\escape.txt",
			"/etc/passwd",
			r"\etc\passwd",
			r"C:\evil.txt",
			"C:/evil.txt",
			"C:evil.txt",
			"./C:/evil.txt",
			r"\\server\share\evil.txt",
			"",
			".",
			"./.",
			"bad\0name.txt",
		];

		for raw in unsafe_paths {
			let err = sanitize_rar_entry_path(Path::new(raw))
				.expect_err(&format!("expected path {raw:?} to be rejected"));
			assert!(
				matches!(err, MediaProcessorError::InvalidArchivePath(_)),
				"expected InvalidArchivePath for {raw:?}, got {err:?}"
			);
		}
	}

	#[test]
	fn test_convert_to_zip_rejects_parent_dir_traversal() {
		let tempdir = tempfile::tempdir().expect("create tempdir");
		let cache_dir = tempdir.path().join("cache");
		let book_dir = tempdir.path().join("books").join("series");
		fs::create_dir_all(&book_dir).expect("create book dir");

		let rar_path = book_dir.join("evil.cbr");
		let rar_bytes = build_stored_rar4(&[
			("../escape.txt", b"pwned", false),
			("sub/../../escape2.txt", b"pwned2", false),
		]);
		fs::write(&rar_path, rar_bytes).expect("write evil.cbr");

		let result = convert_to_zip(
			&rar_path,
			MediaProcessorOptions {
				cache_directory: cache_dir.clone(),
				..Default::default()
			},
		);

		assert!(
			matches!(result, Err(MediaProcessorError::InvalidArchivePath(_))),
			"expected InvalidArchivePath error, got: {result:?}"
		);
		assert!(!tempdir.path().join("escape.txt").exists());
		assert!(!tempdir.path().join("books").join("escape.txt").exists());
		assert!(!book_dir.join("evil.cbz").exists());
		assert_dir_empty(&cache_dir);
	}

	#[test]
	fn test_convert_to_zip_rejects_root_prefix_and_backslash_traversal() {
		let malicious_entries = [
			"/tmp/stump_evil.txt",
			r"C:\evil.txt",
			"C:/evil.txt",
			r"..\..\escape.txt",
		];

		for entry_name in malicious_entries {
			let tempdir = tempfile::tempdir().expect("create tempdir");
			let cache_dir = tempdir.path().join("cache");
			let rar_path = tempdir.path().join("malicious.cbr");
			let rar_bytes = build_stored_rar4(&[(entry_name, b"payload", false)]);
			fs::write(&rar_path, rar_bytes).expect("write malicious.cbr");

			let result = convert_to_zip(
				&rar_path,
				MediaProcessorOptions {
					cache_directory: cache_dir.clone(),
					..Default::default()
				},
			);

			assert!(
				matches!(result, Err(MediaProcessorError::InvalidArchivePath(_))),
				"expected InvalidArchivePath for {entry_name:?}, got: {result:?}"
			);
			assert!(!tempdir.path().join("malicious.cbz").exists());
			assert_dir_empty(&cache_dir);
		}
	}

	#[test]
	fn test_convert_to_zip_allows_valid_nested_and_curdir_entries() {
		let tempdir = tempfile::tempdir().expect("create tempdir");
		let cache_dir = tempdir.path().join("cache");
		let rar_path = tempdir.path().join("valid.cbr");
		let rar_bytes = build_stored_rar4(&[
			("./page1.jpg", b"page-1-bytes", false),
			(r"chapter1\page2.jpg", b"page-2-bytes", false),
		]);
		fs::write(&rar_path, rar_bytes).expect("write valid.cbr");

		let zip_path = convert_to_zip(
			&rar_path,
			MediaProcessorOptions {
				cache_directory: cache_dir.clone(),
				..Default::default()
			},
		)
		.expect("valid nested RAR should convert cleanly");

		let entries = read_zip_entries(&zip_path);
		assert_eq!(
			entries.get("page1.jpg").map(Vec::as_slice),
			Some(b"page-1-bytes".as_slice())
		);
		assert_eq!(
			entries.get("chapter1/page2.jpg").map(Vec::as_slice),
			Some(b"page-2-bytes".as_slice())
		);
		assert_dir_empty(&cache_dir);
	}

	#[test]
	fn test_convert_to_zip_concurrent_same_file_stem_no_collision() {
		let tempdir = tempfile::tempdir().expect("create tempdir");
		let cache_dir = tempdir.path().join("cache");

		let count = 4usize;
		let mut inputs = Vec::with_capacity(count);
		for idx in 0..count {
			let book_dir = tempdir.path().join(format!("book_{idx}"));
			fs::create_dir_all(&book_dir).expect("create book dir");
			let rar_path = book_dir.join("shared.cbr");
			let payload = format!("unique-content-{idx}");
			let rar_bytes = build_stored_rar4(&[(
				&format!("page_{idx}.jpg"),
				payload.as_bytes(),
				false,
			)]);
			fs::write(&rar_path, rar_bytes).expect("write shared.cbr");
			inputs.push((rar_path, format!("page_{idx}.jpg"), payload));
		}

		let results: Vec<(PathBuf, String, String)> = std::thread::scope(|scope| {
			let handles: Vec<_> = inputs
				.iter()
				.map(|(rar_path, entry_name, payload)| {
					let cache_dir = cache_dir.clone();
					scope.spawn(move || {
						let zip_path = convert_to_zip(
							rar_path,
							MediaProcessorOptions {
								cache_directory: cache_dir,
								..Default::default()
							},
						)
						.expect("concurrent conversion should succeed");
						(zip_path, entry_name.clone(), payload.clone())
					})
				})
				.collect();

			handles
				.into_iter()
				.map(|h| h.join().expect("thread panicked"))
				.collect()
		});

		for (zip_path, expected_entry, expected_payload) in results {
			let entries = read_zip_entries(&zip_path);
			assert_eq!(entries.len(), 1);
			assert_eq!(
				entries.get(&expected_entry).map(Vec::as_slice),
				Some(expected_payload.as_bytes())
			);
		}
		assert_dir_empty(&cache_dir);
	}

	#[test]
	fn test_convert_to_zip_cleans_up_cache_on_extract_error() {
		let tempdir = tempfile::tempdir().expect("create tempdir");
		let cache_dir = tempdir.path().join("cache");
		let rar_path = tempdir.path().join("corrupt.cbr");
		let rar_bytes = build_stored_rar4(&[("page1.jpg", b"corrupted-payload", true)]);
		fs::write(&rar_path, rar_bytes).expect("write corrupt.cbr");

		let result = convert_to_zip(
			&rar_path,
			MediaProcessorOptions {
				cache_directory: cache_dir.clone(),
				..Default::default()
			},
		);

		assert!(
			result.is_err(),
			"expected extraction error for corrupt CRC RAR"
		);
		assert!(!tempdir.path().join("corrupt.cbz").exists());
		assert_dir_empty(&cache_dir);
	}

	#[test]
	fn test_convert_to_zip_cleans_up_cache_on_zip_creation_error() {
		let tempdir = tempfile::tempdir().expect("create tempdir");
		let cache_dir = tempdir.path().join("cache");
		let rar_path = tempdir.path().join("blocked.cbr");
		let rar_bytes = build_stored_rar4(&[("page1.jpg", b"valid-bytes", false)]);
		fs::write(&rar_path, rar_bytes).expect("write blocked.cbr");

		// Block the target `.cbz` path with a directory so `create_zip_archive` fails.
		let blocking_zip_dir = tempdir.path().join("blocked.cbz");
		fs::create_dir_all(&blocking_zip_dir).expect("create blocking directory");

		let result = convert_to_zip(
			&rar_path,
			MediaProcessorOptions {
				cache_directory: cache_dir.clone(),
				..Default::default()
			},
		);

		assert!(
			result.is_err(),
			"expected error when zip destination is blocked by a directory"
		);
		assert_dir_empty(&cache_dir);
	}

	#[test]
	fn test_convert_to_zip_cleans_up_cache_on_empty_archive() {
		let tempdir = tempfile::tempdir().expect("create tempdir");
		let cache_dir = tempdir.path().join("cache");
		let rar_path = tempdir.path().join("empty.cbr");
		let rar_bytes = build_stored_rar4(&[]);
		fs::write(&rar_path, rar_bytes).expect("write empty.cbr");

		let result = convert_to_zip(
			&rar_path,
			MediaProcessorOptions {
				cache_directory: cache_dir.clone(),
				..Default::default()
			},
		);

		assert!(
			matches!(result, Err(MediaProcessorError::ArchiveEmpty)),
			"expected ArchiveEmpty, got: {result:?}"
		);
		assert_dir_empty(&cache_dir);
	}
}

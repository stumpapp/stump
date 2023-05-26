use itertools::Itertools;
use std::{
	collections::HashMap,
	fs::File,
	path::{Path, PathBuf},
};
use tracing::{debug, error, trace, warn};
// TODO: fix this in fork...
// use unrar::open_archive::FileHeader;
use unrar::Archive;

use crate::{
	config,
	filesystem::{
		archive::create_zip_archive,
		content_type::ContentType,
		error::FileError,
		hash::{self, HASH_SAMPLE_COUNT, HASH_SAMPLE_SIZE},
		zip::ZipProcessor,
	},
};

use super::{FileProcessor, FileProcessorOptions, ProcessedFile};

// const RAR_UNSUPPORTED_MSG: &str =
// 	"Stump cannot currently support RAR files in Docker or Windows.";

pub struct RarProcessor;

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
					debug!(error = ?e, path, "Failed to digest RAR file",);

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
	) -> Result<ProcessedFile, FileError> {
		if options.convert_rar_to_zip {
			let zip_path_buf =
				RarProcessor::convert_to_zip(path, options.delete_conversion_source)?;
			let zip_path = zip_path_buf.to_str().ok_or_else(|| {
				FileError::UnknownError(
					"Converted RAR file failed to be discovered".to_string(),
				)
			})?;
			return ZipProcessor::process(zip_path, options);
		}

		debug!(path, "Processing RAR");

		let hash: Option<String> = RarProcessor::hash(path);

		let mut archive = Archive::new(&path).open_for_processing()?;
		let mut pages = 0;
		#[allow(unused)]
		let mut metadata_buf = None;

		while let Some(header) = archive.read_header() {
			let header = header?;
			let entry = header.entry();
			#[allow(unused_assignments)]
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

		Ok(ProcessedFile {
			thumbnail_path: None,
			path: PathBuf::from(path),
			hash,
			metadata: None,
			// metadata: media::process_comic_info(
			// 	std::str::from_utf8(&metadata_buf)?.to_owned(),
			// ),
			pages,
		})
	}

	fn get_page(file: &str, page: i32) -> Result<(ContentType, Vec<u8>), FileError> {
		let archive = Archive::new(file).open_for_listing()?;

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
		valid_entries.sort_by(|a, b| a.filename.cmp(&b.filename));

		let target_entry = valid_entries
			.into_iter()
			.nth((page - 1) as usize)
			.ok_or(FileError::RarReadError)?;

		let mut bytes = None;
		let mut archive = Archive::new(file).open_for_processing()?;
		while let Some(header) = archive.read_header() {
			let header = header?;
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

		// TODO: don't hard code content type!
		Ok((ContentType::JPEG, bytes.ok_or(FileError::NoImageError)?))
	}

	fn get_page_content_types(
		path: &str,
		pages: Vec<i32>,
	) -> Result<HashMap<i32, ContentType>, FileError> {
		let archive = Archive::new(path).open_for_listing()?;

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
			.sorted_by(|a, b| a.filename.cmp(&b.filename))
			.enumerate()
			.map(|(idx, header)| (PathBuf::from(header.filename.as_os_str()), idx))
			.collect::<HashMap<_, _>>();

		let mut content_types = HashMap::new();
		let mut archive = Archive::new(path).open_for_processing()?;
		while let Some(header) = archive.read_header() {
			let header = header?;
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

impl RarProcessor {
	pub fn convert_to_zip(path: &str, delete_source: bool) -> Result<PathBuf, FileError> {
		debug!(path, "Converting RAR to ZIP");

		// TODO: remove these defaults and bubble up an error...
		let path_buf = PathBuf::from(path);
		let parent = path_buf.parent().unwrap_or_else(|| Path::new("/"));
		let dir_name = path_buf
			.file_stem()
			.and_then(|s| s.to_str())
			.unwrap_or_default();
		let original_ext = path_buf
			.extension()
			.unwrap_or_default()
			.to_str()
			.unwrap_or_default();

		let cache_dir = config::get_cache_dir();
		let unpacked_path = cache_dir.join(dir_name);

		trace!(?unpacked_path, "Extracting RAR to cache");

		let mut archive = Archive::new(path).open_for_processing()?;
		while let Some(header) = archive.read_header() {
			let header = header?;
			archive = if header.entry().is_file() {
				header.extract_to(&unpacked_path)?
			} else {
				header.skip()?
			};
		}

		let zip_path =
			create_zip_archive(&unpacked_path, dir_name, original_ext, parent)?;

		if delete_source {
			// Note: this will put the file in the 'trash' according to the user's platform.
			// Rather than hard deleting it, I figured this would be desirable.
			// This error won't be 'fatal' in that it won't cause an error to be returned.
			// TODO: maybe persist a log here? Or make more compliacated return?
			// something like ConvertResult { ConvertedMoveFailed, etc. }
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

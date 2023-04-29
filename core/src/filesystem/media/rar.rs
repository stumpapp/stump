use std::{
	collections::HashMap,
	fs::File,
	path::{Path, PathBuf},
};
use tracing::{debug, error, trace, warn};
use unrar::archive::Entry;

use crate::{
	config::{self, stump_in_docker},
	filesystem::{
		archive::create_zip_archive,
		common::IsImage,
		content_type::ContentType,
		error::FileError,
		hash::{self, HASH_SAMPLE_COUNT, HASH_SAMPLE_SIZE},
	},
};

use super::{FileProcessor, FileProcessorOptions, ProcessedFile};

const RAR_UNSUPPORTED_MSG: &str =
	"Stump cannot currently support RAR files in Docker or Windows.";

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
		// or platform is windows
		if stump_in_docker() || cfg!(windows) {
			return Err(FileError::UnsupportedFileType(
				RAR_UNSUPPORTED_MSG.to_string(),
			));
		}

		debug!(path, "Processing RAR");

		let hash: Option<String> = RarProcessor::hash(path);

		let archive = unrar::Archive::new(&path)?;

		// #[allow(unused_mut)]
		// let mut metadata_buf = Vec::<u8>::new();
		let mut pages = 0;

		match archive.list_extract() {
			Ok(open_archive) => {
				for entry in open_archive {
					match entry {
						Ok(e) => {
							// https://github.com/aaronleopold/unrar.rs/tree/aleopold--read-bytes
							let filename = e.filename.to_string_lossy().to_string();

							if filename.eq("ComicInfo.xml") {
								// FIXME: This was segfaulting in Docker. I have a feeling it is because
								// of my subpar implementation of the `read_bytes`.
								// metadata_buf = match e.read_bytes() {
								// 	Ok(b) => b,
								// 	Err(_e) => {
								// 		// error!("Error reading metadata: {}", e);
								// 		// todo!()
								// 		vec![]
								// 	},
								// }
							} else {
								pages += 1;
							}
						},
						Err(_e) => return Err(FileError::RarReadError),
					}
				}
			},
			Err(_e) => return Err(FileError::RarOpenError),
		};

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
		if stump_in_docker() || cfg!(windows) {
			return Err(FileError::UnsupportedFileType(
				RAR_UNSUPPORTED_MSG.to_string(),
			));
		}

		let archive = unrar::Archive::new(file)?;

		let mut entries: Vec<_> = archive
			.list_extract()
			.map_err(|e| {
				error!("Failed to read rar archive: {:?}", e);

				FileError::RarReadError
			})?
			.filter_map(|e| e.ok())
			.filter(|e| e.is_image())
			.collect();

		entries.sort_by(|a, b| a.filename.cmp(&b.filename));

		let entry = entries.into_iter().nth((page - 1) as usize).unwrap();

		let archive = unrar::Archive::new(file)?;

		let bytes = archive
			.list_extract()
			.map_err(|e| {
				error!("Failed to read rar archive: {:?}", e);

				FileError::RarReadError
			})?
			.filter_map(|e| e.ok())
			.find(|e| e.filename == entry.filename)
			// .next()
			// FIXME: remove this unwrap...
			.unwrap()
			.read_bytes()
			.map_err(|_e| FileError::RarReadError)?;

		Ok((ContentType::JPEG, bytes))
	}

	fn get_page_content_types(
		path: &str,
		pages: Vec<i32>,
	) -> Result<HashMap<i32, ContentType>, FileError> {
		if stump_in_docker() || cfg!(windows) {
			return Err(FileError::UnsupportedFileType(
				RAR_UNSUPPORTED_MSG.to_string(),
			));
		}

		let archive = unrar::Archive::new(path)?;

		let mut entries: Vec<_> = archive
			.list_extract()
			.map_err(|e| {
				error!("Failed to read rar archive: {:?}", e);
				FileError::RarReadError
			})?
			.filter_map(|e| e.ok())
			.filter(|e: &Entry| e.is_image())
			.collect();

		entries.sort_by(|a, b| a.filename.cmp(&b.filename));

		let mut content_types = HashMap::new();

		for (idx, mut entry) in entries.into_iter().enumerate() {
			let page = (idx + 1) as i32;

			if pages.contains(&page) {
				let path = entry.filename.clone();
				let extension = path
					.extension()
					.and_then(|s| s.to_str())
					.unwrap_or_default();

				// NOTE: as with the rest of this file that uses `read_bytes`, this is a hack.
				// Although, in this case, it is even more unideal because instead of reading
				// the first few bytes of the file, we are reading the entire file. I hate it here.
				let contents = entry.read_bytes().map_err(|_e| {
					error!("Failed to read bytes from rar archive");
					FileError::RarReadError
				})?;
				content_types.insert(
					page,
					ContentType::from_bytes_with_fallback(&contents, extension),
				);
			}
		}

		Ok(content_types)
	}
}

impl RarProcessor {
	pub fn convert_to_zip(path: &str) -> Result<PathBuf, FileError> {
		debug!("Converting {:?} to zip format.", &path);

		let archive = unrar::Archive::new(path)?;

		let path_buf = PathBuf::from(path);
		let parent = path_buf.parent().unwrap_or_else(|| Path::new("/"));
		// TODO: remove *unsafe* unwraps
		let dir_name = path_buf
			.file_stem()
			.and_then(|s| s.to_str())
			.unwrap_or_default();
		let original_ext = path_buf.extension().unwrap().to_str().unwrap();

		let cache_dir = config::get_cache_dir();
		let unpacked_path = cache_dir.join(dir_name);

		trace!("Extracting rar contents to: {:?}", &unpacked_path);

		// TODO: fix this mess...
		archive
			.extract_to(&unpacked_path)
			.map_err(|e| {
				error!("Failed to open archive: {:?}", e.to_string());
				FileError::RarOpenError
			})?
			.process()
			.map_err(|e| {
				error!("Failed to extract archive: {:?}", e.to_string());
				FileError::RarExtractError(e.to_string())
			})?;

		let zip_path =
			create_zip_archive(&unpacked_path, dir_name, original_ext, parent)?;

		// Note: this will put the file in the 'trash' according to the user's platform.
		// Rather than hard deleting it, I figured this would be desirable.
		// This error won't be 'fatal' in that it won't cause an error to be returned.
		// TODO: maybe persist a log here? Or make more compliacated return?
		// something like ConvertResult { ConvertedMoveFailed, etc. }
		if let Err(err) = trash::delete(path) {
			warn!(error = ?err, path,"Failed to delete converted RAR file");
		}

		// TODO: same as above, except this is a HARD delete
		// TODO: maybe check that this path isn't in a pre-defined list of important paths?
		if let Err(err) = std::fs::remove_dir_all(&unpacked_path) {
			error!(
				error = ?err, ?cache_dir, ?unpacked_path, "Failed to delete unpacked RAR contents in cache",
			);
		}

		Ok(zip_path)
	}
}

// FIXME: terrible error handling in this file... needs a total rework honestly.

impl IsImage for Entry {
	fn is_image(&self) -> bool {
		if self.is_file() {
			let file_name = self.filename.as_path().to_string_lossy().to_lowercase();
			return file_name.ends_with(".jpg")
				|| file_name.ends_with(".jpeg")
				|| file_name.ends_with(".png");
		}

		false
	}
}

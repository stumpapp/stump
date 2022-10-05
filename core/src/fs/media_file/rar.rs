use std::path::{Path, PathBuf};
use tracing::{debug, error, trace, warn};
use unrar::archive::Entry;

use crate::{
	config::{self, stump_in_docker},
	fs::{
		archive::create_zip_archive,
		checksum::{self, DIGEST_SAMPLE_COUNT, DIGEST_SAMPLE_SIZE},
		media_file::{self, zip, IsImage},
	},
	types::{
		errors::ProcessFileError,
		models::{library::LibraryOptions, media::ProcessedMediaFile},
		ContentType,
	},
};

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

pub fn convert_rar_to_zip(path: &Path) -> Result<PathBuf, ProcessFileError> {
	debug!("Converting {:?} to zip format.", &path);

	let archive = unrar::Archive::new(path)?;

	let parent = path.parent().unwrap_or_else(|| Path::new("/"));
	// TODO: remove *unsafe* unwraps
	let dir_name = path.file_stem().unwrap().to_str().unwrap();
	let original_ext = path.extension().unwrap().to_str().unwrap();
	let unpacked_path = config::get_cache_dir().join(dir_name);

	trace!("Extracting rar contents to: {:?}", &unpacked_path);

	// TODO: fix this mess...
	archive
		.extract_to(&unpacked_path)
		.map_err(|e| {
			error!("Failed to open archive: {:?}", e.to_string());

			ProcessFileError::RarOpenError
		})?
		.process()
		.map_err(|e| {
			error!("Failed to extract archive: {:?}", e.to_string());

			ProcessFileError::RarExtractError(e.to_string())
		})?;

	let zip_path = create_zip_archive(&unpacked_path, dir_name, original_ext, parent)?;

	// Note: this will put the file in the 'trash' according to the user's platform.
	// Rather than hard deleting it, I figured this would be desirable.
	// This error won't be 'fatal' in that it won't cause an error to be returned.
	// TODO: maybe persist a log here? Or make more compliacated return?
	// something like ConvertResult { ConvertedMoveFailed, etc. }
	if let Err(err) = trash::delete(path) {
		warn!(
			"Failed to delete converted rar file {:?}: {:?}",
			path,
			err.to_string()
		);
	}

	// TODO: same as above, except this is a HARD delete
	// TODO: maybe check that this path isn't in a pre-defined list of important paths?
	if let Err(err) = std::fs::remove_dir_all(&unpacked_path) {
		warn!(
			"Failed to delete unpacked rar contents in cache {:?}: {:?}",
			path,
			err.to_string()
		);
	}

	Ok(zip_path)
}

// TODO: fix error handling after rar changes

/// Processes a rar file in its entirety. Will return a tuple of the comic info and the list of
/// files in the rar.
pub fn process_rar(
	path: &Path,
	options: &LibraryOptions,
) -> Result<ProcessedMediaFile, ProcessFileError> {
	if options.convert_rar_to_zip {
		let new_path = convert_rar_to_zip(path)?;

		trace!("Using `process_zip` with converted rar.");

		return zip::process_zip(&new_path);
	}

	if stump_in_docker() {
		return Err(ProcessFileError::UnsupportedFileType(
			"Stump cannot support cbr/rar files in docker containers for now. Please either alter your Library options to convert rar files to zip, or run Stump from source".into(),
		));
	}

	debug!("Processing Rar (new): {}", path.display());

	let path_str = path.to_string_lossy().to_string();
	let archive = unrar::Archive::new(&path)?;

	let mut pages = 0;

	#[allow(unused_mut)]
	let mut metadata_buf = Vec::<u8>::new();

	let checksum = digest_rar(&path_str);

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
					Err(_e) => return Err(ProcessFileError::RarReadError),
				}
			}
		},
		Err(_e) => return Err(ProcessFileError::RarOpenError),
	};

	Ok(ProcessedMediaFile {
		thumbnail_path: None,
		path: path.to_path_buf(),
		checksum,
		metadata: media_file::process_comic_info(
			std::str::from_utf8(&metadata_buf)?.to_owned(),
		),
		pages,
	})
}

// FIXME: this is a temporary work around for the issue wonderful people on Discord
// discovered.
pub fn rar_sample(file: &str) -> Result<u64, ProcessFileError> {
	debug!("Calculating checksum sample size for: {}", file);

	let file = std::fs::File::open(file)?;

	let file_size = file.metadata()?.len();
	let threshold = DIGEST_SAMPLE_SIZE * DIGEST_SAMPLE_COUNT;

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

	// let entries: Vec<_> = archive
	// 	.list()
	// 	.map_err(|e| {
	// 		error!("Failed to read rar archive: {:?}", e);

	// 		ProcessFileError::RarReadError
	// 	})?
	// 	.filter_map(|e| e.ok())
	// 	.filter(|e| e.is_image())
	// 	.collect();

	// // take first 6 images and add their sizes together
	// Ok(entries
	// 	.iter()
	// 	.take(6)
	// 	.fold(0, |acc, e| acc + e.unpacked_size as u64))
}

pub fn digest_rar(file: &str) -> Option<String> {
	debug!("Attempting to generate checksum for: {}", file);

	let sample = rar_sample(file);

	// Error handled in `rar_sample`
	if sample.is_err() {
		return None;
	}

	let size = sample.unwrap();

	debug!(
		"Calculated sample size (in bytes) for generating checksum: {}",
		size
	);

	match checksum::digest(file, size) {
		Ok(digest) => Some(digest),
		Err(e) => {
			debug!(
				"Failed to digest rar file: {}. Unable to generate checksum: {}",
				file, e
			);

			None
		},
	}
}

// FIXME: the unrar library completely breaks on Docker... AGH!!
// Note: I am sorting by filename after opening, *however* this really is *not* ideal.
// If the files were to have any other naming scheme that would be a problem. Is this a problem?
// TODO: I have to solve the `read_bytes` issue on my unrar fork. For now, I am leaving this very unideal
// solution in place. OpenArchive gets consumed by the iterator, and so when the iterator is done, the
// OpenArchive handle stored in Entry is no more. That's why I create another archive to grab what I want before
// the iterator is done. At least, I *think* that is what is happening.
// Fix location: https://github.com/aaronleopold/unrar.rs/tree/aleopold--read-bytes
pub fn get_rar_image(
	file: &str,
	page: i32,
) -> Result<(ContentType, Vec<u8>), ProcessFileError> {
	if stump_in_docker() {
		return Err(ProcessFileError::UnsupportedFileType(
			"Stump cannot support cbr/rar files in docker containers for now.".into(),
		));
	}

	let archive = unrar::Archive::new(file)?;

	let mut entries: Vec<_> = archive
		.list_extract()
		.map_err(|e| {
			error!("Failed to read rar archive: {:?}", e);

			ProcessFileError::RarReadError
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

			ProcessFileError::RarReadError
		})?
		.filter_map(|e| e.ok())
		.find(|e| e.filename == entry.filename)
		// .next()
		// FIXME: remove this unwrap...
		.unwrap()
		.read_bytes()
		.map_err(|_e| ProcessFileError::RarReadError)?;

	Ok((ContentType::JPEG, bytes))

	// if let Some(entry) = entries.into_iter().nth((page - 1) as usize) {
	// 	let archive = unrar::Archive::new(file)?;

	// 	let bytes = archive
	// 		.list_extract()
	// 		.map_err(|e| {
	// 			error!("Failed to read rar archive: {:?}", e);

	// 			ProcessFileError::RarReadError
	// 		})?
	// 		.filter_map(|e| e.ok())
	// 		.filter(|e| e.filename == entry.filename)
	// 		.nth(0)
	// 		// FIXME: remove this unwrap...
	// 		.unwrap()
	// 		.read_bytes()
	// 		.map_err(|_e| ProcessFileError::RarReadError)?;

	// 	return Ok((ContentType::JPEG, bytes));
	// }

	// Err(ProcessFileError::RarReadError)
}

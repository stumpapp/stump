use std::{
	fs::File,
	io::{Read, Write},
	path::{Path, PathBuf},
};
use tracing::{debug, error, info, trace, warn};
use walkdir::WalkDir;
use zip::{read::ZipFile, write::FileOptions};

use crate::{
	fs::{
		checksum,
		media_file::{self, IsImage},
	},
	types::{errors::ProcessFileError, models::media::ProcessedMediaFile, ContentType},
};

impl<'a> IsImage for ZipFile<'a> {
	// FIXME: use infer here
	fn is_image(&self) -> bool {
		if self.is_file() {
			let content_type = media_file::guess_content_type(self.name());
			trace!(
				"Content type of file {:?} is {:?}",
				self.name(),
				content_type
			);

			return content_type.is_image();
		}

		false
	}
}

/// Creates a new zip file at `destination` from the contents of the folder `unpacked_path`.
fn zip_dir(
	unpacked_path: &Path,
	destination: &Path,
	prefix: &Path,
) -> zip::result::ZipResult<()> {
	let zip_file = std::fs::File::create(&destination).unwrap();

	let mut zip_writer = zip::ZipWriter::new(zip_file);

	let options = FileOptions::default()
		.compression_method(zip::CompressionMethod::Stored)
		.unix_permissions(0o755);

	trace!("Creating zip file at {:?}", destination);

	let mut buffer = Vec::new();
	for entry in WalkDir::new(unpacked_path)
		.into_iter()
		.filter_map(|e| e.ok())
	{
		let path = entry.path();
		let name = path.strip_prefix(Path::new(prefix)).unwrap();

		// Write file or directory explicitly
		// Some unzip tools unzip files with directory paths correctly, some do not!
		if path.is_file() {
			trace!("Adding file to zip file: {:?} as {:?}", path, name);
			#[allow(deprecated)]
			zip_writer.start_file_from_path(name, options)?;
			let mut f = File::open(path)?;

			f.read_to_end(&mut buffer)?;
			zip_writer.write_all(&*buffer)?;

			buffer.clear();
		} else if !name.as_os_str().is_empty() {
			// Only if not root! Avoids path spec / warning
			// and mapname conversion failed error on unzip
			trace!("Adding directory to zipfile: {:?} as {:?}", path, name);
			#[allow(deprecated)]
			zip_writer.add_directory_from_path(name, options)?;
		} else {
			warn!("Please create a bug report! This entry did not meet any of the conditions to be added to the zipfile: {:?}", entry);
		}
	}

	Ok(())
}

/// Creates a zip file from a directory at `unpacked_path` and places it in the
/// `destination` directory with the name `name` and the extension `ext`.
/// Uses [`zip_dir`] to actually create the zip file.
pub fn create_zip(
	unpacked_path: &Path,
	name: &str,
	original_ext: &str,
	destination: &Path,
) -> zip::result::ZipResult<PathBuf> {
	// TODO: does it make sense to leave this ext logic up to the caller?
	let mut ext = "cbz";

	if original_ext != "cbr" {
		ext = "zip";
	}

	trace!("Calculated extension for zip file: {}", ext);

	let zip_path = destination.join(format!("{}.{}", name, ext));

	zip_dir(&unpacked_path, &zip_path, unpacked_path)?;

	Ok(zip_path)
}

/// Get the sample size (in bytes) to use for generating a checksum of a zip file. Rather than
/// computing the sample size via the file size, we instead calculate the sample size by
/// summing the size of the first 5 files in the zip file.
pub fn zip_sample(file: &str) -> u64 {
	let zip_file = File::open(file).unwrap();
	let mut archive = zip::ZipArchive::new(zip_file).unwrap();

	let mut sample_size = 0;

	for i in 0..archive.len() {
		if i > 5 {
			break;
		}

		let file = archive.by_index(i).unwrap();

		sample_size += file.size();
	}

	// TODO: sample size needs to be > 0...

	sample_size
}

/// Calls `checksum::digest` to attempt generating a checksum for the zip file.
pub fn digest_zip(path: &str) -> Option<String> {
	let size = zip_sample(path);

	debug!(
		"Calculated sample size (in bytes) for generating checksum: {}",
		size
	);

	match checksum::digest(path, size) {
		Ok(digest) => Some(digest),
		Err(e) => {
			error!(
				"Failed to digest zip file {}. Unable to generate checksum: {}",
				path, e
			);

			None
		},
	}
}

/// Processes a zip file in its entirety, includes: medatadata, page count, and the
/// generated checksum for the file.
// TODO: do I need to pass in the library options here?
pub fn process_zip(path: &Path) -> Result<ProcessedMediaFile, ProcessFileError> {
	info!("Processing Zip: {}", path.display());

	let zip_file = File::open(path)?;
	let mut archive = zip::ZipArchive::new(zip_file)?;

	let mut comic_info = None;
	// let mut entries = Vec::new();
	let mut pages = 0;

	for i in 0..archive.len() {
		let mut file = archive.by_index(i)?;
		// entries.push(file.name().to_owned());
		if file.name() == "ComicInfo.xml" {
			let mut contents = String::new();
			file.read_to_string(&mut contents)?;
			comic_info = media_file::process_comic_info(contents);
		} else if file.is_image() {
			pages += 1;
		}
	}

	Ok(ProcessedMediaFile {
		thumbnail_path: None,
		path: path.to_path_buf(),
		checksum: digest_zip(path.to_str().unwrap()),
		metadata: comic_info,
		pages,
	})
}

// FIXME: this solution is terrible, was just fighting with borrow checker and wanted
// a quick solve. TODO: rework this!
/// Get an image from a zip file by index (page).
pub fn get_zip_image(
	file: &str,
	page: i32,
) -> Result<(ContentType, Vec<u8>), ProcessFileError> {
	let zip_file = File::open(file)?;

	let mut archive = zip::ZipArchive::new(&zip_file)?;
	// FIXME: stinky clone here
	let file_names_archive = archive.clone();

	if archive.len() == 0 {
		error!("Zip file {} is empty", file);
		return Err(ProcessFileError::ArchiveEmptyError);
	}

	let mut file_names = file_names_archive.file_names().collect::<Vec<_>>();
	// NOTE: I noticed some zip files *also* come back out of order >:(
	// TODO: look more into this!
	file_names.sort_by(|a, b| a.cmp(b));

	let mut images_seen = 0;
	for name in file_names {
		let mut file = archive.by_name(name)?;

		let mut contents = Vec::new();
		// Note: guessing mime here since this file isn't accessible from the filesystem,
		// it lives inside the zip file.
		let content_type = media_file::guess_content_type(name);

		if images_seen + 1 == page && file.is_image() {
			trace!("Found target image: {}", name);
			file.read_to_end(&mut contents)?;
			return Ok((content_type, contents));
		} else if file.is_image() {
			images_seen += 1;
		}
	}

	error!(
		"Could not find image for page {} in zip file {}",
		page, file
	);

	Err(ProcessFileError::NoImageError)
}

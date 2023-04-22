use std::{collections::HashMap, fs::File, io::Read, path::Path};
use tracing::{debug, error, trace};
use zip::read::ZipFile;

use crate::{
	fs::{
		checksum,
		media_file::{self, IsImage},
	},
	prelude::{
		errors::ProcessFileError, fs::media_file::ProcessedMediaFile, ContentType,
	},
};

impl<'a> IsImage for ZipFile<'a> {
	fn is_image(&self) -> bool {
		if self.is_file() {
			let content_type = ContentType::from_file(self.name());
			trace!(name = self.name(), content_type = ?content_type, "ContentType of file");
			return content_type.is_image();
		}

		false
	}
}

/// Get the sample size (in bytes) to use for generating a checksum of a zip file. Rather than
/// computing the sample size via the file size, we instead calculate the sample size by
/// summing the size of the first 5 files in the zip file.
pub fn sample_size(file: &str) -> u64 {
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
pub fn digest(path: &str) -> Option<String> {
	let size = sample_size(path);

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
pub fn process(path: &Path) -> Result<ProcessedMediaFile, ProcessFileError> {
	debug!("Processing Zip: {}", path.display());

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

	let checksum = if let Some(path) = path.to_str() {
		digest(path)
	} else {
		None
	};

	Ok(ProcessedMediaFile {
		thumbnail_path: None,
		path: path.to_path_buf(),
		checksum,
		metadata: comic_info,
		pages,
	})
}

// FIXME: this solution is terrible, was just fighting with borrow checker and wanted
// a quick solve. TODO: rework this!
/// Get an image from a zip file by page number. The page number is 1-indexed.
pub fn get_image(
	file_path: &str,
	page: i32,
) -> Result<(ContentType, Vec<u8>), ProcessFileError> {
	let zip_file = File::open(file_path)?;

	let mut archive = zip::ZipArchive::new(&zip_file)?;
	let file_names_archive = archive.clone();

	if archive.is_empty() {
		error!(file_path, "Empty zip file");
		return Err(ProcessFileError::ArchiveEmptyError);
	}

	let mut file_names = file_names_archive.file_names().collect::<Vec<_>>();
	file_names.sort();

	let mut images_seen = 0;
	for name in file_names {
		let mut file = archive.by_name(name)?;

		let file_size = file.size();
		let buff_size = if file_size < 5 { file_size } else { 5 };

		if buff_size < 5 {
			trace!(?name, buff_size, ?file_path, "found small zip entry");
		}

		let extension = Path::new(name)
			.extension()
			.and_then(|e| e.to_str())
			.unwrap_or_default();

		let mut buff = vec![0; buff_size as usize]; // read first buff_size bytes of file
		file.read_exact(&mut buff)?;
		let content_type = ContentType::from_bytes_with_fallback(&buff, extension);

		if images_seen + 1 == page && content_type.is_image() {
			trace!(?name, page, ?content_type, "found target zip entry");
			// read_to_end maintains the current cursor, so we want to start
			// with what we already read
			let mut contents = buff.to_vec();
			file.read_to_end(&mut contents)?;

			return Ok((content_type, contents));
		} else if content_type.is_image() {
			images_seen += 1;
		}
	}

	error!(page, file_path, "Failed to find valid image");

	Err(ProcessFileError::NoImageError)
}

/// Get the content types for a set of pages in a zip file. The page numbers are 1-indexed.
pub fn get_content_types_for_pages(
	file_path: &str,
	pages: Vec<i32>,
) -> Result<HashMap<i32, ContentType>, ProcessFileError> {
	let zip_file = File::open(file_path)?;
	let mut archive = zip::ZipArchive::new(&zip_file)?;

	if archive.is_empty() {
		return Err(ProcessFileError::ArchiveEmptyError);
	}

	let file_names_archive = archive.clone();
	let mut file_names = file_names_archive.file_names().collect::<Vec<_>>();
	file_names.sort();

	let mut content_types = HashMap::new();

	let mut images_seen = 0;
	// TODO: I reused this pattern twice, it is annoying enough to warrant abstraction!
	for name in file_names {
		let mut file = archive.by_name(name)?;
		let file_size = file.size();
		let buff_size = if file_size < 5 { file_size } else { 5 };

		if buff_size < 5 {
			trace!(?name, buff_size, ?file_path, "found small zip entry");
		}

		let extension = Path::new(name)
			.extension()
			.and_then(|e| e.to_str())
			.unwrap_or_default();

		let is_page_in_target = pages.contains(&(images_seen + 1));
		let mut buff = vec![0; buff_size as usize];
		file.read_exact(&mut buff)?;
		let content_type = ContentType::from_bytes_with_fallback(&buff, extension);

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

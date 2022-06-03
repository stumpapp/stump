use crate::{
	fs::media_file::{self, GetPageResult, IsImage},
	types::{alias::ProcessResult, errors::ProcessFileError, models::ProcessedMediaFile},
};

use std::io::Read;
use walkdir::DirEntry;
use zip::read::ZipFile;

use super::checksum;

impl<'a> IsImage for ZipFile<'a> {
	// FIXME: use infer here
	fn is_image(&self) -> bool {
		if self.is_file() {
			let file_name = self.name();
			let file_name = file_name.to_lowercase();
			return file_name.ends_with(".jpg")
				|| file_name.ends_with(".jpeg")
				|| file_name.ends_with(".png");
		}

		false
	}
}

// TODO: result return
pub fn digest_zip(path: &str) -> Option<String> {
	let zip_file = std::fs::File::open(path).unwrap();
	let mut archive = zip::ZipArchive::new(zip_file).unwrap();

	let mut byte_offset = 0;

	for i in 0..archive.len() {
		if i > 5 {
			break;
		}

		let file = archive.by_index(i).unwrap();

		byte_offset += file.size() as i32;
	}

	match checksum::digest(path, byte_offset) {
		Ok(digest) => Some(digest),
		Err(e) => {
			log::error!(
				"Failed to digest zipfile {}, unable to create checksum: {}",
				path,
				e
			);
			None
		},
	}
}

/// Processes a zip file in its entirety. Will return a tuple of the comic info and the list of
/// files in the zip.
pub fn process_zip(file: &DirEntry) -> ProcessResult {
	info!("Processing Zip: {}", file.path().display());

	let zip_file = std::fs::File::open(file.path())?;
	let mut archive = zip::ZipArchive::new(zip_file)?;

	let mut comic_info = None;
	let mut entries = Vec::new();

	for i in 0..archive.len() {
		let mut file = archive.by_index(i)?;
		entries.push(file.name().to_owned());
		if file.name() == "ComicInfo.xml" {
			let mut contents = String::new();
			file.read_to_string(&mut contents)?;
			comic_info = media_file::process_comic_info(contents);
		}
	}

	Ok(ProcessedMediaFile {
		checksum: digest_zip(file.path().to_str().unwrap()),
		metadata: comic_info,
		entries,
	})
}

// FIXME: this solution is terrible, was just fighting with borrow checker and wanted
// a quick solve. TODO: rework this!
/// Get an image from a zip file by index (page).
pub fn get_zip_image(file: &str, page: i32) -> GetPageResult {
	let zip_file = std::fs::File::open(file)?;

	let mut archive = zip::ZipArchive::new(&zip_file)?;
	// FIXME: stinky clone here
	let file_names_archive = archive.clone();

	if archive.len() == 0 {
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
		let content_type = media_file::get_content_type(&file);

		if images_seen + 1 == page && file.is_image() {
			file.read_to_end(&mut contents)?;
			return Ok((content_type, contents));
		} else if file.is_image() {
			images_seen += 1;
		}
	}

	Err(ProcessFileError::NoImageError)
}

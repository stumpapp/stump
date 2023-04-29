use std::{
	collections::HashMap,
	fs::File,
	io::Read,
	path::{Path, PathBuf},
};
use tracing::{debug, error, trace};
use zip::read::ZipFile;

use crate::filesystem::{content_type::ContentType, error::FileError, hash};

use super::{process_metadata, FileProcessor, FileProcessorOptions, ProcessedFile};

pub struct ZipProcessor;

impl FileProcessor for ZipProcessor {
	fn get_sample_size(path: &str) -> Result<u64, FileError> {
		let zip_file = File::open(path)?;
		let mut archive = zip::ZipArchive::new(zip_file)?;

		let mut sample_size = 0;

		for i in 0..archive.len() {
			if i > 5 {
				break;
			}

			if let Ok(file) = archive.by_index(i) {
				sample_size += file.size();
			}
		}

		// TODO: sample size needs to be > 0...
		Ok(sample_size)
	}

	fn hash(path: &str) -> Option<String> {
		let sample_result = Self::get_sample_size(path);

		if let Ok(sample) = sample_result {
			match hash::generate(path, sample) {
				Ok(digest) => Some(digest),
				Err(e) => {
					debug!(error = ?e, path, "Failed to digest zip file");

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
		debug!(path, "Processing zip");

		let hash = ZipProcessor::hash(path);
		let zip_file = File::open(path)?;
		let mut archive = zip::ZipArchive::new(zip_file)?;

		let mut metadata = None;
		let mut pages = 0;

		for i in 0..archive.len() {
			let mut file = archive.by_index(i)?;
			let (content_type, _) = get_zip_entry_content_type(&mut file)?;
			if file.name() == "ComicInfo.xml" {
				let mut contents = String::new();
				file.read_to_string(&mut contents)?;
				metadata = process_metadata(contents);
			} else if content_type.is_image() {
				pages += 1;
			}
		}

		Ok(ProcessedFile {
			thumbnail_path: None,
			path: PathBuf::from(path),
			hash,
			metadata,
			pages,
		})
	}

	fn get_page(path: &str, page: i32) -> Result<(ContentType, Vec<u8>), FileError> {
		let zip_file = File::open(path)?;

		let mut archive = zip::ZipArchive::new(&zip_file)?;
		let file_names_archive = archive.clone();

		if archive.is_empty() {
			error!(path, "Empty zip file");
			return Err(FileError::ArchiveEmptyError);
		}

		let mut file_names = file_names_archive.file_names().collect::<Vec<_>>();
		file_names.sort();

		let mut images_seen = 0;
		for name in file_names {
			let mut file = archive.by_name(name)?;
			let (content_type, buf) = get_zip_entry_content_type(&mut file)?;

			if images_seen + 1 == page && content_type.is_image() {
				trace!(?name, page, ?content_type, "found target zip entry");
				// read_to_end maintains the current cursor, so we want to start
				// with what we already read
				let mut contents = buf.to_vec();
				file.read_to_end(&mut contents)?;

				return Ok((content_type, contents));
			} else if content_type.is_image() {
				images_seen += 1;
			}
		}

		error!(page, path, "Failed to find valid image");

		Err(FileError::NoImageError)
	}

	fn get_page_content_types(
		path: &str,
		pages: Vec<i32>,
	) -> Result<HashMap<i32, ContentType>, FileError> {
		let zip_file = File::open(path)?;
		let mut archive = zip::ZipArchive::new(&zip_file)?;

		if archive.is_empty() {
			return Err(FileError::ArchiveEmptyError);
		}

		let file_names_archive = archive.clone();
		let mut file_names = file_names_archive.file_names().collect::<Vec<_>>();
		file_names.sort();

		let mut content_types = HashMap::new();

		let mut images_seen = 0;
		// TODO: I reused this pattern twice, it is annoying enough to warrant abstraction!
		for name in file_names {
			let mut file = archive.by_name(name)?;
			let (content_type, _) = get_zip_entry_content_type(&mut file)?;
			let is_page_in_target = pages.contains(&(images_seen + 1));

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
}

fn get_zip_entry_content_type(
	zipfile: &mut ZipFile,
) -> Result<(ContentType, Vec<u8>), FileError> {
	let file_size = zipfile.size();
	let file_name = zipfile.name().to_string();
	let buf_size = if file_size < 5 { file_size } else { 5 };

	if buf_size < 5 {
		trace!(?buf_size, "Found small zip entry");
	}

	let extension = Path::new(&file_name)
		.extension()
		.and_then(|e| e.to_str())
		.unwrap_or_default();

	let mut buf = vec![0; buf_size as usize];
	zipfile.read_exact(&mut buf)?;
	let content_type = ContentType::from_bytes_with_fallback(&buf, extension);

	Ok((content_type, buf))
}

use std::{collections::HashMap, path::PathBuf};

use pdf::file::FileOptions;
use tracing::{debug, warn};

use crate::{
	db::entity::metadata::MediaMetadata,
	filesystem::{error::FileError, hash, ContentType},
};

use super::{FileProcessor, FileProcessorOptions, ProcessedFile};

/// A file processor for PDF files.
pub struct PdfProcessor;

impl FileProcessor for PdfProcessor {
	// It is REALLY annoying to work with PDFs, and there is no good way to consume
	// each page as a vector of bytes. So, we'll just make the sample size approximately
	// 1/10th of the file size.
	fn get_sample_size(path: &str) -> Result<u64, FileError> {
		let file = std::fs::File::open(path)?;
		let metadata = file.metadata()?;
		let size = metadata.len();

		if size < 10 {
			warn!(path, size, "File is too small to sample!");
			return Err(FileError::UnknownError(String::from(
				"File is too small to sample!",
			)));
		}

		Ok(size / 10)
	}

	fn hash(path: &str) -> Option<String> {
		let sample_result = PdfProcessor::get_sample_size(path);

		if let Ok(sample) = sample_result {
			match hash::generate(path, sample) {
				Ok(digest) => Some(digest),
				Err(e) => {
					debug!(error = ?e, path, "Failed to digest PDF file");
					None
				},
			}
		} else {
			None
		}
	}

	fn process(path: &str, _: FileProcessorOptions) -> Result<ProcessedFile, FileError> {
		let file = FileOptions::cached().open(path)?;

		if let Some(ref info) = file.trailer.info_dict {
			dbg!(info);
		}

		let pages = file.pages().count() as i32;
		let metadata = file.trailer.info_dict.map(MediaMetadata::from);

		Ok(ProcessedFile {
			path: PathBuf::from(path),
			hash: PdfProcessor::hash(path),
			metadata,
			pages,
		})
	}

	fn get_page(_path: &str, _page: i32) -> Result<(ContentType, Vec<u8>), FileError> {
		Err(FileError::UnsupportedFileType(String::from(
			"Stump does not currently support getting individual PDF pages",
		)))
	}

	fn get_page_content_types(
		_path: &str,
		_pages: Vec<i32>,
	) -> Result<HashMap<i32, ContentType>, FileError> {
		Err(FileError::UnsupportedFileType(String::from(
			"Stump does not currently support getting individual PDF pages",
		)))
	}
}

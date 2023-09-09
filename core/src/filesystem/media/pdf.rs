use std::{collections::HashMap, io::Cursor, num::TryFromIntError, path::PathBuf};

use pdf::file::FileOptions;
use pdfium_render::{prelude::Pdfium, render_config::PdfRenderConfig};

use crate::{
	config,
	db::entity::metadata::MediaMetadata,
	filesystem::{error::FileError, hash, ContentType},
};

use super::{FileProcessor, FileProcessorOptions, ProcessedFile};

/// A file processor for PDF files.
pub struct PdfProcessor;

impl FileProcessor for PdfProcessor {
	// It is REALLY annoying to work with PDFs, and there is no good way to consume
	// each page as a vector of bytes efficiently. Since PDFs don't really have metadata,
	// I wouldn't expect the file to change much after a scan. So, for now, this will
	// just make the sample size approximately 1/10th of the file size.
	fn get_sample_size(path: &str) -> Result<u64, FileError> {
		let file = std::fs::File::open(path)?;
		let metadata = file.metadata()?;
		let size = metadata.len();

		if size < 10 {
			tracing::warn!(path, size, "File is too small to sample!");
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
					tracing::debug!(error = ?e, path, "Failed to digest PDF file");
					None
				},
			}
		} else {
			None
		}
	}

	fn process(path: &str, _: FileProcessorOptions) -> Result<ProcessedFile, FileError> {
		let file = FileOptions::cached().open(path)?;

		let pages = file.pages().count() as i32;
		let metadata = file.trailer.info_dict.map(MediaMetadata::from);

		Ok(ProcessedFile {
			path: PathBuf::from(path),
			hash: PdfProcessor::hash(path),
			metadata,
			pages,
		})
	}

	fn get_page(path: &str, page: i32) -> Result<(ContentType, Vec<u8>), FileError> {
		let pdfium = PdfProcessor::renderer()?;

		let document = pdfium.load_pdf_from_file(path, None)?;
		let document_page =
			document.pages().get((page - 1).try_into().map_err(
				|e: TryFromIntError| FileError::UnknownError(e.to_string()),
			)?)?;

		let render_config = PdfRenderConfig::new();

		let bitmap = document_page.render_with_config(&render_config)?;
		let dyn_image = bitmap.as_image(); // Renders this page to an image::DynamicImage...

		if let Some(image) = dyn_image.as_rgba8() {
			let mut buffer = Cursor::new(vec![]);
			image
				.write_to(&mut buffer, image::ImageOutputFormat::Png)
				.map_err(|e| {
					tracing::error!(error = ?e, "Failed to write image to buffer");
					FileError::PdfProcessingError(String::from(
						"An image could not be rendered from the PDF page",
					))
				})?;
			Ok((ContentType::PNG, buffer.into_inner()))
		} else {
			tracing::warn!(
				path,
				page,
				"An image could not be rendered from the PDF page"
			);
			Err(FileError::PdfProcessingError(String::from(
				"An image could not be rendered from the PDF page",
			)))
		}
	}

	fn get_page_content_types(
		_: &str,
		pages: Vec<i32>,
	) -> Result<HashMap<i32, ContentType>, FileError> {
		// Lol this is sorta funny, but right now all PDFProcessor::get_page calls convert the buffer
		// to PNG format. So, we'll just return that here.
		Ok(pages
			.into_iter()
			.map(|page| (page, ContentType::PNG))
			.collect())
	}
}

impl PdfProcessor {
	/// Initializes a PDFium renderer. If a path to the PDFium library is not provided
	pub fn renderer() -> Result<Pdfium, FileError> {
		let pdfium_path = config::get_pdfium_path();

		if let Some(path) = pdfium_path {
			let bindings = Pdfium::bind_to_library(&path)
			.or_else(|e| {
				tracing::error!(provided_path = ?path, ?e, "Failed to bind to PDFium library at provided path");
				Pdfium::bind_to_system_library()
			})?;
			Ok(Pdfium::new(bindings))
		} else {
			tracing::warn!(
				"No PDFium path provided, will attempt to bind to system library"
			);
			Pdfium::bind_to_system_library()
				.map(Pdfium::new)
				.map_err(|_| FileError::PdfConfigurationError)
		}
	}
}

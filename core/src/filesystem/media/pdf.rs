use std::{
	collections::HashMap,
	io::Cursor,
	num::TryFromIntError,
	path::{Path, PathBuf},
};

use pdf::file::FileOptions;
use pdfium_render::{prelude::Pdfium, render_config::PdfRenderConfig};

use crate::{
	config::StumpConfig,
	db::entity::MediaMetadata,
	filesystem::{
		archive::create_zip_archive, error::FileError, hash, image::ImageFormat,
		ContentType, FileParts, PathUtils,
	},
};

use super::{process::FileConverter, FileProcessor, FileProcessorOptions, ProcessedFile};

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

	fn process(
		path: &str,
		_: FileProcessorOptions,
		_: &StumpConfig,
	) -> Result<ProcessedFile, FileError> {
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

	// TODO: The decision to use PNG should be a configuration option
	fn get_page(
		path: &str,
		page: i32,
		config: &StumpConfig,
	) -> Result<(ContentType, Vec<u8>), FileError> {
		let pdfium = PdfProcessor::renderer(&config.pdfium_path)?;

		let document = pdfium.load_pdf_from_file(path, None)?;
		let document_page =
			document.pages().get((page - 1).try_into().map_err(
				|e: TryFromIntError| FileError::UnknownError(e.to_string()),
			)?)?;

		let render_config = PdfRenderConfig::new();

		let bitmap = document_page.render_with_config(&render_config)?;
		let dyn_image = bitmap.as_image();

		if let Some(image) = dyn_image.as_rgba8() {
			let mut buffer = Cursor::new(vec![]);
			image
				.write_to(&mut buffer, image::ImageFormat::Png)
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

	fn get_page_count(path: &str, config: &StumpConfig) -> Result<i32, FileError> {
		let pdfium = PdfProcessor::renderer(&config.pdfium_path)?;
		let document = pdfium.load_pdf_from_file(path, None)?;

		Ok(document.pages().len() as i32)
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
	pub fn renderer(pdfium_path: &Option<String>) -> Result<Pdfium, FileError> {
		if let Some(path) = pdfium_path {
			let bindings = Pdfium::bind_to_library(path)
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

impl FileConverter for PdfProcessor {
	fn to_zip(
		path: &str,
		delete_source: bool,
		format: Option<ImageFormat>,
		config: &StumpConfig,
	) -> Result<PathBuf, FileError> {
		let pdfium = PdfProcessor::renderer(&config.pdfium_path)?;

		let document = pdfium.load_pdf_from_file(path, None)?;
		let iter = document.pages().iter();

		let render_config = PdfRenderConfig::new();

		let output_format = format
			.clone()
			.map(image::ImageFormat::from)
			.unwrap_or(image::ImageFormat::Png);
		let converted_pages = iter
			.enumerate()
			.map(|(idx, page)| {
				let bitmap = page.render_with_config(&render_config)?;
				let dyn_image = bitmap.as_image();

				if let Some(image) = dyn_image.as_rgba8() {
					let mut buffer = Cursor::new(vec![]);
					image.write_to(&mut buffer, output_format).map_err(|e| {
						tracing::error!(error = ?e, "Failed to write image to buffer");
						FileError::PdfProcessingError(String::from(
							"An image could not be rendered from the PDF page",
						))
					})?;
					Ok(buffer.into_inner())
				} else {
					tracing::warn!(
						path,
						page = idx + 1,
						"An image could not be rendered from the PDF page"
					);
					Err(FileError::PdfProcessingError(String::from(
						"An image could not be rendered from the PDF page",
					)))
				}
			})
			.filter_map(Result::ok)
			.collect::<Vec<Vec<u8>>>();

		let path_buf = PathBuf::from(path);
		let parent = path_buf.parent().unwrap_or_else(|| Path::new("/"));
		let FileParts {
			file_name,
			file_stem,
			extension,
		} = path_buf.as_path().file_parts();

		let cache_dir = config.get_cache_dir();
		let unpacked_path = cache_dir.join(file_stem);

		// create folder for the zip
		std::fs::create_dir_all(&unpacked_path)?;

		// write each image to the folder
		for image_buf in converted_pages {
			// write the image to file with proper extension
			let output_extension =
				format.as_ref().map(|f| f.extension()).unwrap_or("png");

			let image_path =
				unpacked_path.join(format!("{}.{}", file_name, output_extension));

			// NOTE: This isn't bubbling up because I don't think at this point it should
			// kill the whole conversion process.
			if let Err(err) = std::fs::write(image_path, image_buf) {
				tracing::error!(error = ?err, "Failed to write image to file");
			}
		}

		let zip_path =
			create_zip_archive(&unpacked_path, &file_name, &extension, parent)?;

		// TODO: won't work in docker
		if delete_source {
			if let Err(err) = trash::delete(path) {
				tracing::error!(error = ?err, path, "Failed to delete converted PDF source file");
			}
		}

		// TODO: maybe check that this path isn't in a pre-defined list of important paths?
		if let Err(err) = std::fs::remove_dir_all(&unpacked_path) {
			tracing::error!(
				error = ?err, ?cache_dir, ?unpacked_path, "Failed to delete unpacked contents in cache",
			);
		}

		Ok(zip_path)
	}
}

#[cfg(test)]
mod tests {
	use super::*;
	use crate::filesystem::media::tests::get_test_pdf_path;

	#[test]
	fn test_process() {
		let path = get_test_pdf_path();
		let config = StumpConfig::debug();

		let processed_file = PdfProcessor::process(
			&path,
			FileProcessorOptions {
				convert_rar_to_zip: false,
				delete_conversion_source: false,
				..Default::default()
			},
			&config,
		);
		assert!(processed_file.is_ok());
	}

	#[test]
	fn test_get_page_content_types() {
		let path = get_test_pdf_path();

		let content_types = PdfProcessor::get_page_content_types(&path, vec![1]);
		assert!(content_types.is_ok());
	}
}

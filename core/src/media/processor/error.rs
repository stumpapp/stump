#[derive(Debug, thiserror::Error)]
pub enum MediaProcessorError {
	#[error("The media file is empty")]
	ArchiveEmpty,
	#[error("A blocking task panicked or was canceled: {0}")]
	BlockingTask(#[from] tokio::task::JoinError),
	#[error("The media file was not found")]
	FileNotFound,
	#[error("The media file is too small to process")]
	FileTooSmall,
	#[error("An IO error occurred: {0}")]
	Io(#[from] std::io::Error),
	#[error("Failed to read image size: {0}")]
	ImageSize(#[from] imagesize::ImageError),
	#[error("Image operation failed: {0}")]
	Image(#[from] image::ImageError),
	#[error("PDFium is not configured or available")]
	PdfConfiguration,
	#[error("A PDFium error occurred: {0}")]
	Pdfium(#[from] pdfium_render::prelude::PdfiumError),
	#[error("Failed to render PDF page")]
	PdfRenderFailed,
	#[error("The page requested was not found in the media file")]
	PageNotFound,
	#[error("An unknown error occurred: {0}")]
	Unknown(String),
	#[error("An unrar error occurred: {0}")]
	Unrar(#[from] unrar::error::UnrarError),
	#[error("This file type is not supported: {0}")]
	UnsupportedFile(String),
	#[error("A UTF-8 encoding error occurred: {0}")]
	Utf8(#[from] std::str::Utf8Error),
	#[error("A zip error occurred: {0}")]
	Zip(#[from] zip::result::ZipError),
}

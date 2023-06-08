mod common;
pub(crate) mod epub;
pub mod pdf;
mod process;
pub mod rar;
pub mod zip;

pub use crate::filesystem::media::epub::EpubProcessor;
pub use common::is_accepted_cover_name;
pub use process::{
	get_content_types_for_pages, get_page, process, FileProcessor, FileProcessorOptions,
	ProcessedFile, SeriesJson,
};

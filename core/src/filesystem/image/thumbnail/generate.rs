use std::path::PathBuf;

use models::{
	entity::media,
	shared::image_processor_options::{ImageProcessorOptions, SupportedImageFormat},
};
use tokio::{fs, sync::oneshot, task::spawn_blocking};

use crate::{
	config::StumpConfig,
	filesystem::{
		image::{GenericImageProcessor, ImageProcessor, ProcessorError, WebpProcessor},
		media::get_page,
	},
};

/// An error enum for thumbnail generation errors
#[derive(Debug, thiserror::Error)]
pub enum ThumbnailGenerateError {
	#[error("Could not write to disk: {0}")]
	WriteFailed(#[from] std::io::Error),
	#[error("{0}")]
	ProcessorError(#[from] ProcessorError),
	#[error("Did not receive thumbnail generation result")]
	ResultNeverReceived,
	#[error("Something unexpected went wrong: {0}")]
	Unknown(String),
}

/// The options for generating a thumbnail
#[derive(Debug, Clone)]
pub struct GenerateThumbnailOptions {
	pub image_options: ImageProcessorOptions,
	pub core_config: StumpConfig,
	pub force_regen: bool,
	pub filename: Option<String>,
}

/// A type alias for whether a thumbnail was generated or not during the generation process. This is
/// not indicative of success or failure, but rather whether the thumbnail was newly generated or
/// already existed.
pub type DidGenerate = bool;
/// The output of a thumbnail generation operation
pub type GenerateOutput = (Vec<u8>, PathBuf, DidGenerate);

/// The main function for generating a thumbnail for a book. This should be called from within the
/// scope of a blocking task in the [`generate_book_thumbnail`] function.
fn do_generate_book_thumbnail(
	book_path: &str,
	file_name: &str,
	config: &StumpConfig,
	options: ImageProcessorOptions,
) -> Result<GenerateOutput, ProcessorError> {
	let (_, page_data) = get_page(book_path, options.page.unwrap_or(1), config)?;
	let ext = options.format.extension();

	let thumbnail_path = config
		.get_thumbnails_dir()
		.join(format!("{}.{ext}", &file_name));

	let thumbnail_buffer = match options.format {
		SupportedImageFormat::Webp => WebpProcessor::generate(&page_data, options),
		_ => GenericImageProcessor::generate(&page_data, options),
	}?;

	// Explicitly drop the page data to free memory immediately
	drop(page_data);

	Ok((thumbnail_buffer, thumbnail_path, true))
}

/// Generate a thumbnail for a book, returning the thumbnail data, the path to the thumbnail file,
/// and a boolean indicating whether the thumbnail was generated or not. If the thumbnail already
/// exists and `force_regen` is false, the function will return the existing thumbnail data.
#[tracing::instrument(skip_all)]
pub async fn generate_book_thumbnail(
	book: &media::MediaIdentSelect,
	GenerateThumbnailOptions {
		image_options,
		core_config,
		force_regen,
		filename,
	}: GenerateThumbnailOptions,
) -> Result<GenerateOutput, ThumbnailGenerateError> {
	let book_path = book.path.clone();
	let file_name = filename.unwrap_or_else(|| book.id.clone());

	let file_path = core_config.get_thumbnails_dir().join(format!(
		"{}.{}",
		&file_name,
		image_options.format.extension()
	));

	if let Err(e) = fs::metadata(&file_path).await {
		// A `NotFound` error is expected here, but anything else is unexpected
		if e.kind() != std::io::ErrorKind::NotFound {
			tracing::error!(error = ?e, "IO error while checking for file existence?");
		}
	} else if !force_regen {
		match fs::read(&file_path).await {
			Ok(thumbnail) => return Ok((thumbnail, PathBuf::from(&file_path), false)),
			Err(e) => {
				// Realistically, this shouldn't happen if we can grab the metadata, but it isn't a
				// big deal if it does. We can just regenerate the thumbnail in the event something
				// is wrong with the file.
				tracing::error!(error = ?e, "Failed to read thumbnail file from disk! Regenerating...");
			},
		}
	}

	let (tx, rx) = oneshot::channel();

	// Spawn a blocking task to handle the IO-intensive operations:
	// 1. Pulling the page data from the book file
	// 2. Generating the thumbnail from said page data
	let handle = spawn_blocking({
		let book_path = book_path.clone();
		let file_name = file_name.clone();

		move || {
			let result = do_generate_book_thumbnail(
				&book_path,
				&file_name,
				&core_config,
				image_options,
			);
			let send_result = tx.send(result);
			tracing::trace!(
				is_err = send_result.is_err(),
				"Sending generate result to channel"
			);
		}
	});

	let generate_result = match rx.await {
		Ok(result) => result?,
		Err(_) => {
			// Note: `abort` has no affect on blocking threads which have already been spawned,
			// so we just have to wait for the thread to finish.
			// See: https://docs.rs/tokio/latest/tokio/task/fn.spawn_blocking.html
			handle
				.await
				.map_err(|e| ThumbnailGenerateError::Unknown(e.to_string()))?;
			return Err(ThumbnailGenerateError::ResultNeverReceived);
		},
	};

	// Write the thumbnail to the filesystem
	let (thumbnail, thumbnail_path, did_generate) = generate_result;
	fs::write(&thumbnail_path, &thumbnail).await?;

	Ok((thumbnail, thumbnail_path, did_generate))
}

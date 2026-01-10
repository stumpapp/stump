use std::path::PathBuf;

use futures::{stream::FuturesUnordered, StreamExt};
use models::{
	entity::{library, media, series},
	shared::{
		image::ImageMetadata,
		image_processor_options::{ImageProcessorOptions, SupportedImageFormat},
	},
};
use sea_orm::{
	prelude::*, sea_query::Query, EntityTrait, Order, QueryFilter, QueryOrder,
	QuerySelect,
};
use tokio::{fs, sync::oneshot, task::spawn_blocking};

use crate::{
	config::StumpConfig,
	filesystem::{
		image::{
			generate_image_metadata_from_bytes,
			thumbnail::placeholder::generate_image_metadata, GenericImageProcessor,
			ImageProcessor, PlaceholderGenerationJob, PlaceholderGenerationOutput,
			ProcessorError, ThumbnailGenerationJob, ThumbnailGenerationOutput,
			WebpProcessor,
		},
		media::{get_page, get_page_async},
		FileError,
	},
	job::{JobExecuteLog, JobTaskOutput, WorkerCtx},
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
	#[error("Failed to update media entity")]
	UpdateFailed,
	#[error("A candidate source for thumbnail generation could not be found")]
	NothingToGenerate,
	#[error("Source thumbnail is missing an extension")]
	SourceMissingExtension,
	#[error("Database error: {0}")]
	DbError(#[from] sea_orm::DbErr),
	#[error("Failed to pull image from file: {0}")]
	ImagePullFailed(#[from] FileError),
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
	book: &media::MediaThumbSelect,
	conn: &DatabaseConnection,
	GenerateThumbnailOptions {
		image_options,
		core_config,
		force_regen,
		filename,
	}: GenerateThumbnailOptions,
) -> Result<GenerateOutput, ThumbnailGenerateError> {
	let book_path = book.path.clone();
	let file_name = filename.unwrap_or_else(|| book.id.clone());

	let file_path = if let Some(stored_path) = &book.thumbnail_path {
		PathBuf::from(stored_path.clone())
	} else {
		core_config.get_thumbnails_dir().join(format!(
			"{}.{}",
			&file_name,
			image_options.format.extension()
		))
	};

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

	let (thumbnail, thumbnail_path, did_generate) = generate_result;
	fs::write(&thumbnail_path, &thumbnail).await?;

	let thumbnail_metadata = match generate_image_metadata(&thumbnail_path).await {
		Ok(metadata) => Some(metadata),
		Err(e) => {
			tracing::error!(error = ?e, "Failed to generate thumbnail metadata");
			None
		},
	};

	let update_result = media::Entity::update_many()
		.filter(media::Column::Id.eq(book.id.clone()))
		.col_expr(
			media::Column::ThumbnailPath,
			Expr::value(Some(thumbnail_path.to_string_lossy().to_string())),
		)
		.col_expr(
			media::Column::ThumbnailMeta,
			Expr::value(thumbnail_metadata),
		)
		.exec(conn)
		.await;

	match update_result {
		Ok(_) => Ok((thumbnail, thumbnail_path, did_generate)),
		Err(e) => {
			tracing::error!(error = ?e, "Failed to update media entity with thumbnail info");
			Err(ThumbnailGenerateError::UpdateFailed)
		},
	}
}

/// Copy a book's thumbnail to a target entity (series or library) and update the database.
/// The happy path is assumed to be that the book already has a thumbnail generated, which should
/// be the case from the ordering of operations in the thumbnail generation job, however if not it
/// will attempt to generate the thumbnail from the book as a fallback.
#[tracing::instrument(skip(ctx, update_fn, first_book))]
async fn copy_thumbnail_to_entity<E>(
	entity_id: &str,
	first_book: media::MediaThumbSelect,
	ctx: &WorkerCtx,
	options: GenerateThumbnailOptions,
	update_fn: impl FnOnce(String, Option<ImageMetadata>) -> sea_orm::UpdateMany<E>,
) -> Result<GenerateOutput, ThumbnailGenerateError>
where
	E: sea_orm::EntityTrait,
{
	let mut did_regenerate = false;
	let (source_path, thumbnail_data) = match &first_book.thumbnail_path {
		// Note: We don't currently use the data, so might be worth optimizing out in the future.
		Some(path) => (path.clone(), fs::read(path).await.unwrap_or_default()),
		None => {
			// Note that this shouldn't really happen but figured better to handle instead
			let (data, path, _) =
				generate_book_thumbnail(&first_book, ctx.conn.as_ref(), options.clone())
					.await?;
			did_regenerate = true;
			(path.to_string_lossy().to_string(), data)
		},
	};

	let source_path = std::path::PathBuf::from(&source_path);
	match fs::metadata(&source_path).await {
		Ok(_) => {},
		Err(error) => {
			tracing::warn!(
				?error,
				book_id = %first_book.id,
				?source_path,
				"Source thumbnail file does not exist or is inaccessible"
			);
			return Err(ThumbnailGenerateError::NothingToGenerate);
		},
	}

	let ext = source_path
		.extension()
		.and_then(|e| e.to_str())
		.ok_or(ThumbnailGenerateError::SourceMissingExtension)?;

	let dest_path = ctx
		.config
		.get_thumbnails_dir()
		.join(format!("{}.{}", entity_id, ext));

	fs::copy(&source_path, &dest_path).await?;
	tracing::debug!(
		entity_id,
		?source_path,
		?dest_path,
		"Copied book thumbnail to destination"
	);

	let thumbnail_metadata = match (
		did_regenerate || options.force_regen,
		first_book.thumbnail_meta,
	) {
		(true, _) | (false, None) => match generate_image_metadata(&dest_path).await {
			Ok(metadata) => Some(metadata),
			Err(e) => {
				tracing::error!(error = ?e, "Failed to generate thumbnail metadata");
				None
			},
		},
		(false, Some(meta)) => Some(meta),
	};

	update_fn(dest_path.to_string_lossy().to_string(), thumbnail_metadata)
		.exec(ctx.conn.as_ref())
		.await?;

	Ok((thumbnail_data, dest_path, true))
}

#[tracing::instrument(skip_all)]
async fn generate_series_thumbnail(
	series: &series::SeriesThumbSelect,
	ctx: &WorkerCtx,
	options: GenerateThumbnailOptions,
) -> Result<GenerateOutput, ThumbnailGenerateError> {
	if let (false, Some(thumbnail_path)) = (options.force_regen, &series.thumbnail_path) {
		match fs::metadata(thumbnail_path).await {
			Ok(_) => {
				tracing::debug!(
					series_id = %series.id,
					?thumbnail_path,
					"Thumbnail already exists, skipping generation"
				);
				let thumbnail_data = fs::read(thumbnail_path).await?;
				return Ok((thumbnail_data, PathBuf::from(thumbnail_path), false));
			},
			Err(error) => {
				tracing::debug!(
					?error,
					series_id = %series.id,
					?thumbnail_path,
					"Thumbnail path exists in DB but file may be missing, regenerating"
				);
			},
		}
	}

	let first_book = media::Entity::find()
		.select_only()
		.columns(media::MediaThumbSelect::columns())
		.filter(media::Column::SeriesId.eq(&series.id))
		.order_by_asc(media::Column::Name)
		.into_model::<media::MediaThumbSelect>()
		.one(ctx.conn.as_ref())
		.await?;

	let Some(first_book) = first_book else {
		tracing::warn!(series_id = %series.id, "No books found in series");
		return Err(ThumbnailGenerateError::NothingToGenerate);
	};

	copy_thumbnail_to_entity(
		&series.id,
		first_book,
		ctx,
		options,
		|thumbnail_path, thumbnail_metadata| {
			series::Entity::update_many()
				.filter(series::Column::Id.eq(&series.id))
				.col_expr(
					series::Column::ThumbnailPath,
					Expr::value(Some(thumbnail_path)),
				)
				.col_expr(
					series::Column::ThumbnailMeta,
					Expr::value(thumbnail_metadata),
				)
		},
	)
	.await
}

#[tracing::instrument(skip_all)]
async fn generate_library_thumbnail(
	library: &library::LibraryThumbSelect,
	ctx: &WorkerCtx,
	options: GenerateThumbnailOptions,
) -> Result<GenerateOutput, ThumbnailGenerateError> {
	if let (false, Some(thumbnail_path)) = (options.force_regen, &library.thumbnail_path)
	{
		match fs::metadata(thumbnail_path).await {
			Ok(_) => {
				tracing::debug!(
					library_id = %library.id,
					?thumbnail_path,
					"Thumbnail already exists, skipping generation"
				);
				let thumbnail_data = fs::read(thumbnail_path).await?;
				return Ok((thumbnail_data, PathBuf::from(thumbnail_path), false));
			},
			Err(error) => {
				tracing::debug!(
					?error,
					library_id = %library.id,
					?thumbnail_path,
					"Thumbnail path exists in DB but file may be missing, regenerating"
				);
			},
		}
	}

	let first_book = media::Entity::find()
		.select_only()
		.columns(media::MediaThumbSelect::columns())
		.inner_join(series::Entity)
		.filter(series::Column::LibraryId.eq(&library.id))
		.order_by_asc(series::Column::Name)
		.order_by_asc(media::Column::Name)
		.into_model::<media::MediaThumbSelect>()
		.one(ctx.conn.as_ref())
		.await?;

	let Some(first_book) = first_book else {
		tracing::warn!(library_id = %library.id, "No books found in library");
		return Err(ThumbnailGenerateError::NothingToGenerate);
	};

	copy_thumbnail_to_entity(
		&library.id,
		first_book,
		ctx,
		options,
		|thumbnail_path, thumbnail_metadata| {
			library::Entity::update_many()
				.filter(library::Column::Id.eq(&library.id))
				.col_expr(
					library::Column::ThumbnailPath,
					Expr::value(Some(thumbnail_path)),
				)
				.col_expr(
					library::Column::ThumbnailMeta,
					Expr::value(thumbnail_metadata),
				)
		},
	)
	.await
}

pub enum GenerateImageSource {
	Book(media::MediaThumbSelect),
	Series(series::SeriesThumbSelect),
	Library(library::LibraryThumbSelect),
}

#[tracing::instrument(skip_all)]
pub async fn safely_generate_batch(
	sources: Vec<GenerateImageSource>,
	ctx: &WorkerCtx,
	options: GenerateThumbnailOptions,
	reporter: impl Fn(usize),
) -> JobTaskOutput<ThumbnailGenerationJob> {
	let mut output = ThumbnailGenerationOutput::default();
	let mut logs = vec![];

	let max_concurrency = options.core_config.max_thumbnail_concurrency;
	let batch_size = max_concurrency;
	let total_sources = sources.len();
	tracing::debug!(
		batch_size,
		total_sources,
		"Processing thumbnails in batches"
	);

	let mut processed_count = 0;

	for (chunk_index, chunk) in sources.chunks(batch_size).enumerate() {
		let mut chunk_futures = FuturesUnordered::new();

		tracing::trace!(
			chunk_index,
			chunk_size = chunk.len(),
			"Processing thumbnail generation batch"
		);

		for (source_index, source) in chunk.iter().enumerate() {
			let options = options.clone();
			let path = match source {
				GenerateImageSource::Book(book) => book.path.clone(),
				GenerateImageSource::Series(series) => series.path.clone(),
				GenerateImageSource::Library(library) => library.path.clone(),
			};

			let future = async move {
				tracing::trace!(?path, "(Chunk {chunk_index}, Item {source_index}) Starting thumbnail generation");

				let result = match source {
					GenerateImageSource::Book(book) => {
						generate_book_thumbnail(book, ctx.conn.as_ref(), options).await
					},
					GenerateImageSource::Series(series) => {
						generate_series_thumbnail(series, ctx, options).await
					},
					GenerateImageSource::Library(library) => {
						generate_library_thumbnail(library, ctx, options).await
					},
				}
				.map(|(_, path, did_generate)| (path, did_generate));

				result.map_err(|e| (e, path))
			};

			chunk_futures.push(future);
		}

		while let Some(gen_output) = chunk_futures.next().await {
			match gen_output {
				Ok((_, did_generate)) => {
					if did_generate {
						output.generated_thumbnails += 1;
					} else {
						output.skipped_files += 1;
					}
				},
				Err((error, path)) => {
					logs.push(
						JobExecuteLog::error(format!(
							"Failed to generate thumbnail: {:?}",
							error.to_string()
						))
						.with_ctx(format!("Media path: {path}")),
					);
				},
			}

			output.visited_files += 1;
			processed_count += 1;
			reporter(processed_count);
		}

		// TODO: Read up more on this, I added as an attempt to force garbage collection
		// between batches to help with memory usage, but it may not be necessary.
		if processed_count < total_sources {
			tokio::task::yield_now().await;
		}
	}

	JobTaskOutput {
		output,
		logs,
		subtasks: vec![],
	}
}

/// Generate placeholder metadata (ImageMetadata) for a book's existing thumbnail
#[tracing::instrument(skip_all)]
pub async fn generate_book_placeholder(
	book: &media::MediaThumbSelect,
	ctx: &WorkerCtx,
	force_regen: bool,
) -> Result<(), ThumbnailGenerateError> {
	// Skip if metadata exists and not forcing regeneration
	if !force_regen && book.thumbnail_meta.is_some() {
		return Ok(());
	}

	// Pull the image data from either the existing thumb on disk or try to pull the full-res image
	// from the book. This way we don't require people to generate thumbnails in order to have good
	// placeholder metadata
	let image_data = match &book.thumbnail_path {
		Some(thumbnail_path) if fs::metadata(&thumbnail_path).await.is_ok() => {
			let path = PathBuf::from(thumbnail_path);
			fs::read(&path).await?
		},
		_ => {
			let (_, data) = get_page_async(&book.path, 1, &ctx.config).await?;
			data
		},
	};

	let thumbnail_metadata = match generate_image_metadata_from_bytes(image_data).await {
		Ok(metadata) => Some(metadata),
		Err(e) => {
			tracing::error!(error = ?e, "Failed to generate thumbnail metadata");
			None
		},
	};

	media::Entity::update_many()
		.filter(media::Column::Id.eq(&book.id))
		.col_expr(
			media::Column::ThumbnailMeta,
			Expr::value(thumbnail_metadata),
		)
		.exec(ctx.conn.as_ref())
		.await?;

	Ok(())
}

async fn get_series_thumbnail_candidate(
	series: &series::SeriesThumbSelect,
	ctx: &WorkerCtx,
) -> Result<Option<Vec<u8>>, ThumbnailGenerateError> {
	let Some(first_book) = media::Entity::find()
		.filter(media::Column::SeriesId.eq(series.id.clone()))
		.order_by_asc(media::Column::Name)
		.into_model::<media::MediaThumbSelect>()
		.one(ctx.conn.as_ref())
		.await?
	else {
		tracing::warn!(series_id = %series.id, "No books found in series");
		return Err(ThumbnailGenerateError::NothingToGenerate);
	};

	let image_data = match &first_book.thumbnail_path {
		Some(thumbnail_path) if fs::metadata(&thumbnail_path).await.is_ok() => {
			let path = PathBuf::from(thumbnail_path);
			fs::read(&path).await?
		},
		_ => {
			let (_, data) = get_page_async(&first_book.path, 1, &ctx.config).await?;
			data
		},
	};

	Ok(Some(image_data))
}

/// Generate placeholder metadata for a series's existing thumbnail
#[tracing::instrument(skip_all)]
async fn generate_series_placeholder(
	series: &series::SeriesThumbSelect,
	ctx: &WorkerCtx,
	force_regen: bool,
) -> Result<(), ThumbnailGenerateError> {
	// Skip if metadata exists and not forcing regeneration
	if !force_regen && series.thumbnail_meta.is_some() {
		return Ok(());
	}

	let image_data = match &series.thumbnail_path {
		Some(thumbnail_path) if fs::metadata(&thumbnail_path).await.is_ok() => {
			let path = PathBuf::from(thumbnail_path);
			fs::read(&path).await?
		},
		_ => {
			tracing::debug!(series_id = %series.id, "Pulling thumbnail candidate from first book in series");
			let Some(data) = get_series_thumbnail_candidate(series, ctx).await? else {
				return Err(ThumbnailGenerateError::NothingToGenerate);
			};
			data
		},
	};

	let thumbnail_metadata = match generate_image_metadata_from_bytes(image_data).await {
		Ok(metadata) => Some(metadata),
		Err(e) => {
			tracing::error!(error = ?e, "Failed to generate thumbnail metadata");
			None
		},
	};

	series::Entity::update_many()
		.filter(series::Column::Id.eq(&series.id))
		.col_expr(
			series::Column::ThumbnailMeta,
			Expr::value(thumbnail_metadata),
		)
		.exec(ctx.conn.as_ref())
		.await?;

	Ok(())
}

async fn get_library_thumbnail_candidate(
	library: &library::LibraryThumbSelect,
	ctx: &WorkerCtx,
) -> Result<Option<Vec<u8>>, ThumbnailGenerateError> {
	let first_book = media::Entity::find()
		.filter(
			media::Column::SeriesId.in_subquery(
				Query::select()
					.column(series::Column::Id)
					.from(series::Entity)
					.and_where(
						Expr::col(series::Column::LibraryId).eq(library.id.clone()),
					)
					.order_by(series::Column::Name, Order::Asc)
					.limit(1)
					.to_owned(),
			),
		)
		.order_by_asc(media::Column::Name)
		.into_model::<media::MediaThumbSelect>()
		.one(ctx.conn.as_ref())
		.await?;

	let Some(book) = first_book else {
		tracing::warn!(library_id = %library.id, "No books found in library");
		return Err(ThumbnailGenerateError::NothingToGenerate);
	};

	let image_data = match &book.thumbnail_path {
		Some(thumbnail_path) if fs::metadata(&thumbnail_path).await.is_ok() => {
			let path = PathBuf::from(thumbnail_path);
			fs::read(&path).await?
		},
		_ => {
			let (_, data) = get_page_async(&book.path, 1, &ctx.config).await?;
			data
		},
	};

	Ok(Some(image_data))
}

/// Generate placeholder metadata for a library's existing thumbnail
#[tracing::instrument(skip_all)]
async fn generate_library_placeholder(
	library: &library::LibraryThumbSelect,
	ctx: &WorkerCtx,
	force_regen: bool,
) -> Result<(), ThumbnailGenerateError> {
	// Skip if metadata exists and not forcing regeneration
	if !force_regen && library.thumbnail_meta.is_some() {
		return Ok(());
	}

	let image_data = match &library.thumbnail_path {
		Some(thumbnail_path) if fs::metadata(&thumbnail_path).await.is_ok() => {
			let path = PathBuf::from(thumbnail_path);
			fs::read(&path).await?
		},
		_ => {
			tracing::debug!(library_id = %library.id, "Pulling thumbnail candidate from first book in library");
			let Some(data) = get_library_thumbnail_candidate(library, ctx).await? else {
				return Err(ThumbnailGenerateError::NothingToGenerate);
			};
			data
		},
	};

	let thumbnail_metadata = match generate_image_metadata_from_bytes(image_data).await {
		Ok(metadata) => Some(metadata),
		Err(e) => {
			tracing::error!(error = ?e, "Failed to generate thumbnail metadata");
			None
		},
	};

	library::Entity::update_many()
		.filter(library::Column::Id.eq(&library.id))
		.col_expr(
			library::Column::ThumbnailMeta,
			Expr::value(thumbnail_metadata),
		)
		.exec(ctx.conn.as_ref())
		.await?;

	Ok(())
}

/// Batch generate placeholder metadata for multiple sources with concurrency control
#[tracing::instrument(skip_all)]
pub async fn safely_generate_placeholder_batch(
	sources: Vec<GenerateImageSource>,
	ctx: &WorkerCtx,
	force_regen: bool,
	reporter: impl Fn(usize),
) -> JobTaskOutput<PlaceholderGenerationJob> {
	let mut output = PlaceholderGenerationOutput::default();
	let mut logs = vec![];

	let max_concurrency = ctx.config.max_thumbnail_concurrency;
	let batch_size = max_concurrency;
	let total_sources = sources.len();
	tracing::debug!(
		batch_size,
		total_sources,
		"Processing placeholder colors in batches"
	);

	let mut processed_count = 0;

	for (chunk_index, chunk) in sources.chunks(batch_size).enumerate() {
		let mut chunk_futures = FuturesUnordered::new();

		for (source_index, source) in chunk.iter().enumerate() {
			let force_regen = force_regen;
			let path = match source {
				GenerateImageSource::Book(book) => book.path.clone(),
				GenerateImageSource::Series(series) => series.path.clone(),
				GenerateImageSource::Library(library) => library.path.clone(),
			};

			let future = async move {
				tracing::trace!(?path, "(Chunk {chunk_index}, Item {source_index}) Starting placeholder generation");

				let result = match source {
					GenerateImageSource::Book(book) => {
						generate_book_placeholder(book, ctx, force_regen).await
					},
					GenerateImageSource::Series(series) => {
						generate_series_placeholder(series, ctx, force_regen).await
					},
					GenerateImageSource::Library(library) => {
						generate_library_placeholder(library, ctx, force_regen).await
					},
				};

				result.map_err(|e| (e, path))
			};

			chunk_futures.push(future);
		}

		while let Some(gen_output) = chunk_futures.next().await {
			match gen_output {
				Ok(_) => {
					output.generated_metadata += 1;
				},
				Err((error, path)) => match error {
					ThumbnailGenerateError::NothingToGenerate => {
						output.skipped_entities += 1;
					},
					_ => {
						logs.push(
							JobExecuteLog::error(format!(
								"Failed to generate placeholder metadata: {:?}",
								error.to_string()
							))
							.with_ctx(format!("Media path: {path}")),
						);
						output.skipped_entities += 1;
					},
				},
			}

			output.visited_entities += 1;
			processed_count += 1;
			reporter(processed_count);
		}

		// Force garbage collection between batches
		if processed_count < total_sources {
			tokio::task::yield_now().await;
		}
	}

	JobTaskOutput {
		output,
		logs,
		subtasks: vec![],
	}
}

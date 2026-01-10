use std::{
	collections::{HashMap, VecDeque},
	path::{Path, PathBuf},
	sync::{
		atomic::{AtomicUsize, Ordering},
		Arc,
	},
	time::Instant,
};

use chrono::{DateTime, Utc};
use futures::{stream::FuturesUnordered, StreamExt};
use models::{
	entity::{library_config, media, media_metadata, series},
	shared::enums::FileStatus,
};
use sea_orm::{
	prelude::*,
	sea_query::{OnConflict, Query},
	Condition, DatabaseConnection, IntoActiveModel, Iterable, Set, TransactionTrait,
};
use tokio::{sync::oneshot, task::spawn_blocking};
use walkdir::DirEntry;

use crate::{
	config::StumpConfig,
	error::{CoreError, CoreResult},
	event::CreatedMedia,
	filesystem::{
		media::{BuiltMedia, MediaBuilder},
		scanner::options::{BookVisitOperation, CustomVisitResult},
		series::{BuiltSeries, SeriesBuilder},
	},
	job::{error::JobError, JobExecuteLog, JobProgress, WorkerCtx, WorkerSendExt},
	CoreEvent,
};

use super::options::BookVisitResult;

pub(crate) fn file_updated_since_scan(
	entry: &DirEntry,
	last_modified_at: String,
) -> CoreResult<bool> {
	if let Ok(Ok(system_time)) = entry.metadata().map(|m| m.modified()) {
		let media_modified_at =
			last_modified_at.parse::<DateTime<Utc>>().map_err(|e| {
				tracing::error!(
					path = ?entry.path(),
					error = ?e,
					"Error occurred trying to read modified date for media",
				);

				CoreError::Unknown(e.to_string())
			})?;
		let system_time_converted: DateTime<Utc> = system_time.into();
		tracing::trace!(?system_time_converted, ?media_modified_at,);

		if system_time_converted > media_modified_at {
			return Ok(true);
		}

		Ok(false)
	} else {
		tracing::error!(
			path = ?entry.path(),
			"Error occurred trying to read modified date for media",
		);

		Ok(true)
	}
}

pub(crate) async fn create_media(
	db: &DatabaseConnection,
	BuiltMedia { media, metadata }: BuiltMedia,
) -> CoreResult<media::Model> {
	let txn = db.begin().await?;

	let created_media = media.insert(&txn).await?;

	if let Some(meta) = metadata {
		meta.insert(&txn).await?;
	}

	txn.commit().await?;

	Ok(created_media)
}

pub(crate) async fn update_media(
	db: &DatabaseConnection,
	BuiltMedia { media, metadata }: BuiltMedia,
) -> CoreResult<media::Model> {
	let txn = db.begin().await?;

	let updated_media = media.update(&txn).await?;

	if let Some(meta) = metadata {
		let on_conflict = OnConflict::new()
			.update_columns(media_metadata::Column::iter())
			.to_owned();
		media_metadata::Entity::insert(meta.into_active_model())
			.on_conflict(on_conflict)
			.exec(&txn)
			.await?;
	}

	txn.commit().await?;

	Ok(updated_media)
}

pub(crate) async fn handle_book_visit_operation(
	db: &DatabaseConnection,
	result: BookVisitResult,
) -> CoreResult<()> {
	match result {
		BookVisitResult::Custom(custom) => {
			if let Some(meta) = custom.meta {
				let active_model = media_metadata::ActiveModel {
					media_id: Set(Some(custom.id.clone())),
					..meta.into_active_model()
				};
				let updated_meta = active_model.update(db).await?;

				tracing::trace!(?updated_meta, "Metadata upserted");
			}

			if let Some(hashes) = custom.hashes {
				let affected_rows = media::Entity::update_many()
					.filter(media::Column::Id.eq(custom.id.clone()))
					.col_expr(media::Column::Hash, Expr::value(hashes.hash))
					.col_expr(
						media::Column::KoreaderHash,
						Expr::value(hashes.koreader_hash),
					)
					.exec(db)
					.await?
					.rows_affected;
				tracing::trace!(affected_rows, "Book updated with new hashes");
			}
		},
		BookVisitResult::Built(book) => {
			let updated_media = update_media(db, *book).await?;
			tracing::trace!(?updated_media, "Book updated");
		},
	}

	Ok(())
}

#[derive(Default)]
pub(crate) struct MissingSeriesOutput {
	pub updated_series: u64,
	pub updated_media: u64,
	pub logs: Vec<JobExecuteLog>,
}

pub(crate) async fn handle_missing_series(
	client: &DatabaseConnection,
	path: &str,
) -> Result<MissingSeriesOutput, JobError> {
	let mut output = MissingSeriesOutput::default();

	let affected_rows = series::Entity::update_many()
		.filter(series::Column::Path.eq(path.to_string()))
		.col_expr(
			series::Column::Status,
			Expr::value(FileStatus::Missing.to_string()),
		)
		.exec(client)
		.await
		.map_or_else(
			|error| {
				tracing::error!(error = ?error, "Failed to update missing series");
				output.logs.push(JobExecuteLog::error(format!(
					"Failed to update missing series: {:?}",
					error.to_string()
				)));
				0
			},
			|res| {
				output.updated_series += res.rows_affected;
				res.rows_affected
			},
		);

	if affected_rows > 1 {
		tracing::warn!(
			affected_rows,
			"Updated more than one series with path: {}",
			path
		);
	}

	let _affected_media = media::Entity::update_many()
		.filter(
			Condition::any().add(
				media::Column::SeriesId.in_subquery(
					Query::select()
						.column(series::Column::Id)
						.from(series::Entity)
						.and_where(series::Column::Path.eq(path.to_string()))
						.to_owned(),
				),
			),
		)
		.col_expr(
			media::Column::Status,
			Expr::value(FileStatus::Missing.to_string()),
		)
		.exec(client)
		.await
		.map_or_else(
			|error| {
				tracing::error!(error = ?error, "Failed to update missing media");
				output.logs.push(JobExecuteLog::error(format!(
					"Failed to update missing media: {:?}",
					error.to_string()
				)));
				0
			},
			|res| {
				output.updated_media += res.rows_affected;
				res.rows_affected
			},
		);

	Ok(output)
}

#[derive(Default)]
pub(crate) struct MediaOperationOutput {
	pub created_media: u64,
	pub updated_media: u64,
	pub logs: Vec<JobExecuteLog>,
}

/// Handles missing media by updating the database with the latest information. A media is
/// considered missing if it was previously marked as ready and is no longer found on disk.
pub(crate) async fn handle_missing_media(
	ctx: &WorkerCtx,
	series_id: &str,
	paths: Vec<PathBuf>,
) -> MediaOperationOutput {
	let mut output = MediaOperationOutput::default();

	if paths.is_empty() {
		tracing::debug!("No missing media to handle");
		return output;
	}

	let _affected_rows = media::Entity::update_many()
		.filter(media::Column::SeriesId.eq(series_id.to_string()))
		.filter(
			media::Column::Path.is_in(
				paths
					.iter()
					.map(|p| p.to_string_lossy().to_string())
					.collect::<Vec<String>>(),
			),
		)
		.col_expr(
			media::Column::Status,
			Expr::value(FileStatus::Missing.to_string()),
		)
		.exec(ctx.conn.as_ref())
		.await
		.map_or_else(
			|error| {
				tracing::error!(error = ?error, "Failed to update missing media");
				output.logs.push(JobExecuteLog::error(format!(
					"Failed to update missing media: {:?}",
					error.to_string()
				)));
				0
			},
			|res| {
				output.updated_media += res.rows_affected;
				res.rows_affected
			},
		);

	output
}

/// Handles restored media by updating the database with the latest information. A
/// media is considered restored if it was previously marked as missing and has been
/// found on disk.
pub(crate) async fn handle_restored_media(
	ctx: &WorkerCtx,
	series_id: &str,
	ids: Vec<String>,
) -> MediaOperationOutput {
	let mut output = MediaOperationOutput::default();

	if ids.is_empty() {
		tracing::debug!("No restored media to handle");
		return output;
	}

	let _affected_series = media::Entity::update_many()
		.filter(media::Column::SeriesId.eq(series_id.to_string()))
		.filter(
			media::Column::Id
				.is_in(ids.iter().map(|id| id.to_string()).collect::<Vec<String>>()),
		)
		.col_expr(
			media::Column::Status,
			Expr::value(FileStatus::Ready.to_string()),
		)
		.exec(ctx.conn.as_ref())
		.await
		.map_or_else(
			|error| {
				tracing::error!(error = ?error, "Failed to update restored media");
				output.logs.push(JobExecuteLog::error(format!(
					"Failed to update restored media: {:?}",
					error.to_string()
				)));
				0
			},
			|res| {
				output.updated_media += res.rows_affected;
				res.rows_affected
			},
		);

	output
}

/// Builds a series from the given path
///
/// # Arguments
/// * `for_library` - The library ID to associate the series with
/// * `path` - The path to the series on disk
async fn build_series(for_library: &str, path: &Path) -> CoreResult<BuiltSeries> {
	let (tx, rx) = oneshot::channel();

	// Spawn a blocking task to handle the IO-intensive operations:
	let handle = spawn_blocking({
		let path = path.to_path_buf();
		let for_library = for_library.to_string();

		move || {
			let send_result = tx.send(SeriesBuilder::new(&path, &for_library).build());
			tracing::trace!(
				is_err = send_result.is_err(),
				"Sending build result to channel"
			);
		}
	});

	let build_result = if let Ok(recv) = rx.await {
		recv?
	} else {
		handle
			.await
			.map_err(|e| CoreError::Unknown(e.to_string()))?;
		return Err(CoreError::Unknown(
			"Failed to receive build result".to_string(),
		));
	};

	Ok(build_result)
}

/// Safely builds a series from a list of paths concurrently, with a maximum concurrency limit
/// as defined by the core configuration.
///
/// # Arguments
/// * `for_library` - The library ID to associate the series with
/// * `paths` - A list of paths to build series from
/// * `core_config` - The core configuration
/// * `reporter` - A function to report progress to the UI
pub(crate) async fn safely_build_series(
	for_library: &str,
	paths: Vec<PathBuf>,
	core_config: &StumpConfig,
	reporter: impl Fn(usize),
) -> (Vec<BuiltSeries>, Vec<JobExecuteLog>) {
	let mut logs = vec![];
	let mut created_series = Vec::with_capacity(paths.len());

	let batch_size = core_config.max_scanner_concurrency;
	let total_series = paths.len();
	tracing::debug!(total_series, batch_size, "Processing series");

	// An atomic usize to keep track of the current position in the stream
	// to report progress to the UI
	let atomic_cursor = Arc::new(AtomicUsize::new(1));

	let start = Instant::now();

	for (chunk_index, chunk) in paths.chunks(batch_size).enumerate() {
		let mut chunk_futures = FuturesUnordered::new();

		tracing::trace!(
			chunk_index,
			chunk_size = chunk.len(),
			"Processing series batch"
		);

		for (series_index, path) in chunk.iter().enumerate() {
			let path = path.clone();
			let for_library = for_library.to_string();

			let future = async move {
				tracing::trace!(?path, "(Chunk {chunk_index}, Series {series_index}) Starting thumbnail generation");
				build_series(&for_library, &path)
					.await
					.map_err(|e| (e, path.clone()))
			};

			chunk_futures.push(future);
		}

		while let Some(result) = chunk_futures.next().await {
			match result {
				Ok(series) => {
					created_series.push(series);
				},
				Err((error, path)) => {
					logs.push(
						JobExecuteLog::error(format!(
							"Failed to build series: {:?}",
							error.to_string()
						))
						.with_ctx(format!("Path: {path:?}")),
					);
				},
			}

			// We visit every file, regardless of success or failure
			reporter(atomic_cursor.fetch_add(1, Ordering::SeqCst));
		}
	}

	let success_count = created_series.len();
	let error_count = logs.len();
	tracing::debug!(elapsed = ?start.elapsed(), success_count, error_count, "Finished batch of series");

	(created_series, logs)
}

pub(crate) async fn safely_insert_series(
	series: Vec<BuiltSeries>,
	conn: &DatabaseConnection,
) -> Result<Vec<series::Model>, JobError> {
	let mut output = Vec::with_capacity(series.len());

	let txn = conn.begin().await?;

	for BuiltSeries { series, metadata } in series {
		let created_series = series.insert(&txn).await?;

		// I opted to not kill the transaction if metadata insertion fails, I figure this
		// is a best-effort operation and we can always try again later after fixing a bad
		// metadata entry vs killing the entire series creation process over a single bad entry
		if let Some(mut meta) = metadata {
			meta.series_id = Set(created_series.id.clone());
			if let Err(error) = meta.insert(&txn).await {
				tracing::error!(?error, "Failed to insert series metadata");
			}
		}

		output.push(created_series);
	}

	txn.commit().await?;
	tracing::debug!(series_count = output.len(), "Inserted series into database");
	Ok(output)
}

// TODO(granular-scans): intake ScanOptions
pub(crate) struct MediaBuildOperation {
	pub series_id: String,
	pub library_config: library_config::Model,
	pub max_concurrency: usize,
}

/// Builds a media from the given path
///
/// # Arguments
/// * `path` - The path to the media on disk
/// * `series_id` - The series ID to associate the media with
/// * `existing_book` - An optional existing media to rebuild
/// * `library_config` - The library configuration
/// * `config` - The core configuration
async fn build_book(
	path: &Path,
	series_id: &str,
	existing_book: Option<media::ModelWithMetadata>,
	library_config: library_config::Model,
	config: &StumpConfig,
) -> CoreResult<BuiltMedia> {
	let (tx, rx) = oneshot::channel();

	// Spawn a blocking task to handle the IO-intensive operations:
	let handle = spawn_blocking({
		let path = path.to_path_buf();
		let series_id = series_id.to_string();
		let library_config = library_config.clone();
		let config = config.clone();

		move || {
			let builder = MediaBuilder::new(&path, &series_id, library_config, &config);
			let send_result = tx.send(if let Some(existing_book) = existing_book {
				builder.rebuild(&existing_book)
			} else {
				builder.build()
			});
			tracing::trace!(
				is_err = send_result.is_err(),
				"Sending build result to channel"
			);
		}
	});

	let build_result = if let Ok(recv) = rx.await {
		recv?
	} else {
		handle
			.await
			.map_err(|e| CoreError::Unknown(e.to_string()))?;
		return Err(CoreError::Unknown(
			"Failed to receive build result".to_string(),
		));
	};

	Ok(build_result)
}

struct BookVisitCtx {
	operation: BookVisitOperation,
	path: PathBuf,
	series_id: String,
	existing_book: Option<media::ModelWithMetadata>,
}

async fn handle_book(
	BookVisitCtx {
		path,
		operation,
		series_id,
		existing_book,
	}: BookVisitCtx,
	library_config: library_config::Model,
	config: &StumpConfig,
) -> CoreResult<BookVisitResult> {
	let (tx, rx) = oneshot::channel();

	// Spawn a blocking task to handle the IO-intensive operations:
	let handle = spawn_blocking({
		let path = path.to_path_buf();
		let series_id = series_id.to_string();
		let library_config = library_config.clone();
		let config = config.clone();

		move || {
			let builder = MediaBuilder::new(&path, &series_id, library_config, &config);
			let send_result = tx.send(match (operation, existing_book) {
				(BookVisitOperation::Rebuild, Some(book)) => builder
					.rebuild(&book)
					.map(|b| BookVisitResult::Built(Box::new(b))),
				(BookVisitOperation::Custom(custom), Some(book)) => {
					builder.custom_visit(custom).map(|result| {
						BookVisitResult::Custom(CustomVisitResult {
							id: book.media.id,
							..result
						})
					})
				},
				// If the existing book is None, it means the book doesn't yet exist so we
				// always just do a full build. However, we really shouldn't be in this state
				// since media creation is handled in a separate flow than visit
				(_, None) => builder.build().map(|b| BookVisitResult::Built(Box::new(b))),
			});
			tracing::trace!(
				is_err = send_result.is_err(),
				"Sending build result to channel"
			);
		}
	});

	let build_result = if let Ok(recv) = rx.await {
		recv?
	} else {
		handle
			.await
			.map_err(|e| CoreError::Unknown(e.to_string()))?;
		return Err(CoreError::Unknown(
			"Failed to receive build result".to_string(),
		));
	};

	Ok(build_result)
}

/// Safely builds media from a list of paths concurrently, with a maximum concurrency limit
/// as defined by the core configuration. The media is then inserted into the database.
///
/// # Arguments
/// * `MediaBuildOperation` - The operation configuration for building media
/// * `worker_ctx` - The worker context
/// * `paths` - A list of paths to build media from
pub(crate) async fn safely_build_and_insert_media(
	MediaBuildOperation {
		series_id,
		library_config,
		max_concurrency,
	}: MediaBuildOperation,
	worker_ctx: &WorkerCtx,
	paths: Vec<PathBuf>,
) -> Result<MediaOperationOutput, JobError> {
	if paths.is_empty() {
		tracing::trace!("No media to create?");
		return Ok(MediaOperationOutput::default());
	}

	let mut output = MediaOperationOutput::default();

	let chunk_size = max_concurrency;
	let book_count = paths.len();
	tracing::debug!(book_count, chunk_size, "Processing media");

	// An atomic usize to keep track of the current position in the stream
	// to report progress to the UI
	let atomic_cursor = Arc::new(AtomicUsize::new(1));

	let start = Instant::now();
	let mut books = VecDeque::with_capacity(book_count);

	worker_ctx.report_progress(JobProgress::msg("Building media from disk"));

	for (chunk_index, chunk) in paths.chunks(chunk_size).enumerate() {
		let mut chunk_futures = FuturesUnordered::new();

		tracing::trace!(
			chunk_index,
			chunk_size = chunk.len(),
			"Processing media batch"
		);

		for (book_index, path) in chunk.iter().enumerate() {
			let series_id = series_id.clone();
			let library_config = library_config.clone();
			let path = path.clone();

			let future = async move {
				tracing::trace!(
					?path,
					"(Chunk {chunk_index}, Book {book_index}) Starting media build"
				);
				build_book(&path, &series_id, None, library_config, &worker_ctx.config)
					.await
					.map_err(|e| (e, path.clone()))
			};

			chunk_futures.push(future);
		}

		while let Some(result) = chunk_futures.next().await {
			match result {
				Ok(book) => {
					books.push_back(book);
				},
				Err((error, path)) => {
					tracing::error!(error = ?error, ?path, "Failed to build book");
					output.logs.push(
						JobExecuteLog::error(format!(
							"Failed to build book: {:?}",
							error.to_string()
						))
						.with_ctx(format!("Path: {path:?}")),
					);
				},
			}
			worker_ctx.report_progress(JobProgress::subtask_position(
				atomic_cursor.fetch_add(1, Ordering::SeqCst) as i32,
				book_count as i32,
			));
		}
	}

	let success_count = books.len();
	let error_count = output.logs.len();
	tracing::debug!(
		elapsed = ?start.elapsed(),
		success_count, error_count,
		"Built books from disk"
	);

	let success_count = books.len();
	let error_count = output.logs.len();
	tracing::debug!(
		elapsed = ?start.elapsed(),
		success_count, error_count,
		"Built books from disk"
	);

	worker_ctx.report_progress(JobProgress::msg("Inserting books into database"));
	let task_count = books.len() as i32;
	let start = Instant::now();

	let atomic_cursor = Arc::new(AtomicUsize::new(1));

	while let Some(book) = books.pop_front() {
		let Some(path) = book.path() else {
			tracing::warn!(?book, "Book has no path?");
			continue;
		};
		match create_media(&worker_ctx.conn, book).await {
			Ok(created_media) => {
				output.created_media += 1;
				worker_ctx.send_batch(vec![
					JobProgress::subtask_position(
						atomic_cursor.fetch_add(1, Ordering::SeqCst) as i32,
						task_count,
					)
					.into_worker_send(),
					CoreEvent::CreatedMedia(CreatedMedia {
						id: created_media.id,
						series_id: series_id.clone(),
					})
					.into_worker_send(),
				]);
			},
			Err(e) => {
				worker_ctx.report_progress(JobProgress::subtask_position(
					atomic_cursor.fetch_add(1, Ordering::SeqCst) as i32,
					task_count,
				));
				tracing::error!(error = ?e, ?path, "Failed to create media");
				output.logs.push(
					JobExecuteLog::error(format!(
						"Failed to create media: {:?}",
						e.to_string()
					))
					.with_ctx(path),
				);
			},
		}
	}

	let success_count = output.created_media;
	let error_count = output.logs.len() - error_count; // Subtract the errors from the previous step
	tracing::debug!(success_count, error_count, elapsed = ?start.elapsed(), "Inserted books into database");

	Ok(output)
}

/// Visits the media on disk and updates the database with the latest information. This is done
/// concurrently with a maximum concurrency limit as defined by the core configuration.
///
/// # Arguments
/// * `MediaBuildOperation` - The operation configuration for visiting media
/// * `worker_ctx` - The worker context
/// * `params` - A list of paths and operations to visit
pub(crate) async fn visit_and_update_media(
	MediaBuildOperation {
		series_id,
		library_config,
		max_concurrency,
	}: MediaBuildOperation,
	worker_ctx: &WorkerCtx,
	params: Vec<(PathBuf, BookVisitOperation)>,
) -> Result<MediaOperationOutput, JobError> {
	let mut output = MediaOperationOutput::default();

	if params.is_empty() {
		tracing::trace!("No media to visit?");
		return Ok(output);
	}

	let conn = worker_ctx.conn.as_ref();
	let paths_to_operation = params
		.iter()
		.map(|(p, o)| (p.to_string_lossy().to_string(), *o))
		.collect::<HashMap<_, _>>();
	let paths = paths_to_operation.keys().cloned().collect::<Vec<String>>();
	let paths_len = paths.len();

	let media = media::ModelWithMetadata::find()
		.filter(
			media::Column::Path
				.is_in(paths.iter().map(|p| p.to_string()).collect::<Vec<String>>()),
		)
		.filter(media::Column::SeriesId.eq(series_id.to_string()))
		.into_model::<media::ModelWithMetadata>()
		.all(conn)
		.await?;

	if media.len() != paths_len {
		output.logs.push(JobExecuteLog::warn(
			"Not all media paths were found in the database",
		));
	}

	let chunk_size = max_concurrency;
	let book_count = media.len();
	tracing::debug!(book_count, chunk_size, "Processing media visit");

	// An atomic usize to keep track of the current position in the stream
	// to report progress to the UI
	let atomic_cursor = Arc::new(AtomicUsize::new(1));

	let start = Instant::now();
	let mut build_results = VecDeque::with_capacity(book_count);

	worker_ctx.report_progress(JobProgress::msg("Visiting media on disk"));

	for (chunk_index, chunk) in media.chunks(chunk_size).enumerate() {
		let mut chunk_futures = FuturesUnordered::new();

		tracing::trace!(
			chunk_index,
			chunk_size = chunk.len(),
			"Processing media visit batch"
		);

		for (book_index, book) in chunk.iter().cloned().enumerate() {
			let path = book.media.path.clone();
			let Some(operation) = paths_to_operation.get(&path) else {
				tracing::warn!(?path, "No operation found for media?");
				continue;
			};
			let ctx = BookVisitCtx {
				operation: *operation,
				existing_book: Some(book),
				series_id: series_id.clone(),
				path: PathBuf::from(path.as_str()),
			};
			let library_config = library_config.clone();

			let future = async move {
				tracing::trace!(
					?path,
					"(Chunk {chunk_index}, Book {book_index}) Starting media visit"
				);
				handle_book(ctx, library_config, &worker_ctx.config)
					.await
					.map_err(|e| (e, path.clone()))
			};

			chunk_futures.push(future);
		}

		while let Some(future_result) = chunk_futures.next().await {
			match future_result {
				Ok(result) => {
					build_results.push_back(result);
				},
				Err((error, path)) => {
					output.logs.push(
						JobExecuteLog::error(format!(
							"Failed to handle book: {:?}",
							error.to_string()
						))
						.with_ctx(format!("Path: {path:?}")),
					);
				},
			}
			worker_ctx.report_progress(JobProgress::subtask_position(
				atomic_cursor.fetch_add(1, Ordering::SeqCst) as i32,
				book_count as i32,
			));
		}
	}

	let success_count = build_results.len();
	let error_count = output.logs.len();
	tracing::debug!(elapsed = ?start.elapsed(), success_count, error_count, "Handled books from disk");

	worker_ctx.report_progress(JobProgress::msg("Updating media in database"));
	let task_count = build_results.len() as i32;
	let start = Instant::now();

	let atomic_cursor = Arc::new(AtomicUsize::new(1));

	while let Some(result) = build_results.pop_front() {
		let error_ctx = result.error_ctx();
		match handle_book_visit_operation(&worker_ctx.conn, result).await {
			Ok(_) => {
				output.updated_media += 1;
			},
			Err(e) => {
				tracing::error!(error = ?e, ?error_ctx, "Failed to update media");
				output.logs.push(
					JobExecuteLog::error(format!(
						"Failed to update media: {:?}",
						e.to_string()
					))
					.with_ctx(error_ctx),
				);
			},
		}

		worker_ctx.report_progress(JobProgress::subtask_position(
			atomic_cursor.fetch_add(1, Ordering::SeqCst) as i32,
			task_count,
		));
	}

	let success_count = output.updated_media;
	let error_count = output.logs.len() - error_count; // Subtract the errors from the previous step
	tracing::debug!(elapsed = ?start.elapsed(), success_count, error_count, "Updated books in database");

	Ok(output)
}

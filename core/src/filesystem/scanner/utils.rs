use std::{
	collections::VecDeque,
	path::{Path, PathBuf},
	pin::pin,
	sync::{
		atomic::{AtomicUsize, Ordering},
		Arc,
	},
	time::Instant,
};

use futures::{stream::FuturesUnordered, StreamExt};
use prisma_client_rust::{
	chrono::{DateTime, Utc},
	QueryError,
};
use tokio::{
	sync::{oneshot, Semaphore},
	task::spawn_blocking,
};
use walkdir::DirEntry;

use crate::{
	config::StumpConfig,
	db::{
		entity::{LibraryConfig, Media, Series},
		FileStatus,
	},
	error::{CoreError, CoreResult},
	filesystem::{MediaBuilder, SeriesBuilder},
	job::{error::JobError, JobExecuteLog, JobProgress, WorkerCtx, WorkerSendExt},
	prisma::{media, media_metadata, series, PrismaClient},
	utils::chain_optional_iter,
	CoreEvent,
};

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

// TODO(granular-scans): Use this to determine if Full is needed?
// pub(crate) fn book_updated_since_scan(book: &Media) -> bool {
// 	let modified_at_result = book
// 		.modified_at
// 		.clone()
// 		.map(|m| m.parse::<DateTime<Utc>>())
// 		.transpose();

// 	let modified_at = match modified_at_result {
// 		Ok(Some(modified_at)) => modified_at,
// 		Ok(None) => {
// 			tracing::trace!("Modified_at is None");
// 			return false;
// 		},
// 		Err(err) => {
// 			tracing::error!(error = ?err, "Failed to parse modified_at");
// 			return false;
// 		},
// 	};

// 	let underlying_file = PathBuf::from(&book.path);
// 	if let Ok(Ok(system_time)) = underlying_file.metadata().map(|m| m.modified()) {
// 		let system_time_converted: DateTime<Utc> = system_time.into();
// 		tracing::trace!(?system_time_converted, ?modified_at, "Comparing dates");

// 		if system_time_converted > modified_at {
// 			return true;
// 		}
// 	}

// 	false
// }

pub(crate) async fn create_media(
	db: &PrismaClient,
	generated: Media,
) -> CoreResult<Media> {
	let result: Result<Media, QueryError> = db
		._transaction()
		.run(|client| async move {
			let created_metadata = if let Some(metadata) = generated.metadata {
				let params = metadata.into_prisma();
				let created_metadata =
					client.media_metadata().create(params).exec().await?;
				tracing::trace!(?created_metadata, "Metadata inserted");
				Some(created_metadata)
			} else {
				tracing::trace!("No metadata to insert");
				None
			};

			let created_media = client
				.media()
				.create(
					generated.name,
					generated.size,
					generated.extension,
					generated.pages,
					generated.path,
					vec![
						media::hash::set(generated.hash),
						media::koreader_hash::set(generated.koreader_hash),
						media::series::connect(series::id::equals(generated.series_id)),
					],
				)
				.exec()
				.await?;
			tracing::trace!(?created_media, "Media inserted");

			if let Some(media_metadata) = created_metadata {
				let updated_media = client
					.media()
					.update(
						media::id::equals(created_media.id),
						vec![media::metadata::connect(media_metadata::id::equals(
							media_metadata.id,
						))],
					)
					.with(media::metadata::fetch())
					.exec()
					.await?;
				tracing::trace!("Media updated with metadata");
				Ok(Media::from(updated_media))
			} else {
				Ok(Media::from(created_media))
			}
		})
		.await;

	Ok(result?)
}

pub(crate) async fn update_media(db: &PrismaClient, media: Media) -> CoreResult<Media> {
	let result: Result<Media, QueryError> = db
		._transaction()
		.run(|client| async move {
			let metadata_id = match media.metadata {
				Some(metadata) => {
					let params = metadata
						.into_prisma()
						.into_iter()
						.chain(vec![media_metadata::media_id::set(Some(
							media.id.clone(),
						))])
						.collect::<Vec<_>>();
					let updated_metadata = client
						.media_metadata()
						.upsert(
							media_metadata::media_id::equals(media.id.clone()),
							params.clone(),
							params,
						)
						.exec()
						.await?;
					tracing::trace!(?updated_metadata, "Metadata upserted");
					Some(updated_metadata.id)
				},
				_ => None,
			};

			let updated_media = client
				.media()
				.update(
					media::id::equals(media.id.clone()),
					chain_optional_iter(
						[
							media::name::set(media.name.clone()),
							media::size::set(media.size),
							media::extension::set(media.extension.clone()),
							media::pages::set(media.pages),
							media::hash::set(media.hash.clone()),
							media::koreader_hash::set(media.koreader_hash.clone()),
							media::path::set(media.path.clone()),
							media::status::set(media.status.to_string()),
						],
						[metadata_id.map(|id| {
							media::metadata::connect(media_metadata::id::equals(id))
						})],
					),
				)
				.with(media::metadata::fetch())
				.exec()
				.await?;
			tracing::trace!(?updated_media, "Media updated");

			Ok(Media::from(updated_media))
		})
		.await;

	Ok(result?)
}

#[derive(Default)]
pub(crate) struct MissingSeriesOutput {
	pub updated_series: u64,
	pub updated_media: u64,
	pub logs: Vec<JobExecuteLog>,
}

pub(crate) async fn handle_missing_series(
	client: &PrismaClient,
	path: &str,
) -> Result<MissingSeriesOutput, JobError> {
	let mut output = MissingSeriesOutput::default();

	let affected_rows = client
		.series()
		.update_many(
			vec![series::path::equals(path.to_string())],
			vec![series::status::set(FileStatus::Missing.to_string())],
		)
		.exec()
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
			|count| {
				output.updated_series += count as u64;
				count
			},
		);

	if affected_rows > 1 {
		tracing::warn!(
			affected_rows,
			"Updated more than one series with path: {}",
			path
		);
	}

	let _affected_media = client
		.media()
		.update_many(
			vec![media::series::is(vec![series::path::equals(
				path.to_string(),
			)])],
			vec![media::status::set(FileStatus::Missing.to_string())],
		)
		.exec()
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
			|count| {
				output.updated_media += count as u64;
				count
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

	let _affected_rows = ctx
		.db
		.media()
		.update_many(
			vec![
				media::series::is(vec![series::id::equals(series_id.to_string())]),
				media::path::in_vec(
					paths
						.iter()
						.map(|e| e.to_string_lossy().to_string())
						.collect::<Vec<String>>(),
				),
			],
			vec![media::status::set(FileStatus::Missing.to_string())],
		)
		.exec()
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
			|count| {
				output.updated_media += count as u64;
				count
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

	let _affected_rows = ctx
		.db
		.media()
		.update_many(
			vec![
				media::series::is(vec![series::id::equals(series_id.to_string())]),
				media::id::in_vec(ids),
			],
			vec![media::status::set(FileStatus::Ready.to_string())],
		)
		.exec()
		.await
		.map_or_else(
			|error| {
				tracing::error!(error = ?error, "Failed to restore recovered media");
				output.logs.push(JobExecuteLog::error(format!(
					"Failed to update recovered media: {:?}",
					error.to_string()
				)));
				0
			},
			|count| {
				output.updated_media += count as u64;
				count
			},
		);

	output
}

/// Builds a series from the given path
///
/// # Arguments
/// * `for_library` - The library ID to associate the series with
/// * `path` - The path to the series on disk
async fn build_series(for_library: &str, path: &Path) -> CoreResult<Series> {
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
) -> (Vec<Series>, Vec<JobExecuteLog>) {
	let mut logs = vec![];
	let mut created_series = Vec::with_capacity(paths.len());

	let max_concurrency = core_config.max_scanner_concurrency;
	let semaphore = Arc::new(Semaphore::new(max_concurrency));
	tracing::debug!(max_concurrency, "Semaphore created for series creation");

	let start = Instant::now();

	let futures = paths
		.iter()
		.map(|path| {
			let semaphore = semaphore.clone();
			let path = path.clone();
			let library_id = for_library.to_string();

			async move {
				if semaphore.available_permits() == 0 {
					tracing::debug!(?path, "No permits available, waiting for one");
				}
				let _permit = semaphore
					.acquire()
					.await
					.map_err(|e| (CoreError::Unknown(e.to_string()), path.clone()))?;
				tracing::trace!(?path, "Acquired permit for series creation");
				build_series(&library_id, &path)
					.await
					.map_err(|e| (e, path.clone()))
			}
		})
		.collect::<FuturesUnordered<_>>();

	// An atomic usize to keep track of the current position in the stream
	// to report progress to the UI
	let atomic_cursor = Arc::new(AtomicUsize::new(1));

	let mut futures = pin!(futures);

	while let Some(result) = futures.next().await {
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

	let success_count = created_series.len();
	let error_count = logs.len();
	tracing::debug!(elapsed = ?start.elapsed(), success_count, error_count, "Finished batch of series");

	(created_series, logs)
}

// TODO(granular-scans): intake ScanOptions
pub(crate) struct MediaBuildOperation {
	pub series_id: String,
	pub library_config: LibraryConfig,
	pub max_concurrency: usize,
}

// TODO(granular-scans): build_book_partial? build_partial_book?
/*
	A suboptimal approach could be:
	```rust
	struct PartialBook {
		book: Media,
		fields_to_update: Option<Vec<String>>, // None means full update, 0 len is err(?)
	}
	```
	This would be the easiest, but would involve some wasted work. Maybe an emum?
	```rust
	enum BookUpdate {
		Full(Media),
		// TODO(granular-scans): Legacy metadata doesn't strictly set the ID to the associated
		// media's ID. This is a problem in that the book's id would need to be provided.
		Metadata(MediaMetadata),
		Hashes {
			id: String,
			hash: Option<String>,
			koreader_hash: Option<String>,
		},
	}
	```
*/

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
	existing_book: Option<Media>,
	library_config: LibraryConfig,
	config: &StumpConfig,
) -> CoreResult<Media> {
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
	let mut logs = vec![];

	let semaphore = Arc::new(Semaphore::new(max_concurrency));
	tracing::debug!(max_concurrency, "Semaphore created for media creation");

	worker_ctx.report_progress(JobProgress::msg("Building media from disk"));
	let task_count = paths.len() as i32;
	let start = Instant::now();

	let futures = paths
		.iter()
		.map(|path| {
			let semaphore = semaphore.clone();
			let series_id = series_id.clone();
			let library_config = library_config.clone();
			let path = path.clone();

			async move {
				if semaphore.available_permits() == 0 {
					tracing::debug!(?path, "No permits available, waiting for one");
				}
				let _permit = semaphore
					.acquire()
					.await
					.map_err(|e| (CoreError::Unknown(e.to_string()), path.clone()))?;
				tracing::trace!(?path, "Acquired permit for media creation");
				build_book(&path, &series_id, None, library_config, &worker_ctx.config)
					.await
					.map_err(|e| (e, path.clone()))
			}
		})
		.collect::<FuturesUnordered<_>>();

	// An atomic usize to keep track of the current position in the stream
	// to report progress to the UI
	let atomic_cursor = Arc::new(AtomicUsize::new(1));

	let mut futures = pin!(futures);
	let mut books = VecDeque::with_capacity(paths.len());

	while let Some(result) = futures.next().await {
		match result {
			Ok(book) => {
				books.push_back(book);
			},
			Err((error, path)) => {
				logs.push(
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
			task_count,
		));
	}

	let success_count = books.len();
	let error_count = logs.len();
	tracing::debug!(
		elapsed = ?start.elapsed(),
		success_count, error_count,
		"Built books from disk"
	);

	worker_ctx.report_progress(JobProgress::msg("Inserting books into database"));
	let task_count = books.len() as i32;
	let start = Instant::now();

	let atomic_cursor = Arc::new(AtomicUsize::new(1));

	// TODO: consider small batches of _batch instead?
	while let Some(book) = books.pop_front() {
		let path = book.path.clone();
		match create_media(&worker_ctx.db, book).await {
			Ok(created_media) => {
				output.created_media += 1;
				worker_ctx.send_batch(vec![
					JobProgress::subtask_position(
						atomic_cursor.fetch_add(1, Ordering::SeqCst) as i32,
						task_count,
					)
					.into_worker_send(),
					CoreEvent::CreatedMedia {
						id: created_media.id,
						series_id: series_id.clone(),
					}
					.into_worker_send(),
				]);
			},
			Err(e) => {
				worker_ctx.report_progress(JobProgress::subtask_position(
					atomic_cursor.fetch_add(1, Ordering::SeqCst) as i32,
					task_count,
				));
				tracing::error!(error = ?e, ?path, "Failed to create media");
				logs.push(
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
	let error_count = logs.len() - error_count; // Subtract the errors from the previous step
	tracing::debug!(success_count, error_count, elapsed = ?start.elapsed(), "Inserted books into database");

	Ok(output)
}

/// Visits the media on disk and updates the database with the latest information. This is done
/// concurrently with a maximum concurrency limit as defined by the core configuration.
///
/// # Arguments
/// * `MediaBuildOperation` - The operation configuration for visiting media
/// * `worker_ctx` - The worker context
/// * `paths` - A list of paths to visit media from
pub(crate) async fn visit_and_update_media(
	MediaBuildOperation {
		series_id,
		library_config,
		max_concurrency,
	}: MediaBuildOperation,
	worker_ctx: &WorkerCtx,
	paths: Vec<PathBuf>,
) -> Result<MediaOperationOutput, JobError> {
	if paths.is_empty() {
		tracing::trace!("No media to visit?");
		return Ok(MediaOperationOutput::default());
	}

	let client = &worker_ctx.db;
	let mut output = MediaOperationOutput::default();

	let media = client
		.media()
		.find_many(vec![
			media::path::in_vec(
				paths
					.iter()
					.map(|e| e.to_string_lossy().to_string())
					.collect::<Vec<String>>(),
			),
			media::series_id::equals(Some(series_id.clone())),
		])
		.exec()
		.await?
		.into_iter()
		.map(Media::from)
		.collect::<Vec<Media>>();

	if media.len() != paths.len() {
		output.logs.push(JobExecuteLog::warn(
			"Not all media paths were found in the database",
		));
	}

	let semaphore = Arc::new(Semaphore::new(max_concurrency));
	tracing::debug!(max_concurrency, "Semaphore created for media visit");

	worker_ctx.report_progress(JobProgress::msg("Visiting media on disk"));
	let task_count = media.len() as i32;
	let start = Instant::now();

	// TODO(granular-scans): This needs to be aware of ScanOptions and build books more selectively.
	// For example, if regen_hashes is the only option set, and the book wasn't updated,
	// we don't need to rebuild it. We would just need to regen the hash. The only time
	// we would need a full rebuild is if the book was updated on disk?
	let futures = media
		.into_iter()
		.map(|existing_book| {
			let semaphore = semaphore.clone();
			let series_id = series_id.clone();
			let library_config = library_config.clone();
			let path = PathBuf::from(existing_book.path.as_str());

			async move {
				if semaphore.available_permits() == 0 {
					tracing::debug!(?path, "No permits available, waiting for one");
				}
				let _permit = semaphore
					.acquire()
					.await
					.map_err(|e| (CoreError::Unknown(e.to_string()), path.clone()))?;
				tracing::trace!(?path, "Acquired permit for media visit");
				build_book(
					path.as_path(),
					&series_id,
					Some(existing_book),
					library_config,
					&worker_ctx.config,
				)
				.await
				.map_err(|e| (e, path))
			}
		})
		.collect::<FuturesUnordered<_>>();

	// An atomic usize to keep track of the current position in the stream
	// to report progress to the UI
	let atomic_cursor = Arc::new(AtomicUsize::new(1));

	let mut futures = pin!(futures);
	let mut books = VecDeque::with_capacity(paths.len());

	while let Some(result) = futures.next().await {
		match result {
			Ok(book) => {
				books.push_back(book);
			},
			Err((error, path)) => {
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
			task_count,
		));
	}

	let success_count = books.len();
	let error_count = output.logs.len();
	tracing::debug!(elapsed = ?start.elapsed(), success_count, error_count, "Rebuilt books from disk");

	worker_ctx.report_progress(JobProgress::msg("Updating media in database"));
	let task_count = books.len() as i32;
	let start = Instant::now();

	let atomic_cursor = Arc::new(AtomicUsize::new(1));

	// TODO: We don't use the updated book, so chunk these and update_many?
	while let Some(book) = books.pop_front() {
		let path = book.path.clone();
		match update_media(&worker_ctx.db, book).await {
			Ok(_) => {
				output.updated_media += 1;
			},
			Err(e) => {
				tracing::error!(error = ?e, ?path, "Failed to update media");
				output.logs.push(
					JobExecuteLog::error(format!(
						"Failed to update media: {:?}",
						e.to_string()
					))
					.with_ctx(path),
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

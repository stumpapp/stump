use std::{
	collections::{HashMap, HashSet, VecDeque},
	path::{Path, PathBuf},
	sync::Arc,
	time::Instant,
};

use chrono::{DateTime, Utc};
use futures::{future::BoxFuture, stream::FuturesUnordered, StreamExt};
use models::{
	entity::{library_config, media, media_metadata, media_tag, series, tag},
	shared::enums::FileStatus,
};
use sea_orm::{
	prelude::*,
	sea_query::{OnConflict, Query},
	ActiveValue, Condition, DatabaseConnection, DatabaseTransaction, IntoActiveModel,
	Iterable, Set, TransactionTrait,
};
use tokio::task::spawn_blocking;
use walkdir::DirEntry;

use crate::{
	config::StumpConfig,
	database::{get_insert_batch_size, SQLITE_BIND_LIMIT},
	error::{CoreError, CoreResult},
	event::CreatedMedia,
	filesystem::{
		media::{BuiltMedia, MediaBuilder},
		scanner::options::{BookVisitOperation, CustomVisitResult},
		series::{BuiltSeries, SeriesBuilder},
	},
	job::{error::JobError, JobContext, JobExecuteLog, JobProgress},
	CoreEvent,
};

use super::{options::BookVisitResult, tag_cache::TagCache};

const MAX_INSERT_CHUNK_SIZE: usize = 250;

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

/// build the `media_tag` lookup record for given book pulling from cache
fn build_tag_link_rows(
	media_id: &str,
	tag_names: &[String],
	cache: &TagCache,
) -> Vec<media_tag::ActiveModel> {
	tag_names
		.iter()
		.filter(|n| !n.is_empty())
		.filter_map(|n| cache.get(n))
		.map(|tag_id| media_tag::ActiveModel {
			media_id: Set(media_id.to_string()),
			tag_id: Set(tag_id),
			..Default::default()
		})
		.collect()
}

pub(crate) async fn update_media(
	db: &DatabaseConnection,
	BuiltMedia {
		media,
		metadata,
		tags,
	}: BuiltMedia,
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

	ensure_tags_linked(&txn, &updated_media.id, &tags).await?;

	txn.commit().await?;

	Ok(updated_media)
}

/// Ensure each tag name in `tag_names` exists in the `tags` table and is linked to
/// `media_id` via `media_tags`. Creates tags that don't yet exist and adds missing
/// links; never removes existing links.
///
/// This is used during scans to intake tags from file metadata (e.g. ComicInfo.xml
/// `<Tags>`) without clobbering tags the user has manually assigned through the UI.
pub(crate) async fn ensure_tags_linked(
	txn: &DatabaseTransaction,
	media_id: &str,
	tag_names: &[String],
) -> CoreResult<()> {
	let desired: HashSet<String> = tag_names
		.iter()
		.filter(|n| !n.is_empty())
		.cloned()
		.collect();
	if desired.is_empty() {
		return Ok(());
	}

	let already_linked: Vec<tag::Model> =
		tag::Entity::find_for_media_id(media_id).all(txn).await?;
	let already_linked_names: HashSet<&str> =
		already_linked.iter().map(|t| t.name.as_str()).collect();

	let to_link: Vec<String> = desired
		.into_iter()
		.filter(|n| !already_linked_names.contains(n.as_str()))
		.collect();
	if to_link.is_empty() {
		return Ok(());
	}

	let existing_unlinked: Vec<tag::Model> = tag::Entity::find()
		.filter(tag::Column::Name.is_in(to_link.clone()))
		.all(txn)
		.await?;
	let existing_unlinked_names: HashSet<&str> =
		existing_unlinked.iter().map(|t| t.name.as_str()).collect();

	let to_create: Vec<tag::ActiveModel> = to_link
		.iter()
		.filter(|n| !existing_unlinked_names.contains(n.as_str()))
		.map(|name| tag::ActiveModel {
			name: Set(name.clone()),
			..Default::default()
		})
		.collect();

	let created = if to_create.is_empty() {
		Vec::new()
	} else {
		tag::Entity::insert_many(to_create)
			.exec_with_returning_many(txn)
			.await?
	};

	let new_link_ids: Vec<i32> = existing_unlinked
		.iter()
		.map(|t| t.id)
		.chain(created.iter().map(|t| t.id))
		.collect();

	if !new_link_ids.is_empty() {
		media_tag::Entity::insert_many(new_link_ids.into_iter().map(|tag_id| {
			media_tag::ActiveModel {
				media_id: Set(media_id.to_string()),
				tag_id: Set(tag_id),
				..Default::default()
			}
		}))
		.exec(txn)
		.await?;
	}

	Ok(())
}

pub(crate) async fn handle_book_visit_operation(
	db: &DatabaseConnection,
	result: BookVisitResult,
) -> CoreResult<()> {
	match result {
		BookVisitResult::Custom(custom) => {
			if let Some(mut meta) = custom.meta {
				let tags = meta.tags.take().unwrap_or_default();

				let txn = db.begin().await?;
				let active_model = media_metadata::ActiveModel {
					media_id: Set(Some(custom.id.clone())),
					..meta.into_active_model()
				};
				let updated_meta = active_model.update(&txn).await?;
				ensure_tags_linked(&txn, &custom.id, &tags).await?;
				txn.commit().await?;

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
	ctx: &JobContext,
	series_id: &str,
	paths: Vec<PathBuf>,
) -> MediaOperationOutput {
	let mut output = MediaOperationOutput::default();

	if paths.is_empty() {
		tracing::debug!("No missing media to handle");
		return output;
	}

	let path_strings: Vec<String> = paths
		.iter()
		.map(|p| p.to_string_lossy().to_string())
		.collect();

	for (i, chunk) in path_strings.chunks(SQLITE_BIND_LIMIT).enumerate() {
		let _affected_rows = media::Entity::update_many()
			.filter(media::Column::SeriesId.eq(series_id.to_string()))
			.filter(media::Column::Path.is_in(chunk.to_vec()))
			.col_expr(
				media::Column::Status,
				Expr::value(FileStatus::Missing.to_string()),
			)
			.exec(ctx.conn())
			.await
			.map_or_else(
				|error| {
					tracing::error!(
						chunk = i + 1,
						?error,
						"Failed to update missing media chunk"
					);
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
	}

	output
}

/// Handles restored media by updating the database with the latest information. A
/// media is considered restored if it was previously marked as missing and has been
/// found on disk.
pub(crate) async fn handle_restored_media(
	ctx: &JobContext,
	series_id: &str,
	ids: Vec<String>,
) -> MediaOperationOutput {
	let mut output = MediaOperationOutput::default();

	if ids.is_empty() {
		tracing::debug!("No restored media to handle");
		return output;
	}

	let id_strings: Vec<String> = ids.iter().map(|id| id.to_string()).collect();

	for (i, chunk) in id_strings.chunks(SQLITE_BIND_LIMIT).enumerate() {
		let _affected_series = media::Entity::update_many()
			.filter(media::Column::SeriesId.eq(series_id.to_string()))
			.filter(media::Column::Id.is_in(chunk.to_vec()))
			.col_expr(
				media::Column::Status,
				Expr::value(FileStatus::Ready.to_string()),
			)
			.exec(ctx.conn())
			.await
			.map_or_else(
				|error| {
					tracing::error!(
						chunk = i + 1,
						?error,
						"Failed to update restored media chunk"
					);
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
	}

	output
}

/// Builds a series from the given path
///
/// # Arguments
/// * `for_library` - The library ID to associate the series with
/// * `path` - The path to the series on disk
async fn build_series(for_library: &str, path: &Path) -> CoreResult<BuiltSeries> {
	let path = path.to_path_buf();
	let for_library = for_library.to_string();

	// Spawn a blocking task to handle the IO-intensive operations:
	spawn_blocking(move || SeriesBuilder::new(&path, &for_library).build())
		.await
		.map_err(|e| CoreError::Unknown(e.to_string()))?
}

/// a type alias for the unordered stream of futures returned by concurernt builds of
/// managed entities
type BuiltEntityFutures<T, R = PathBuf> =
	FuturesUnordered<BoxFuture<'static, Result<T, (CoreError, R)>>>;

/// Safely builds a series from a list of paths concurrently, with a maximum concurrency limit
/// derived from available CPU threads
///
/// # Arguments
/// * `for_library` - The library ID to associate the series with
/// * `paths` - A list of paths to build series from
/// * `reporter` - A function to report progress to the UI
pub(crate) async fn safely_build_series(
	for_library: &str,
	paths: Vec<PathBuf>,
	config: Arc<StumpConfig>,
	reporter: impl Fn(usize),
) -> (Vec<BuiltSeries>, Vec<JobExecuteLog>) {
	let mut logs = vec![];
	let mut created_series = Vec::with_capacity(paths.len());

	let concurrency = config.cpu_concurrency_limit();
	let total_series = paths.len();
	tracing::debug!(total_series, concurrency, "Processing series");

	let start = Instant::now();
	let mut futures: BuiltEntityFutures<BuiltSeries> = FuturesUnordered::new();
	let mut cursor = 0usize;

	for path in paths {
		if futures.len() >= concurrency {
			if let Some(result) = futures.next().await {
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
				reporter(cursor);
				cursor += 1;
			}
		}

		let for_library = for_library.to_string();
		futures.push(Box::pin(async move {
			tracing::trace!(?path, "Starting series build");
			build_series(&for_library, &path)
				.await
				.map_err(|e| (e, path.clone()))
		}));
	}

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
		reporter(cursor);
		cursor += 1;
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
	let path = path.to_path_buf();
	let series_id = series_id.to_string();
	let library_config = library_config.clone();
	let config = config.clone();

	// Spawn a blocking task to handle the IO-intensive operations:
	spawn_blocking({
		move || {
			let builder = MediaBuilder::new(&path, &series_id, library_config, &config);
			if let Some(existing_book) = existing_book {
				builder.rebuild(&existing_book)
			} else {
				builder.build()
			}
		}
	})
	.await
	.map_err(|e| CoreError::Unknown(e.to_string()))?
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
	let path = path.to_path_buf();
	let series_id = series_id.to_string();
	let library_config = library_config.clone();
	let config = config.clone();

	// Spawn a blocking task to handle the IO-intensive operations:
	spawn_blocking({
		move || {
			let builder = MediaBuilder::new(&path, &series_id, library_config, &config);
			match (operation, existing_book) {
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
			}
		}
	})
	.await
	.map_err(|e| CoreError::Unknown(e.to_string()))?
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
	}: MediaBuildOperation,
	worker_ctx: &JobContext,
	paths: Vec<PathBuf>,
) -> Result<MediaOperationOutput, JobError> {
	if paths.is_empty() {
		tracing::trace!("No media to create?");
		return Ok(MediaOperationOutput::default());
	}

	let mut output = MediaOperationOutput::default();

	let Some(library_id) = library_config.library_id.clone() else {
		tracing::error!(?library_config, "Library config has no library ID?");
		output.logs.push(JobExecuteLog::error(format!(
			"Library config has no library ID: {:?}",
			library_config.id
		)));
		return Ok(output);
	};

	let concurrency = worker_ctx.apalis_state.config.cpu_concurrency_limit();
	let book_count = paths.len();
	tracing::debug!(book_count, concurrency, "Processing media");

	let start = Instant::now();
	let mut books = VecDeque::with_capacity(book_count);

	worker_ctx.report_progress(JobProgress::msg("Building media from disk"));

	let config_arc = Arc::clone(&worker_ctx.apalis_state.config);
	let mut futures: BuiltEntityFutures<BuiltMedia> = FuturesUnordered::new();
	let mut cursor = 0i32;

	for path in paths {
		if futures.len() >= concurrency {
			if let Some(result) = futures.next().await {
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
				cursor += 1;
				worker_ctx.report_progress(JobProgress::subtask_position(
					cursor,
					book_count as i32,
				));
			}
		}

		let series_id = series_id.clone();
		let library_config = library_config.clone();
		let config = Arc::clone(&config_arc);

		futures.push(Box::pin(async move {
			tracing::trace!(?path, "Starting media build");
			build_book(&path, &series_id, None, library_config, &config)
				.await
				.map_err(|e| (e, path.clone()))
		}));
	}

	while let Some(result) = futures.next().await {
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
		cursor += 1;
		worker_ctx
			.report_progress(JobProgress::subtask_position(cursor, book_count as i32));
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

	let media_cols_count = media::Column::iter().count();
	let media_metadata_cols_count = media_metadata::Column::iter().count();
	let media_tag_cols_count = media_tag::Column::iter().count();

	let all_tag_names: HashSet<_> =
		books.iter().flat_map(|b| b.tags.iter().cloned()).collect();
	let tag_cache = TagCache::build(worker_ctx.conn(), all_tag_names).await?;

	let mut insert_cursor = 0i32;

	while !books.is_empty() {
		let txn = worker_ctx.conn().begin().await?;

		let chunk_count = MAX_INSERT_CHUNK_SIZE.min(books.len());

		let mut media_models = Vec::with_capacity(chunk_count);
		let mut meta_models: Vec<media_metadata::ActiveModel> = Vec::new();
		let mut tags_by_media: Vec<(String, Vec<String>)> = Vec::new();
		let mut inserted_ids: Vec<String> = Vec::with_capacity(chunk_count);

		for _ in 0..chunk_count {
			let Some(BuiltMedia {
				media,
				metadata,
				tags,
			}) = books.pop_front()
			else {
				break;
			};

			let media_id = match media.id.clone() {
				ActiveValue::Set(id) | ActiveValue::Unchanged(id) => id,
				ActiveValue::NotSet => {
					// this should not really happen but i want the log without killing
					// the entire batch
					tracing::warn!(?media, "Media built without an id, skipping");
					continue;
				},
			};

			inserted_ids.push(media_id.clone());
			media_models.push(media);

			if let Some(meta) = metadata {
				meta_models.push(meta);
			}

			if !tags.is_empty() {
				tags_by_media.push((media_id, tags));
			}
		}

		let media_batch_size = get_insert_batch_size(media_cols_count);
		for batch in media_models.chunks(media_batch_size) {
			media::Entity::insert_many(batch.to_vec())
				.exec(&txn)
				.await
				.map_err(CoreError::from)?;
		}

		if !meta_models.is_empty() {
			let meta_batch_size = get_insert_batch_size(media_metadata_cols_count);
			for batch in meta_models.chunks(meta_batch_size) {
				media_metadata::Entity::insert_many(batch.to_vec())
					.exec(&txn)
					.await
					.map_err(CoreError::from)?;
			}
		}

		let mut tag_links: Vec<media_tag::ActiveModel> = Vec::new();
		for (media_id, tag_names) in &tags_by_media {
			tag_links.extend(build_tag_link_rows(media_id, tag_names, &tag_cache));
		}
		if !tag_links.is_empty() {
			let tag_batch_size = get_insert_batch_size(media_tag_cols_count);
			for batch in tag_links.chunks(tag_batch_size) {
				media_tag::Entity::insert_many(batch.to_vec())
					.exec(&txn)
					.await
					.map_err(CoreError::from)?;
			}
		}

		txn.commit().await?;

		// TODO(metadata-fetching): Track inserted_ids as needing fetching (assuming enabled)
		for media_id in inserted_ids {
			output.created_media += 1;
			insert_cursor += 1;
			worker_ctx.report_progress(JobProgress::subtask_position(
				insert_cursor,
				task_count,
			));
			worker_ctx.emit_event(CoreEvent::CreatedMedia(CreatedMedia {
				id: media_id,
				series_id: series_id.clone(),
				library_id: library_id.clone(),
			}));
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
	}: MediaBuildOperation,
	worker_ctx: &JobContext,
	params: Vec<(PathBuf, BookVisitOperation)>,
) -> Result<MediaOperationOutput, JobError> {
	let mut output = MediaOperationOutput::default();

	if params.is_empty() {
		tracing::trace!("No media to visit?");
		return Ok(output);
	}

	let conn = worker_ctx.conn();
	let paths_to_operation = params
		.iter()
		.map(|(p, o)| (p.to_string_lossy().to_string(), *o))
		.collect::<HashMap<_, _>>();
	let paths = paths_to_operation.keys().cloned().collect::<Vec<String>>();
	let paths_len = paths.len();

	let mut media = Vec::with_capacity(paths_len);
	for chunk in paths.chunks(SQLITE_BIND_LIMIT) {
		let batch = media::ModelWithMetadata::find()
			.filter(media::Column::Path.is_in(chunk.to_vec()))
			.filter(media::Column::SeriesId.eq(series_id.to_string()))
			.into_model::<media::ModelWithMetadata>()
			.all(conn)
			.await?;
		media.extend(batch);
	}

	if media.len() != paths_len {
		output.logs.push(JobExecuteLog::warn(
			"Not all media paths were found in the database",
		));
	}

	let concurrency = worker_ctx.apalis_state.config.cpu_concurrency_limit();
	let book_count = media.len();
	tracing::debug!(book_count, concurrency, "Processing media visit");

	let start = Instant::now();
	let mut build_results = VecDeque::with_capacity(book_count);

	worker_ctx.report_progress(JobProgress::msg("Visiting media on disk"));

	let config_arc = Arc::clone(&worker_ctx.apalis_state.config);
	let mut futures: BuiltEntityFutures<BookVisitResult, String> =
		FuturesUnordered::new();
	let mut cursor = 0i32;

	for book in media {
		let path = book.media.path.clone();
		let Some(operation) = paths_to_operation.get(&path) else {
			tracing::warn!(?path, "No operation found for media?");
			continue;
		};

		if futures.len() >= concurrency {
			if let Some(future_result) = futures.next().await {
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
				cursor += 1;
				worker_ctx.report_progress(JobProgress::subtask_position(
					cursor,
					book_count as i32,
				));
			}
		}

		let ctx = BookVisitCtx {
			operation: *operation,
			existing_book: Some(book),
			series_id: series_id.clone(),
			path: PathBuf::from(path.as_str()),
		};
		let library_config = library_config.clone();
		let config = Arc::clone(&config_arc);
		futures.push(Box::pin(async move {
			tracing::trace!(?path, "Starting media visit");
			handle_book(ctx, library_config, &config)
				.await
				.map_err(|e| (e, path.clone()))
		}));
	}

	while let Some(future_result) = futures.next().await {
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
		cursor += 1;
		worker_ctx
			.report_progress(JobProgress::subtask_position(cursor, book_count as i32));
	}

	let success_count = build_results.len();
	let error_count = output.logs.len();
	tracing::debug!(elapsed = ?start.elapsed(), success_count, error_count, "Handled books from disk");

	worker_ctx.report_progress(JobProgress::msg("Updating media in database"));
	let task_count = build_results.len() as i32;
	let start = Instant::now();

	let mut update_cursor = 0i32;

	while let Some(result) = build_results.pop_front() {
		let error_ctx = result.error_ctx();
		match handle_book_visit_operation(worker_ctx.conn(), result).await {
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

		update_cursor += 1;
		worker_ctx
			.report_progress(JobProgress::subtask_position(update_cursor, task_count));
	}

	let success_count = output.updated_media;
	let error_count = output.logs.len() - error_count; // Subtract the errors from the previous step
	tracing::debug!(elapsed = ?start.elapsed(), success_count, error_count, "Updated books in database");

	Ok(output)
}

// TODO(tests): sort out tests later. I had to remove them for now because
// mocking apalis state and all that was too much

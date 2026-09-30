use std::{
	collections::{HashMap, HashSet, VecDeque},
	path::PathBuf,
	sync::Arc,
	time::Instant,
};

use futures::StreamExt;
use models::{
	entity::{library_config, media, media_metadata, media_tag, tag},
	shared::enums::{FileStatus, OrganizationMode},
};
use sea_orm::{
	prelude::*,
	sea_query::{Expr, OnConflict, SimpleExpr},
	ActiveValue, DatabaseTransaction, IntoActiveModel, Iterable, QueryTrait, Set,
	TransactionTrait,
};

use crate::{
	config::StumpConfig,
	database::{get_insert_batch_size, SQLITE_BIND_LIMIT},
	error::{CoreError, CoreResult},
	event::CreatedMedia,
	job::{error::JobError, JobContext, JobExecuteLog, JobProgress},
	media::{
		prepare::{prepare_draft, MediaDraft},
		processor::{generate_hashes, process_metadata, MediaProcessorOptions},
	},
	metadata::membership::resolve_series_membership,
	scan::{
		options::{BookVisitOperation, BookVisitResult, CustomVisitResult},
		tag_cache::TagCache,
		utils::{BuiltEntityFutures, MAX_INSERT_CHUNK_SIZE},
	},
	CoreEvent,
};

// TODO(granular-scans): intake ScanOptions
pub(crate) struct MediaBuildOperation {
	pub series_id: Option<String>,
	pub library_config: library_config::Model,
}

#[derive(Default)]
pub(crate) struct MediaOperationOutput {
	pub created_media: u64,
	pub created_series: u64,
	pub updated_media: u64,
	pub logs: Vec<JobExecuteLog>,
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

/// executes batch inserts for one chunk of media within an **already-open**
/// transaction. the caller is responsible for committing the txn
pub(super) async fn insert_media_in_txn(
	txn: &DatabaseTransaction,
	media_models: Vec<media::ActiveModel>,
	meta_models: Vec<media_metadata::ActiveModel>,
	tags_by_media: Vec<(String, Vec<String>)>,
	tag_cache: &TagCache,
) -> CoreResult<()> {
	let media_batch_size = get_insert_batch_size(media::Column::iter().count());
	for batch in media_models.chunks(media_batch_size) {
		media::Entity::insert_many(batch.to_vec())
			.exec(txn)
			.await
			.map_err(CoreError::from)?;
	}

	if !meta_models.is_empty() {
		let meta_batch_size =
			get_insert_batch_size(media_metadata::Column::iter().count());
		for batch in meta_models.chunks(meta_batch_size) {
			media_metadata::Entity::insert_many(batch.to_vec())
				.exec(txn)
				.await
				.map_err(CoreError::from)?;
		}
	}

	let tag_links: Vec<media_tag::ActiveModel> = tags_by_media
		.iter()
		.flat_map(|(media_id, tag_names)| {
			build_tag_link_rows(media_id, tag_names, tag_cache)
		})
		.collect();

	if !tag_links.is_empty() {
		let tag_batch_size = get_insert_batch_size(media_tag::Column::iter().count());
		for batch in tag_links.chunks(tag_batch_size) {
			media_tag::Entity::insert_many(batch.to_vec())
				.exec(txn)
				.await
				.map_err(CoreError::from)?;
		}
	}

	Ok(())
}

pub(crate) async fn update_media(
	txn: &DatabaseTransaction,
	MediaDraft {
		media,
		metadata,
		tags,
	}: MediaDraft,
) -> CoreResult<media::Model> {
	let updated_media = media.update(txn).await?;

	if let Some(meta) = metadata {
		let on_conflict = OnConflict::new()
			.update_columns(media_metadata::Column::iter())
			.to_owned();
		media_metadata::Entity::insert(meta.into_active_model())
			.on_conflict(on_conflict)
			.exec(txn)
			.await?;
	}

	ensure_tags_linked(txn, &updated_media.id, &tags).await?;

	Ok(updated_media)
}

/// Ensures each tag name in `tag_names` exists in the `tags` table and is linked to
/// the media record, without overwriting existing links
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

struct BookVisitCtx {
	operation: BookVisitOperation,
	path: PathBuf,
	series_id: Option<String>,
	existing_book: Option<media::ModelWithMetadata>,
}

async fn execute_book_visit(
	BookVisitCtx {
		path,
		operation,
		series_id,
		existing_book,
	}: BookVisitCtx,
	library_config: library_config::Model,
	config: &StumpConfig,
) -> CoreResult<BookVisitResult> {
	match (operation, existing_book) {
		(BookVisitOperation::Rebuild, Some(book)) => prepare_draft(
			&path,
			series_id.as_deref(),
			library_config,
			config,
			Some(&book),
		)
		.await
		.map(|b| BookVisitResult::Built(Box::new(b))),
		(BookVisitOperation::Custom(custom), Some(book)) => {
			let mut result = CustomVisitResult {
				id: book.media.id.clone(),
				..Default::default()
			};
			if custom.regen_hashes {
				let options = MediaProcessorOptions::new(&library_config, config);
				let hashes = generate_hashes(&path, options, config)
					.await
					.map_err(CoreError::from)?;
				result.hashes = Some(hashes);
			}
			if custom.regen_meta {
				let meta =
					process_metadata(&path, library_config.organization_mode, config)
						.await
						.map_err(CoreError::from)?;
				result.meta = meta
					.or_else(|| {
						(library_config.organization_mode == OrganizationMode::Metadata)
							.then(Default::default)
					})
					.map(Box::new);
			}
			Ok(BookVisitResult::Custom(result))
		},
		// If the existing book is None, it means the book doesn't yet exist so we
		// always just do a full build. However, we really shouldn't be in this state
		// since media creation is handled in a separate flow than visit
		(_, None) => {
			prepare_draft(&path, series_id.as_deref(), library_config, config, None)
				.await
				.map(|b| BookVisitResult::Built(Box::new(b)))
		},
	}
}

/// Safely builds media from a list of paths concurrently, tracking errors and
/// reporting progress to the worker context
async fn build_media(
	paths: Vec<PathBuf>,
	series_id: Option<&str>,
	library_config: library_config::Model,
	worker_ctx: &JobContext,
) -> (VecDeque<MediaDraft>, Vec<JobExecuteLog>) {
	let mut logs = vec![];
	let book_count = paths.len();
	let concurrency = worker_ctx.apalis_state.config.cpu_concurrency_limit();
	tracing::debug!(book_count, concurrency, "Processing media");

	let start = Instant::now();
	let mut books = VecDeque::with_capacity(book_count);

	worker_ctx.report_progress(JobProgress::msg("Building media from disk"));

	let config_arc = Arc::clone(&worker_ctx.apalis_state.config);
	let mut futures: BuiltEntityFutures<MediaDraft> = BuiltEntityFutures::new();
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
						logs.push(
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

		let series_id = series_id.map(str::to_string);
		let library_config = library_config.clone();
		let config = Arc::clone(&config_arc);

		futures.push(Box::pin(async move {
			tracing::trace!(?path, "Starting media build");
			prepare_draft(&path, series_id.as_deref(), library_config, &config, None)
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
				logs.push(
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
	let error_count = logs.len();
	tracing::debug!(elapsed = ?start.elapsed(), success_count, error_count, "Built books from disk");

	(books, logs)
}

// TODO: This is effectively all or nothing, and it maybe shouldn't be. if there is one bad book in e.g.
// 500, all batches fail. we can't get that 499 since we want to optimization of batching, but
// perhaps each chunk can be its own txn

/// Inserts a list of built media into the database in safe chunks, reporting progress to the
/// worker context.
async fn insert_media(
	mut books: VecDeque<MediaDraft>,
	organization_mode: OrganizationMode,
	library_id: &str,
	worker_ctx: &JobContext,
) -> Result<(u64, u64), JobError> {
	let conn = worker_ctx.conn();
	let task_count = books.len() as i32;

	let all_tag_names: HashSet<_> =
		books.iter().flat_map(|b| b.tags.iter().cloned()).collect();
	let tag_cache = TagCache::build(conn, all_tag_names).await?;

	let mut count = 0i32;
	let mut created_series = 0;

	while !books.is_empty() {
		let txn = conn.begin().await?;
		let chunk_count = MAX_INSERT_CHUNK_SIZE.min(books.len());

		let mut media_models = Vec::with_capacity(chunk_count);
		let mut series_names = Vec::with_capacity(chunk_count);
		let mut meta_models: Vec<media_metadata::ActiveModel> = Vec::new();
		let mut tags_by_media: Vec<(String, Vec<String>)> = Vec::new();

		for _ in 0..chunk_count {
			let Some(MediaDraft {
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

			count += 1;
			worker_ctx.report_progress(JobProgress::subtask_position(count, task_count));

			series_names.push(
				metadata
					.as_ref()
					.and_then(|meta| meta.series.try_as_ref().cloned().flatten()),
			);
			media_models.push(media);

			if let Some(meta) = metadata {
				meta_models.push(meta);
			}

			if !tags.is_empty() {
				tags_by_media.push((media_id, tags));
			}
		}

		let mut chunk_created_series = 0;
		if organization_mode == OrganizationMode::Metadata {
			let (memberships, created) =
				resolve_series_membership(&txn, library_id, &series_names).await?;
			chunk_created_series = created;
			for (book, membership) in media_models.iter_mut().zip(memberships) {
				book.series_id = Set(membership);
			}
		}
		let media_ids: Vec<_> = media_models
			.iter()
			.filter_map(|book| {
				book.id.try_as_ref().map(|id| {
					(id.clone(), book.series_id.try_as_ref().cloned().flatten())
				})
			})
			.collect();
		insert_media_in_txn(&txn, media_models, meta_models, tags_by_media, &tag_cache)
			.await?;
		txn.commit().await?;
		created_series += chunk_created_series;
		if chunk_created_series > 0 {
			worker_ctx.emit_event(CoreEvent::CreatedManySeries(
				crate::event::CreatedManySeries {
					count: chunk_created_series,
					library_id: library_id.to_string(),
				},
			));
		}

		// TODO(metadata-fetching): Track media_ids as needing fetching (assuming enabled)
		for (media_id, series_id) in media_ids {
			worker_ctx.emit_event(CoreEvent::CreatedMedia(CreatedMedia {
				id: media_id,
				series_id,
				library_id: library_id.to_string(),
			}));
		}
	}

	Ok((count as u64, created_series))
}

/// Handles a completed book-visit result by persisting the outcome to the database
pub(crate) async fn handle_book_visit_operation(
	txn: &DatabaseTransaction,
	result: BookVisitResult,
) -> CoreResult<()> {
	match result {
		BookVisitResult::Custom(custom) => {
			if let Some(mut meta) = custom.meta {
				let tags = meta.tags.take().unwrap_or_default();

				let active_model = media_metadata::ActiveModel {
					media_id: Set(Some(custom.id.clone())),
					..meta.into_active_model()
				};
				let upserted_meta = media_metadata::Entity::insert(active_model)
					.on_conflict(
						OnConflict::new()
							.update_columns(media_metadata::Column::iter())
							.to_owned(),
					)
					.exec_with_returning(txn)
					.await?;
				ensure_tags_linked(txn, &custom.id, &tags).await?;

				tracing::trace!(?upserted_meta, "Metadata upserted");
			}

			if let Some(hashes) = custom.hashes {
				let affected_rows = media::Entity::update_many()
					.filter(media::Column::Id.eq(custom.id.clone()))
					.col_expr(media::Column::Hash, Expr::value(hashes.stump))
					.col_expr(media::Column::KoreaderHash, Expr::value(hashes.koreader))
					.exec(txn)
					.await?
					.rows_affected;
				tracing::trace!(affected_rows, "Book updated with new hashes");
			}
		},
		BookVisitResult::Built(book) => {
			let updated_media = update_media(txn, *book).await?;
			tracing::trace!(?updated_media, "Book updated");
		},
	}

	Ok(())
}

async fn persist_visit_chunk(
	txn: &DatabaseTransaction,
	library_id: &str,
	organization_mode: OrganizationMode,
	mut results: Vec<BookVisitResult>,
) -> CoreResult<u64> {
	let mut created_series = 0;
	if organization_mode == OrganizationMode::Metadata {
		let (indices, names): (Vec<_>, Vec<_>) = results
			.iter()
			.enumerate()
			.filter_map(|(index, result)| {
				let name = match result {
					BookVisitResult::Built(book) => book
						.metadata
						.as_ref()
						.and_then(|meta| meta.series.try_as_ref().cloned().flatten()),
					BookVisitResult::Custom(custom) => {
						custom.meta.as_ref()?.series.clone()
					},
				};
				Some((index, name))
			})
			.unzip();
		let (memberships, created) =
			resolve_series_membership(txn, library_id, &names).await?;
		created_series = created;
		for (index, membership) in indices.into_iter().zip(memberships) {
			match &mut results[index] {
				BookVisitResult::Built(book) => book.media.series_id = Set(membership),
				BookVisitResult::Custom(custom) => {
					media::Entity::update_many()
						.filter(media::Column::Id.eq(&custom.id))
						.filter(media::Column::LibraryId.eq(library_id))
						.col_expr(media::Column::SeriesId, Expr::value(membership))
						.exec(txn)
						.await?;
				},
			}
		}
	}
	for result in results {
		handle_book_visit_operation(txn, result).await?;
	}
	Ok(created_series)
}

/// Handles missing media by updating the database with the latest information. A media is
/// considered missing if it was previously marked as ready and is no longer found on disk.
pub(crate) async fn handle_missing_media(
	ctx: &JobContext,
	scope: SimpleExpr,
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

	for (i, chunk) in path_strings.chunks(SQLITE_BIND_LIMIT - 1).enumerate() {
		let _affected_rows = media::Entity::update_many()
			.filter(scope.clone())
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
	scope: SimpleExpr,
	ids: Vec<String>,
) -> MediaOperationOutput {
	let mut output = MediaOperationOutput::default();

	if ids.is_empty() {
		tracing::debug!("No restored media to handle");
		return output;
	}

	let id_strings: Vec<String> = ids.iter().map(|id| id.to_string()).collect();

	for (i, chunk) in id_strings.chunks(SQLITE_BIND_LIMIT - 1).enumerate() {
		let _affected_series = media::Entity::update_many()
			.filter(scope.clone())
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

/// Builds media from a list of paths concurrently and then inserts them into the database.
/// See:
/// - [`build_media`] for the media building
/// - [`insert_media`] for the media insertion
pub(crate) async fn build_and_insert_media(
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

	let organization_mode = library_config.organization_mode;
	let (books, build_logs) =
		build_media(paths, series_id.as_deref(), library_config, worker_ctx).await;
	output.logs.extend(build_logs);

	worker_ctx.report_progress(JobProgress::msg("Inserting books into database"));
	let start = Instant::now();

	let (created_count, created_series) =
		insert_media(books, organization_mode, &library_id, worker_ctx).await?;
	output.created_media = created_count;
	output.created_series = created_series;

	let insert_error_count = output.logs.len();
	tracing::debug!(
		success_count = created_count,
		error_count = insert_error_count,
		elapsed = ?start.elapsed(),
		"Inserted books into database"
	);

	Ok(output)
}

/// Visits the media on disk and updates the database with the latest information
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
	let library_id = library_config.library_id.as_deref().ok_or_else(|| {
		JobError::TaskFailed("Library configuration is missing its library ID".into())
	})?;

	let mut media = Vec::with_capacity(paths_len);
	// we cannot just do a single query with all paths because bind limits
	// for sqlite, so we chunk it up and load them iteratively
	for chunk in paths.chunks(SQLITE_BIND_LIMIT - 2) {
		let batch = media::ModelWithMetadata::find()
			.filter(media::Column::Path.is_in(chunk.to_vec()))
			.filter(media::Column::LibraryId.eq(library_id))
			.apply_if(series_id.clone(), |query, id| {
				query.filter(media::Column::SeriesId.eq(id))
			})
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
		BuiltEntityFutures::new();
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
			execute_book_visit(ctx, library_config, &config)
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

	let chunk_size = if library_config.organization_mode == OrganizationMode::Metadata {
		MAX_INSERT_CHUNK_SIZE
	} else {
		1
	};
	while !build_results.is_empty() {
		let chunk_count = chunk_size.min(build_results.len());
		let chunk: Vec<_> = build_results.drain(..chunk_count).collect();
		let error_ctx = chunk[0].error_ctx();
		let txn = conn.begin().await?;
		match persist_visit_chunk(
			&txn,
			library_id,
			library_config.organization_mode,
			chunk,
		)
		.await
		{
			Ok(created) => {
				txn.commit().await?;
				output.updated_media += chunk_count as u64;
				output.created_series += created;
				if created > 0 {
					worker_ctx.emit_event(CoreEvent::CreatedManySeries(
						crate::event::CreatedManySeries {
							count: created,
							library_id: library_id.to_string(),
						},
					));
				}
			},
			Err(e) => {
				txn.rollback().await?;
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

		update_cursor += chunk_count as i32;
		worker_ctx
			.report_progress(JobProgress::subtask_position(update_cursor, task_count));
	}

	let success_count = output.updated_media;
	let error_count = output.logs.len() - error_count; // subtract the errors from the previous step
	tracing::debug!(elapsed = ?start.elapsed(), success_count, error_count, "Updated books in database");

	Ok(output)
}

// TODO: i added a single test for asserting fix for https://github.com/stumpapp/stump/issues/1407
// but really this entire thing needs some semblance of testing. the scanner itself is difficult to
// test, but in the reorganization branch things are more split and testing is way more
// approachable
#[cfg(test)]
mod tests {
	use super::*;

	use crate::metadata::ProcessedMediaMetadata;
	use ::tests::{db::test_database, fake_data};

	// regression test for https://github.com/stumpapp/stump/issues/1407
	// can confirm by changing the upsert to active_model.update(&txn).await?
	#[tokio::test]
	async fn test_handle_book_visit_operation_no_panic_upsert_metadata() {
		let db = test_database().await;

		let library = fake_data::Library::default().insert(&db).await;
		let series = fake_data::Series {
			library_id: Some(library.id.clone()),
			..Default::default()
		}
		.insert(&db)
		.await;
		let media = fake_data::Media {
			series_id: series.id.clone(),
			..Default::default()
		}
		.insert(&db)
		.await;

		let original_visit = BookVisitResult::Custom(CustomVisitResult {
			id: media.id.clone(),
			meta: Some(Box::new(ProcessedMediaMetadata {
				title: Some("original title".to_string()),
				summary: Some("original summary".to_string()),
				..Default::default()
			})),
			hashes: None,
		});

		let txn = db.begin().await.unwrap();
		handle_book_visit_operation(&txn, original_visit)
			.await
			.expect("first upsert should not fail");
		txn.commit().await.unwrap();

		let row = media_metadata::Entity::find()
			.filter(media_metadata::Column::MediaId.eq(media.id.clone()))
			.one(&db)
			.await
			.expect("query failed")
			.expect("metadata row should exist");
		assert_eq!(row.title, Some("original title".to_string()));

		let subsequent_visit = BookVisitResult::Custom(CustomVisitResult {
			id: media.id.clone(),
			meta: Some(Box::new(ProcessedMediaMetadata {
				title: Some("updated title".to_string()),
				summary: Some("updated summary".to_string()),
				..Default::default()
			})),
			hashes: None,
		});

		let txn = db.begin().await.unwrap();
		handle_book_visit_operation(&txn, subsequent_visit)
			.await
			.expect("second upsert should not fail");
		txn.commit().await.unwrap();

		let row = media_metadata::Entity::find()
			.filter(media_metadata::Column::MediaId.eq(media.id.clone()))
			.one(&db)
			.await
			.expect("query failed")
			.expect("metadata row should exist");
		assert_eq!(row.title, Some("updated title".to_string()));

		let total_metadata_records = media_metadata::Entity::find()
			.filter(media_metadata::Column::MediaId.eq(media.id.clone()))
			.count(&db)
			.await
			.expect("count query failed");
		assert!(
			total_metadata_records == 1,
			"there should only be one metadata record for the media"
		);
		// ^ i.e., it should have entered the on_conflict upsert path
	}
}

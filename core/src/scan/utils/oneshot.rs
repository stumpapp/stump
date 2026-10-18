use std::{
	collections::{HashMap, HashSet, VecDeque},
	path::{Path, PathBuf},
	sync::Arc,
	time::Instant,
};

use futures::StreamExt;
use models::{
	entity::{
		library_config,
		media::{self, MediaIdentSelect, MediaIdentWithSeriesId},
		media_metadata, reading_session,
		series::{self, SeriesIdentSelect},
		series_metadata,
	},
	shared::enums::FileStatus,
};
use sea_orm::{
	prelude::*, sea_query::Expr, ActiveValue, QuerySelect, Set, TransactionTrait,
};
use uuid::Uuid;

use crate::{
	config::StumpConfig,
	database::SQLITE_BIND_LIMIT,
	error::{CoreError, CoreResult},
	event::CreatedMedia,
	fs_utils::{FileParts, PathUtils},
	job::{error::JobError, JobContext, JobExecuteLog, JobProgress},
	media::prepare::{prepare_draft, MediaDraft},
	media::series::BuiltSeries,
	scan::{
		tag_cache::TagCache,
		utils::{media::insert_media_in_txn, BuiltEntityFutures, MAX_INSERT_CHUNK_SIZE},
	},
	CoreEvent,
};

struct BuiltOneshot {
	series: BuiltSeries,
	media: MediaDraft,
}

#[derive(Default)]
pub(crate) struct OneshotOperationOutput {
	pub created_series: u64,
	pub created_media: u64,
	pub logs: Vec<JobExecuteLog>,
}

async fn build_oneshot<P: AsRef<Path>>(
	path: P,
	library_id: &str,
	library_config: library_config::Model,
	core_config: &StumpConfig,
) -> CoreResult<BuiltOneshot> {
	let path = path.as_ref();
	let FileParts {
		file_stem: name, ..
	} = path.file_parts();

	let id = Uuid::new_v4();
	// ^ we set id early to share with book
	let series = series::ActiveModel {
		id: Set(id.to_string()),
		path: Set(path.to_string_lossy().to_string()),
		name: Set(name.clone()),
		library_id: Set(Some(library_id.to_string())),
		is_oneshot: Set(true),
		status: Set(FileStatus::Ready),
		..Default::default()
	};

	let media = prepare_draft(path, &id.to_string(), library_config, core_config, None)
		.await?
		.oneshot();

	let metadata = match media.metadata.as_ref().map(|m| m.title.clone()) {
		// ^ note: as_ref() impl for ActiveValue allegedly can panic if the value is not set,
		// so just went a little more verbose here with a clone and match
		Some(Set(Some(title))) => Some(series_metadata::ActiveModel {
			series_id: Set(id.to_string()),
			title: Set(Some(title)),
			..Default::default()
		}),
		_ => None,
	};

	let series = BuiltSeries { series, metadata };

	Ok(BuiltOneshot { series, media })
}

/// Builds all oneshot series+media pairs in parallel, returning them alongside
/// any errors that were collected
async fn build_oneshots(
	for_library: &str,
	paths: Vec<PathBuf>,
	library_config: library_config::Model,
	config: Arc<StumpConfig>,
	reporter: impl Fn(usize),
) -> (Vec<BuiltOneshot>, Vec<JobExecuteLog>) {
	let mut logs = vec![];
	let mut built_oneshots = Vec::with_capacity(paths.len());

	let concurrency = config.cpu_concurrency_limit();
	let total = paths.len();
	tracing::debug!(total, concurrency, "Processing oneshots");

	let start = Instant::now();
	let mut futures: BuiltEntityFutures<BuiltOneshot> = BuiltEntityFutures::new();
	let mut cursor = 0usize;

	for path in paths {
		if futures.len() >= concurrency {
			if let Some(result) = futures.next().await {
				match result {
					Ok(oneshot) => {
						built_oneshots.push(oneshot);
					},
					Err((error, path)) => {
						logs.push(
							JobExecuteLog::error(format!(
								"Failed to build oneshot: {:?}",
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
		let library_config_cpy = library_config.clone();
		let config_cpy = config.as_ref().clone();
		futures.push(Box::pin(async move {
			tracing::trace!(?path, "Starting oneshot build");
			build_oneshot(&path, &for_library, library_config_cpy, &config_cpy)
				.await
				.map_err(|e| (e, path.clone()))
		}));
	}

	while let Some(result) = futures.next().await {
		match result {
			Ok(oneshot) => {
				built_oneshots.push(oneshot);
			},
			Err((error, path)) => {
				logs.push(
					JobExecuteLog::error(format!(
						"Failed to build oneshot: {:?}",
						error.to_string()
					))
					.with_ctx(format!("Path: {path:?}")),
				);
			},
		}
		reporter(cursor);
		cursor += 1;
	}

	let success_count = built_oneshots.len();
	let error_count = logs.len();
	tracing::debug!(elapsed = ?start.elapsed(), success_count, error_count, "Finished building batch of oneshots");

	(built_oneshots, logs)
}

async fn insert_oneshots(
	oneshots: Vec<BuiltOneshot>,
	library_id: &str,
	worker_ctx: &JobContext,
) -> Result<OneshotOperationOutput, JobError> {
	let mut output = OneshotOperationOutput::default();

	if oneshots.is_empty() {
		return Ok(output);
	}

	let all_tag_names: HashSet<_> = oneshots
		.iter()
		.flat_map(|o| o.media.tags.iter().cloned())
		.collect();
	let tag_cache = TagCache::build(worker_ctx.conn(), all_tag_names).await?;

	let total = oneshots.len() as i32;
	let mut remaining = VecDeque::from(oneshots);
	let mut count = 0i32;

	worker_ctx.report_progress(JobProgress::msg("Inserting oneshots into database"));

	while !remaining.is_empty() {
		let chunk_count = MAX_INSERT_CHUNK_SIZE.min(remaining.len());
		let txn = worker_ctx.conn().begin().await?;

		let mut event_pairs: Vec<(String, String)> = Vec::with_capacity(chunk_count);
		let mut media_models: Vec<media::ActiveModel> = Vec::with_capacity(chunk_count);
		let mut meta_models: Vec<media_metadata::ActiveModel> = Vec::new();
		let mut tags_by_media: Vec<(String, Vec<String>)> = Vec::new();

		for _ in 0..chunk_count {
			let Some(BuiltOneshot {
				series: BuiltSeries {
					series,
					metadata: series_metadata,
				},
				media:
					MediaDraft {
						media,
						metadata: media_metadata,
						tags,
					},
			}) = remaining.pop_front()
			else {
				break;
			};
			// ^ ugly formatting ew

			let created_series = series.insert(&txn).await?;

			if let Some(mut meta) = series_metadata {
				meta.series_id = Set(created_series.id.clone());
				if let Err(error) = meta.insert(&txn).await {
					tracing::error!(?error, "Failed to insert oneshot series metadata");
				}
			}

			let media_id = match media.id.clone() {
				ActiveValue::Set(id) | ActiveValue::Unchanged(id) => id,
				ActiveValue::NotSet => {
					tracing::warn!("Oneshot media built without an id, skipping");
					continue;
				},
			};

			count += 1;
			worker_ctx.report_progress(JobProgress::subtask_position(count, total));

			event_pairs.push((media_id.clone(), created_series.id.clone()));
			media_models.push(media);

			if let Some(meta) = media_metadata {
				meta_models.push(meta);
			}

			if !tags.is_empty() {
				tags_by_media.push((media_id, tags));
			}
		}

		insert_media_in_txn(&txn, media_models, meta_models, tags_by_media, &tag_cache)
			.await?;
		txn.commit().await?;

		for (media_id, series_id) in event_pairs {
			worker_ctx.emit_event(CoreEvent::CreatedMedia(CreatedMedia {
				id: media_id,
				series_id,
				library_id: library_id.to_string(),
			}));
		}
	}

	output.created_series = count as u64;
	output.created_media = count as u64;

	tracing::debug!(
		created_series = output.created_series,
		created_media = output.created_media,
		"Inserted oneshots into database"
	);

	Ok(output)
}

/// Builds oneshot series+media pairs from disk concurrently, then inserts them
/// into the database in chunks
pub(crate) async fn build_and_insert_oneshots(
	for_library: &str,
	paths: Vec<PathBuf>,
	library_config: library_config::Model,
	worker_ctx: &JobContext,
) -> Result<OneshotOperationOutput, JobError> {
	if paths.is_empty() {
		return Ok(OneshotOperationOutput::default());
	}

	let path_count = paths.len();

	worker_ctx.report_progress(JobProgress::msg("Building oneshots from disk"));

	let (built_oneshots, build_logs) = build_oneshots(
		for_library,
		paths,
		library_config,
		Arc::clone(&worker_ctx.apalis_state.config),
		|position| {
			worker_ctx.report_progress(JobProgress::subtask_position(
				position as i32,
				path_count as i32,
			));
		},
	)
	.await;

	let OneshotOperationOutput {
		created_media,
		created_series,
		logs: insert_logs,
	} = insert_oneshots(built_oneshots, for_library, worker_ctx).await?;

	let ordered_logs = build_logs.into_iter().chain(insert_logs).collect();
	// ^ just appending insert_logs so they are in roughly the right order of
	// build -> insert, but it isn't really important

	Ok(OneshotOperationOutput {
		created_media,
		created_series,
		logs: ordered_logs,
	})
}

/// A series that was previously scanned as a regular series whose directory now matches
/// the configured oneshots directory name (and thus should be converted)
pub struct PendingOneshotConversion {
	/// The ID of the series to convert into a oneshot
	pub series_id: String,
	/// The books that belong to the series being converted
	pub media: Vec<media::MediaIdentSelect>,
	// ^ note this SHOULD be one, however would be way too much work to really
	// enforce that in a way that is user-friendly and allows someone to
	// choose which is yoinked and which is dumped
}

/// A book that is currently registered as a oneshot series in the database that should be
/// updated to be a normal media item in a non-oneshot series
pub struct PreviousOneshotEntry {
	/// The file path of the book (also the path of the old oneshot series)
	pub book_path: PathBuf,
	/// The ID of the old oneshot series to delete after reassigning its media
	pub old_series_id: String,
}

/// Given a list of series ids which need to be converted into oneshots, collect
/// all media rows for each series and return a map of series-to-books
pub(crate) async fn collect_pending_oneshot_conversions(
	series_ids: Vec<String>,
	conn: &DatabaseConnection,
) -> Result<Vec<PendingOneshotConversion>, CoreError> {
	if series_ids.is_empty() {
		return Ok(vec![]);
	}

	let mut books_by_series =
		HashMap::<String, Vec<MediaIdentSelect>>::with_capacity(series_ids.len());

	let books = media::Entity::find()
		.select_only()
		.columns(MediaIdentSelect::columns())
		.column(media::Column::SeriesId)
		.filter(media::Column::SeriesId.is_in(series_ids.clone()))
		.into_model::<MediaIdentWithSeriesId>()
		.all(conn)
		.await?;

	for book in books {
		books_by_series
			.entry(book.series_id)
			.or_default()
			// TODO(oneshots): technically this would break the oneshot convention, however
			// i really am not sure how to otherwise go about it without a serious fucking headache
			// flow to let the user know X oneshot has Y books and you need to pick which to keep vs delete
			.push(MediaIdentSelect {
				id: book.id,
				path: book.path,
			});
	}

	Ok(books_by_series
		.into_iter()
		.map(|(series_id, media)| PendingOneshotConversion { series_id, media })
		.collect())
}

/// Get a list of entries for converting existing oneshot series into regular media items
/// under a new series. The caller should ensure to only pass in files which
/// actually require conversion, this function makes no such check
pub(crate) async fn collect_previous_oneshot_entries(
	file_paths: Vec<String>,
	conn: &DatabaseConnection,
) -> Result<Vec<PreviousOneshotEntry>, CoreError> {
	if file_paths.is_empty() {
		return Ok(vec![]);
	}

	let mut previous_oneshots = Vec::new();

	for chunks in file_paths.chunks(SQLITE_BIND_LIMIT) {
		let oneshots_to_convert = series::Entity::find()
			.select_only()
			.columns(SeriesIdentSelect::columns())
			.filter(series::Column::IsOneshot.eq(true))
			.filter(series::Column::Path.is_in(chunks.to_vec()))
			.into_model::<SeriesIdentSelect>()
			.all(conn)
			.await?
			.into_iter()
			.map(|s| PreviousOneshotEntry {
				book_path: PathBuf::from(&s.path),
				old_series_id: s.id,
			})
			.collect::<Vec<_>>();
		previous_oneshots.extend(oneshots_to_convert);
	}

	Ok(previous_oneshots)
}

// TODO(soft-delete): this hard deletes media records without explicit user
// approval, which isn't ideal. in fairness here specifically it is rather
// safe, duplicates are deleted with preference to those which have read history
// so most times this happens, which should not even be too common, it should
// work as intended.

/// Delete duplicate books during the oneshot conversion process which share the same
/// path, preferring to keep those with actual reading history to ensure the
/// "correct" record is kept
async fn dedupe_media_by_path<C: ConnectionTrait>(
	conn: &C,
	paths: &[String],
) -> Result<(HashMap<String, media::Model>, u64), DbErr> {
	let mut media_by_path = HashMap::<String, Vec<media::Model>>::new();
	for chunk in paths.chunks(SQLITE_BIND_LIMIT) {
		let records = media::Entity::find()
			.filter(media::Column::Path.is_in(chunk.to_vec()))
			.all(conn)
			.await?;

		for record in records {
			media_by_path
				.entry(record.path.clone())
				.or_default()
				.push(record);
		}
	}

	// not literally ids that are the same but the ids of books
	// which share the same path
	let duplicate_ids: Vec<String> = media_by_path
		.values()
		.filter(|rows| rows.len() > 1)
		.flatten()
		.map(|row| row.id.clone())
		.collect();
	let mut media_ids_with_sessions = HashSet::new();

	for chunk in duplicate_ids.chunks(SQLITE_BIND_LIMIT) {
		let session_ids = reading_session::Entity::find()
			.select_only()
			.column(reading_session::Column::MediaId)
			.distinct()
			.filter(reading_session::Column::MediaId.is_in(chunk.to_vec()))
			.into_tuple::<String>()
			.all(conn)
			.await?;
		media_ids_with_sessions.extend(session_ids);
	}

	let mut kept = HashMap::with_capacity(media_by_path.len());
	let mut to_delete = Vec::new();

	for (path, mut rows) in media_by_path {
		rows.sort_by(|a, b| {
			media_ids_with_sessions
				.contains(&b.id)
				.cmp(&media_ids_with_sessions.contains(&a.id)) // prefer those with history
				.then(a.created_at.cmp(&b.created_at)) // fallback to oldest, prob the original
		});
		let mut rows = rows.into_iter();
		if let Some(keeper) = rows.next() {
			to_delete.extend(rows.map(|row| row.id));
			kept.insert(path, keeper);
		}
	}

	let mut deleted = 0;
	for chunk in to_delete.chunks(SQLITE_BIND_LIMIT) {
		let deleted_count = media::Entity::delete_many()
			.filter(media::Column::Id.is_in(chunk.to_vec()))
			.exec(conn)
			.await?
			.rows_affected;
		deleted += deleted_count;
	}

	if deleted > 0 {
		tracing::warn!(deleted, ?to_delete, "Deleted duplicate media rows");
	}

	Ok((kept, deleted))
}

fn duplicates_log(deleted: u64) -> JobExecuteLog {
	JobExecuteLog::warn(&format!(
		"Removed {deleted} duplicate book record(s) detected during oneshots conversion!"
	))
}

/// Converts a normal series into individual oneshot series entries for each book in it.
/// The old series will be deleted after the conversion, along with any duplicated books
pub(crate) async fn convert_to_oneshot_series(
	old_series_id: &str,
	media_rows: Vec<media::MediaIdentSelect>,
	library_id: &str,
	worker_ctx: &JobContext,
) -> Result<OneshotOperationOutput, JobError> {
	let mut output = OneshotOperationOutput::default();

	if media_rows.is_empty() {
		series::Entity::delete_many()
			.filter(series::Column::Id.eq(old_series_id))
			.exec(worker_ctx.conn())
			.await?;
		return Ok(output);
	}

	let total = media_rows.len();
	tracing::debug!(
		total,
		old_series_id,
		"Converting directory series to oneshots"
	);
	worker_ctx
		.report_progress(JobProgress::msg("Converting series to individual oneshots"));

	let txn = worker_ctx.conn().begin().await?;

	let paths = media_rows
		.iter()
		.map(|row| row.path.clone())
		.collect::<HashSet<_>>()
		.into_iter()
		.collect::<Vec<_>>();
	let (books, deleted_duplicates) = dedupe_media_by_path(&txn, &paths).await?;
	if deleted_duplicates > 0 {
		output.logs.push(duplicates_log(deleted_duplicates));
	}

	let mut existing_oneshots = HashMap::<String, Vec<String>>::new();
	for chunk in paths.chunks(SQLITE_BIND_LIMIT) {
		let series_idents = series::Entity::find()
			.select_only()
			.columns(SeriesIdentSelect::columns())
			.filter(
				series::Column::IsOneshot
					.eq(true)
					.and(series::Column::LibraryId.eq(library_id))
					.and(series::Column::Path.is_in(chunk.to_vec())),
			)
			.into_model::<SeriesIdentSelect>()
			.all(&txn)
			.await?;
		for s in series_idents {
			existing_oneshots.entry(s.path).or_default().push(s.id);
		}
	}

	let total_books = books.len();
	for (idx, (path, book)) in books.into_iter().enumerate() {
		let mut existing = existing_oneshots.remove(&path).unwrap_or_default();
		// prefer the oneshot series the kept book already belongs to, if any
		existing.sort_by_key(|id| Some(id) != book.series_id.as_ref());
		let mut existing = existing.into_iter();

		let target_series_id = match existing.next() {
			Some(id) => id,
			None => {
				let id =
					create_oneshot_series_for(&txn, &path, &book.id, library_id).await?;
				output.created_series += 1;
				id
			},
		};

		media::Entity::update_many()
			.filter(media::Column::Id.eq(&book.id))
			.col_expr(media::Column::SeriesId, Expr::value(target_series_id))
			.col_expr(media::Column::IsOneshot, Expr::value(true))
			.exec(&txn)
			.await?;

		// any other oneshot series at this path lost their media to dedupe and are now empty
		let extra: Vec<String> = existing.collect();
		if !extra.is_empty() {
			tracing::warn!(?extra, "Deleting left over series");
			series::Entity::delete_many()
				.filter(series::Column::Id.is_in(extra))
				.exec(&txn)
				.await?;
		}

		worker_ctx.report_progress(JobProgress::subtask_position(
			(idx + 1) as i32,
			total_books as i32,
		));
	}

	series::Entity::delete_many()
		.filter(series::Column::Id.eq(old_series_id))
		.exec(&txn)
		.await?;

	txn.commit().await?;

	tracing::debug!(
		created_series = output.created_series,
		old_series_id,
		"Finished converting directory series to oneshots"
	);

	Ok(output)
}

/// Creates a oneshot series for the book at `path`, using the book's metadata title (if
/// any) for the series metadata, and returns the new series id
async fn create_oneshot_series_for<C: ConnectionTrait>(
	conn: &C,
	path: &str,
	media_id: &str,
	library_id: &str,
) -> Result<String, DbErr> {
	let id = Uuid::new_v4().to_string();
	let FileParts {
		file_stem: name, ..
	} = PathBuf::from(path).file_parts();

	series::ActiveModel {
		id: Set(id.clone()),
		path: Set(path.to_string()),
		name: Set(name),
		library_id: Set(Some(library_id.to_string())),
		is_oneshot: Set(true),
		status: Set(FileStatus::Ready),
		..Default::default()
	}
	.insert(conn)
	.await?;

	// TODO(sea-orm): nested active model?
	let title = media_metadata::Entity::find()
		.filter(media_metadata::Column::MediaId.eq(media_id))
		.one(conn)
		.await?
		.and_then(|m| m.title);
	if let Some(title) = title {
		let meta = series_metadata::ActiveModel {
			series_id: Set(id.clone()),
			title: Set(Some(title)),
			..Default::default()
		};
		if let Err(error) = meta.insert(conn).await {
			tracing::error!(?error, "Failed to insert series metadata for oneshot");
		}
	}

	Ok(id)
}

/// Output of a series-to-oneshot conversion
#[derive(Default)]
pub(crate) struct SeriesConversionOutput {
	pub updated_media: u64,
	pub deleted_series: u64,
	pub logs: Vec<JobExecuteLog>,
}

/// Converts a oneshot series into regular series and media items. The old oneshot series
/// will be deleted after the conversion.
pub(crate) async fn convert_previous_oneshot_entries_to_series_media(
	new_series_id: &str,
	entries: Vec<PreviousOneshotEntry>,
	conn: &DatabaseConnection,
) -> Result<SeriesConversionOutput, JobError> {
	let mut output = SeriesConversionOutput::default();

	if entries.is_empty() {
		return Ok(output);
	}

	tracing::debug!(
		count = entries.len(),
		new_series_id,
		"Converting oneshots to normal series media"
	);

	let txn = conn.begin().await?;

	let paths: Vec<String> = entries
		.iter()
		.map(|e| e.book_path.to_string_lossy().to_string())
		.collect::<HashSet<_>>()
		.into_iter()
		.collect();
	let (books, deleted_duplicates) = dedupe_media_by_path(&txn, &paths).await?;
	if deleted_duplicates > 0 {
		output.logs.push(duplicates_log(deleted_duplicates));
	}

	let book_ids: Vec<String> = books.into_values().map(|book| book.id).collect();
	for chunk in book_ids.chunks(SQLITE_BIND_LIMIT) {
		output.updated_media += media::Entity::update_many()
			.filter(media::Column::Id.is_in(chunk.to_vec()))
			.col_expr(
				media::Column::SeriesId,
				Expr::value(new_series_id.to_string()),
			)
			.col_expr(media::Column::IsOneshot, Expr::value(false))
			.exec(&txn)
			.await?
			.rows_affected;
	}

	// the old oneshot series are empty now, so deleting them won't cascade to any media
	let old_series_ids: Vec<String> =
		entries.into_iter().map(|e| e.old_series_id).collect();
	for chunk in old_series_ids.chunks(SQLITE_BIND_LIMIT) {
		output.deleted_series += series::Entity::delete_many()
			.filter(series::Column::Id.is_in(chunk.to_vec()))
			.exec(&txn)
			.await?
			.rows_affected;
	}

	txn.commit().await?;

	tracing::debug!(
		updated_media = output.updated_media,
		deleted_series = output.deleted_series,
		"Finished converting oneshots to series media"
	);

	Ok(output)
}

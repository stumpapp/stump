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
		media::{self, MediaIdentSelect},
		media_metadata,
		series::{self, SeriesIdentSelect},
		series_metadata,
	},
	shared::enums::FileStatus,
};
use sea_orm::{
	prelude::*, sea_query::Expr, ActiveValue, QuerySelect, Set, TransactionTrait,
};
use tokio::task::spawn_blocking;
use uuid::Uuid;

use crate::{
	config::StumpConfig,
	database::SQLITE_BIND_LIMIT,
	error::{CoreError, CoreResult},
	event::CreatedMedia,
	filesystem::{
		media::{BuiltMedia, MediaBuilder},
		scanner::{
			tag_cache::TagCache,
			utils::{media::insert_media_in_txn, BuiltEntityFutures},
		},
		series::BuiltSeries,
		FileParts, PathUtils,
	},
	job::{error::JobError, JobContext, JobExecuteLog, JobProgress},
	CoreEvent,
};

struct BuiltOneshot {
	series: BuiltSeries,
	media: BuiltMedia,
}

#[derive(Default)]
pub(crate) struct OneshotOperationOutput {
	pub created_series: u64,
	pub created_media: u64,
	pub logs: Vec<JobExecuteLog>,
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

fn build_oneshot_blocking<P: AsRef<Path>>(
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

	let media = MediaBuilder::new(path, &id.to_string(), library_config, core_config)
		.build()?
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

async fn build_oneshot<P: AsRef<Path>>(
	path: P,
	library_id: &str,
	library_config: library_config::Model,
	core_config: StumpConfig,
) -> CoreResult<BuiltOneshot> {
	let path_buf = path.as_ref().to_path_buf();
	let library_id = library_id.to_string();
	spawn_blocking(move || {
		build_oneshot_blocking(
			&path_buf,
			library_id.as_str(),
			library_config,
			&core_config,
		)
	})
	.await
	.map_err(|e| CoreError::Unknown(e.to_string()))?
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
			build_oneshot(&path, &for_library, library_config_cpy, config_cpy)
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
		let chunk_count = super::MAX_INSERT_CHUNK_SIZE.min(remaining.len());
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
					BuiltMedia {
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
		.columns(media::MediaIdentSelect::columns())
		.column(media::Column::SeriesId)
		.filter(media::Column::SeriesId.is_in(series_ids.clone()))
		.into_model::<media::MediaIdentWithSeriesId>()
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

/// Converts a normal series into individual oneshot series entries for each book in it.
/// The old series will be deleted after the conversion.
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

	for (idx, media_row) in media_rows.iter().enumerate() {
		let new_series_id = Uuid::new_v4().to_string();
		let FileParts {
			file_stem: name, ..
		} = PathBuf::from(&media_row.path).file_parts();

		let media_metadata = media_metadata::Entity::find()
			.filter(media_metadata::Column::MediaId.eq(&media_row.id))
			.one(&txn)
			.await?;

		let series_metadata = match media_metadata.and_then(|m| m.title) {
			Some(title) => Some(series_metadata::ActiveModel {
				series_id: Set(new_series_id.clone()),
				title: Set(Some(title)),
				..Default::default()
			}),
			_ => None,
		};

		let new_series = series::ActiveModel {
			id: Set(new_series_id.clone()),
			path: Set(media_row.path.clone()),
			name: Set(name),
			library_id: Set(Some(library_id.to_string())),
			is_oneshot: Set(true),
			status: Set(FileStatus::Ready),
			..Default::default()
		};
		new_series.insert(&txn).await?;

		if let Some(meta) = series_metadata {
			if let Err(error) = meta.insert(&txn).await {
				tracing::error!(?error, "Failed to insert series metadata for oneshot");
			}
		}

		media::Entity::update_many()
			.filter(media::Column::Id.eq(&media_row.id))
			.col_expr(media::Column::SeriesId, Expr::value(new_series_id))
			.col_expr(media::Column::IsOneshot, Expr::value(true))
			.exec(&txn)
			.await?;

		worker_ctx.report_progress(JobProgress::subtask_position(
			(idx + 1) as i32,
			total as i32,
		));
	}

	series::Entity::delete_many()
		.filter(series::Column::Id.eq(old_series_id))
		.exec(&txn)
		.await?;

	txn.commit().await?;

	output.created_series = total as u64;

	tracing::debug!(
		created_series = output.created_series,
		old_series_id,
		"Finished converting directory series to oneshots"
	);

	Ok(output)
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

	for PreviousOneshotEntry {
		book_path,
		old_series_id,
	} in &entries
	{
		let book_path_str = book_path.to_string_lossy().to_string();

		match media::Entity::update_many()
			.filter(media::Column::Path.eq(&book_path_str))
			.col_expr(
				media::Column::SeriesId,
				Expr::value(new_series_id.to_string()),
			)
			.col_expr(media::Column::IsOneshot, Expr::value(false))
			.exec(&txn)
			.await
		{
			Ok(result) => {
				output.updated_media += result.rows_affected;
			},
			Err(error) => {
				tracing::error!(
					?error,
					?book_path_str,
					"Failed to update media during oneshot-to-series conversion"
				);
				output.logs.push(
					JobExecuteLog::error(format!(
						"Failed to reassign media to series: {}",
						error
					))
					.with_ctx(format!("Path: {book_path_str}")),
				);
				continue;
			},
		}

		if let Err(error) = series::Entity::delete_many()
			.filter(series::Column::Id.eq(old_series_id))
			.exec(&txn)
			.await
		{
			tracing::error!(
				?error,
				old_series_id,
				"Failed to delete oneshot series during conversion"
			);
			output.logs.push(
				JobExecuteLog::error(format!(
					"Failed to delete oneshot series entry: {}",
					error
				))
				.with_ctx(format!("Series ID: {old_series_id}")),
			);
		}
		output.deleted_series += 1;
	}

	txn.commit().await?;

	tracing::debug!(
		updated_media = output.updated_media,
		deleted_series = output.deleted_series,
		"Finished converting oneshots to series media"
	);

	Ok(output)
}

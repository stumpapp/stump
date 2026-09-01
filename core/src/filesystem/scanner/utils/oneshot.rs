use std::{
	collections::{HashSet, VecDeque},
	path::{Path, PathBuf},
	sync::Arc,
	time::Instant,
};

use futures::StreamExt;
use models::{
	entity::{library_config, media, media_metadata, series},
	shared::enums::FileStatus,
};
use sea_orm::{prelude::*, ActiveValue, Set, TransactionTrait};
use tokio::task::spawn_blocking;
use uuid::Uuid;

use crate::{
	config::StumpConfig,
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
		name: Set(name),
		library_id: Set(Some(library_id.to_string())),
		is_oneshot: Set(true),
		status: Set(FileStatus::Ready),
		..Default::default()
	};

	let series = BuiltSeries {
		series,
		// TODO: do we need to read media metadata for this?
		metadata: None,
	};

	let media =
		MediaBuilder::new(path, &id.to_string(), library_config, core_config).build()?;

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

	let ordered_logs = build_logs
		.into_iter()
		.chain(insert_logs.into_iter())
		.collect();
	// ^ just prepending them basically so they are in roughly the right order of
	// build -> insert, but it isn't really important

	Ok(OneshotOperationOutput {
		created_media,
		created_series,
		logs: ordered_logs,
	})
}

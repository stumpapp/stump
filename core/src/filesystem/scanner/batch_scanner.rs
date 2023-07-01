use futures::StreamExt;
use std::{
	sync::{
		atomic::{AtomicU64, Ordering},
		Arc,
	},
	time::Duration,
};
use tracing::{debug, error, trace};

use crate::{
	db::entity::{LibraryOptions, Series},
	error::{CoreError, CoreResult},
	event::CoreEvent,
	filesystem::{
		image::{ThumbnailJob, ThumbnailJobConfig},
		scanner::{
			common::BatchScanOperation,
			setup::{setup_series, SeriesSetup},
			utils::{batch_media_operations, file_updated_since_scan},
		},
		PathUtils,
	},
	job::{utils::persist_job_start, JobUpdate, WorkerCtx},
	Ctx,
};

use super::setup::{setup_library, LibrarySetup};

// TODO: return result...
// TODO: investigate this with LARGE libraries. I am noticing the UI huff and puff a bit
// trying to keep up with the shear amount of updates it gets. I might have to throttle the
// updates to the UI when libraries reach a certain size and send updates in batches instead.
async fn scan_series(
	ctx: Arc<Ctx>,
	series: Series,
	library_path: &str,
	library_options: LibraryOptions,
	mut on_progress: impl FnMut(String) + Send + Sync + 'static,
) -> Vec<BatchScanOperation> {
	debug!(?series, "Scanning series");
	let SeriesSetup {
		mut visited_media,
		media_by_path,
		walkdir,
		glob_set,
	} = setup_series(&ctx, &series, library_path, &library_options).await;

	let mut operations = vec![];
	let iter = walkdir
		.into_iter()
		.filter_map(|e| e.ok())
		.filter(|e| e.path().is_file());
	for entry in iter {
		let path = entry.path();
		let path_str = path.to_str().unwrap_or("");
		trace!(?path, "Scanning file");

		// Tell client we are on the next file, this will increment the counter in the
		// callback, as well.
		on_progress(format!("Analyzing {:?}", path));

		let glob_match = glob_set.is_match(path);

		if path.should_ignore() || glob_match {
			trace!(?path, glob_match, "Skipping ignored file");
			continue;
		} else if visited_media.get(path_str).is_some() {
			trace!(media_path = ?path, "Existing media found");

			let media = media_by_path.get(path_str).unwrap();
			let has_been_modified = if let Some(dt) = media.modified_at.clone() {
				file_updated_since_scan(&entry, dt)
					.map_err(|err| {
						error!(
							error = ?err,
							path = path_str,
							"Failed to determine if entry has been modified since last scan"
						)
					})
					.unwrap_or(false)
			} else {
				false
			};

			// If the file has been modified since the last scan, we need to update it.
			if has_been_modified {
				debug!(?media, "Media file has been modified since last scan");
				operations.push(BatchScanOperation::UpdateMedia(media.clone()));
			}

			*visited_media.entry(path_str.to_string()).or_insert(true) = true;
			continue;
		}

		debug!(series_id = ?series.id, new_media_path = ?path, "New media found in series");
		operations.push(BatchScanOperation::CreateMedia {
			path: path.to_path_buf(),
			series_id: series.id.clone(),
		});
	}

	visited_media
		.into_iter()
		.filter(|(_, visited)| !visited)
		.for_each(|(path, _)| {
			operations.push(BatchScanOperation::MarkMediaMissing { path })
		});

	operations
}

pub async fn scan_library(ctx: WorkerCtx, library_path: String) -> CoreResult<u64> {
	ctx.emit_job_started(0, Some("Preparing library scan".to_string()));

	let core_ctx = ctx.core_ctx.clone();
	let LibrarySetup {
		library,
		library_options,
		library_series,
		tasks,
	} = setup_library(&core_ctx, library_path).await?;

	let job_id = ctx.job_id.clone();
	persist_job_start(&core_ctx, job_id.clone(), tasks).await?;

	// Sleep for a little to let the UI breathe.
	tokio::time::sleep(Duration::from_millis(500)).await;

	let counter = Arc::new(AtomicU64::new(0));
	let future_iter = library_series.into_iter().map(|s| async {
		let progress_ctx = ctx.clone();
		let scanner_ctx = core_ctx.clone();

		let job_id = progress_ctx.job_id().to_string();
		let counter_ref = counter.clone();
		let library_path = library.path.clone();

		let library_options = library_options.clone();
		scan_series(scanner_ctx, s, &library_path, library_options, move |msg| {
			let previous = counter_ref.fetch_add(1, Ordering::SeqCst);
			progress_ctx.emit_progress(JobUpdate::tick(
				job_id.clone(),
				previous + 1,
				tasks,
				Some(msg),
			));
		})
		.await
	});

	let operations = futures::stream::iter(future_iter)
		// Execute up to 10 in parallel
		.buffer_unordered(10)
		.collect::<Vec<_>>()
		.await
		.into_iter()
		.flatten()
		.collect();

	let final_count = counter.load(Ordering::SeqCst);
	let created_media = batch_media_operations(&core_ctx, operations, &library_options)
		.await
		.map_err(|e| {
			error!("Failed to batch media operations: {:?}", e);
			CoreError::InternalError(e.to_string())
		})?;

	if !created_media.is_empty() {
		core_ctx.emit_event(CoreEvent::CreatedMediaBatch(created_media.len() as u64));
	}

	if let Some(options) = library_options.thumbnail_config {
		let dispatch_result = core_ctx.dispatch_job(ThumbnailJob::new(
			options,
			ThumbnailJobConfig::MediaGroup(
				created_media.iter().map(|m| m.id.clone()).collect(),
			),
		));
		if let Err(_) = dispatch_result {
			error!("Failed to dispatch thumbnail job!");
		}
	}

	tokio::time::sleep(Duration::from_millis(500)).await;

	Ok(final_count)
}

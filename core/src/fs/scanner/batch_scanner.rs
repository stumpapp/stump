use std::{
	sync::{
		atomic::{AtomicU64, Ordering},
		Arc,
	},
	time::Duration,
};
use tokio::{self, task::JoinHandle};
use tracing::{debug, error, trace};

use crate::{
	db::models::LibraryOptions,
	event::CoreEvent,
	fs::scanner::{validate, ScannedFileTrait},
	job::{persist_job_start, runner::RunnerCtx, JobUpdate},
	prelude::{CoreError, CoreResult, Ctx},
	prisma::series,
};

// TODO: split the batch vs sync scan into two separate files, it is getting too cluttered in here together I think...

use super::{
	utils::{self, batch_media_operations},
	BatchScanOperation,
};

// Note: if this function signature gets much larger I probably want to refactor it...
// TODO: return result...
// TODO: investigate this with LARGE libraries. I am noticing the UI huff and puff a bit
// trying to keep up with the shear amount of updates it gets. I might have to throttle the
// updates to the UI when libraries reach a certain size and send updates in batches instead.
async fn scan_series(
	ctx: Ctx,
	series: series::Data,
	library_path: &str,
	library_options: LibraryOptions,
	mut on_progress: impl FnMut(String) + Send + Sync + 'static,
) -> Vec<BatchScanOperation> {
	debug!(?series, "Scanning series");
	let (mut visited_media, media_by_path, walkdir, glob_set) =
		utils::setup_series_scan(&ctx, &series, library_path, &library_options).await;

	let mut operations = vec![];
	for entry in walkdir
		.into_iter()
		.filter_map(|e| e.ok())
		.filter(|e| e.path().is_file())
	{
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
			let check_modified_at =
				utils::file_updated_since_scan(&entry, media.modified_at.clone());

			if let Ok(has_been_modified) = check_modified_at {
				// If the file has been modified since the last scan, we need to update it.
				if has_been_modified {
					debug!(?media, "Media file has been modified since last scan");
					// operations.push(BatchScanOperation::UpdateMedia(media.clone()));
				}
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

pub async fn scan(ctx: RunnerCtx, path: String, runner_id: String) -> CoreResult<u64> {
	let core_ctx = ctx.core_ctx.clone();

	ctx.progress(JobUpdate::job_initializing(
		runner_id.clone(),
		Some("Preparing library scan...".to_string()),
	));

	let (library, library_options, series, files_to_process) =
		validate::precheck(&core_ctx, path, &runner_id).await?;

	// Sleep for a little to let the UI breathe.
	tokio::time::sleep(Duration::from_millis(1000)).await;

	let _job = persist_job_start(&core_ctx, runner_id.clone(), files_to_process).await?;

	let counter = Arc::new(AtomicU64::new(0));

	let tasks: Vec<JoinHandle<Vec<BatchScanOperation>>> = series
		.into_iter()
		.map(|s| {
			let progress_ctx = ctx.clone();
			let scanner_ctx = core_ctx.clone();

			let r_id = runner_id.clone();
			let counter_ref = counter.clone();
			let library_path = library.path.clone();

			let library_options = library_options.clone();

			tokio::spawn(async move {
				scan_series(scanner_ctx, s, &library_path, library_options, move |msg| {
					let previous = counter_ref.fetch_add(1, Ordering::SeqCst);

					progress_ctx.progress(JobUpdate::job_progress(
						r_id.to_owned(),
						Some(previous + 1),
						files_to_process,
						Some(msg),
					));
				})
				.await
			})
		})
		.collect();

	let operations: Vec<BatchScanOperation> = futures::future::join_all(tasks)
		.await
		.into_iter()
		// TODO: log errors
		.filter_map(|res| res.ok())
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
		core_ctx
			.emit_client_event(CoreEvent::CreatedMediaBatch(created_media.len() as u64));
	}

	// TODO: change task_count and send progress?
	if library_options.create_webp_thumbnails {
		trace!("Library configured to create WEBP thumbnails.");

		ctx.progress(JobUpdate::job_progress(
			runner_id.clone(),
			Some(final_count),
			files_to_process,
			Some(format!(
				"Creating {} WEBP thumbnails (this can take some time)",
				created_media.len()
			)),
		));

		// sleep for a bit to let client catch up
		tokio::time::sleep(Duration::from_millis(50)).await;

		// FIXME: dao
		// if let Err(err) = image::generate_thumbnails(created_media) {
		// 	error!("Failed to generate thumbnails: {:?}", err);
		// }
	}

	ctx.progress(JobUpdate::job_finishing(
		runner_id,
		Some(final_count),
		files_to_process,
		None,
	));
	tokio::time::sleep(Duration::from_millis(1000)).await;

	Ok(final_count)
}

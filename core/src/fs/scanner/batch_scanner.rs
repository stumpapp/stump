use globset::GlobSetBuilder;
use itertools::Itertools;
use prisma_client_rust::chrono::{DateTime, Utc};
use std::{
	collections::HashMap,
	path::Path,
	sync::{
		atomic::{AtomicU64, Ordering},
		Arc,
	},
	time::{Duration, SystemTime},
};
use tokio::{self, task::JoinHandle};
use tracing::{debug, error, trace};
use walkdir::WalkDir;

use crate::{
	db::models::{LibraryOptions, Media},
	event::CoreEvent,
	fs::scanner::{validate, ScannedFileTrait},
	job::{persist_job_start, runner::RunnerCtx, JobUpdate},
	prelude::{CoreError, CoreResult, Ctx},
	prisma::{media, series},
};

// TODO: split the batch vs sync scan into two separate files, it is getting too cluttered in here together I think...

use super::{
	utils::{batch_media_operations, populate_glob_builder},
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
	let db = ctx.get_db();

	let series_ignore_file = Path::new(series.path.as_str()).join(".stumpignore");
	let library_ignore_file = Path::new(library_path).join(".stumpignore");

	let media = db
		.media()
		.find_many(vec![media::series_id::equals(Some(series.id.clone()))])
		.exec()
		.await
		.unwrap_or_else(|e| {
			error!("Error occurred trying to fetch media for series: {}", e);
			vec![]
		});

	let mut visited_media = HashMap::with_capacity(media.len());
	let mut media_by_path = HashMap::with_capacity(media.len());
	for m in media {
		visited_media.insert(m.path.clone(), false);
		media_by_path.insert(m.path.clone(), Media::from(m));
	}

	let mut operations = vec![];

	let mut walkdir = WalkDir::new(&series.path);

	let is_collection_based = library_options.is_collection_based();

	if !is_collection_based || series.path == library_path {
		walkdir = walkdir.max_depth(1);
	}

	let mut builder = GlobSetBuilder::new();

	if series_ignore_file.exists() || library_ignore_file.exists() {
		populate_glob_builder(
			&mut builder,
			vec![series_ignore_file, library_ignore_file]
				.into_iter()
				// We have to remove duplicates here otherwise the glob will double some patterns.
				// An example would be when the library has media in root. Not the end of the world.
				.unique()
				.filter(|p| p.exists())
				.collect::<Vec<_>>()
				.as_slice(),
		);
	}

	// TODO: make this an error to enforce correct glob patterns in an ignore file.
	// This way, no scan will ever add things a user wants to ignore.
	let glob_set = builder.build().unwrap_or_default();

	for entry in walkdir
		.into_iter()
		.filter_map(|e| e.ok())
		.filter(|e| e.path().is_file())
	{
		let path = entry.path();
		let path_str = path.to_str().unwrap_or("");
		debug!(path = ?path, "Scanning file");

		// Tell client we are on the next file, this will increment the counter in the
		// callback, as well.
		on_progress(format!("Analyzing {:?}", path));

		let glob_match = glob_set.is_match(path);
		// println!("Path: {:?} -> Matches: {}", path, glob_match);

		if path.should_ignore() || glob_match {
			trace!(path = ?path, glob_match = glob_match, "Skipping ignored file");
			continue;
		} else if visited_media.get(path_str).is_some() {
			debug!(media_path = ?path, "Existing media found");

			// TODO: this really shouldn't be a problem, buttttttt i guess isn't best practice
			let media = media_by_path.get(path_str).unwrap();
			// TODO: parse into util function
			if let Ok(Ok(system_time)) = entry.metadata().map(|m| m.modified()) {
				let media_modified_at = media
					.modified_at
					.parse::<DateTime<Utc>>()
					.unwrap_or_else(|_| SystemTime::now().into());
				let system_time_converted: DateTime<Utc> = system_time.into();

				trace!(
					system_time_converted = ?system_time_converted,
					media_modified_at = ?media_modified_at,
				);

				// If the file has been modified since the last scan, we need to update it.
				if system_time_converted > media_modified_at {
					debug!(path = ?path, "Media has been modified since last scan");
					// operations.push(BatchScanOperation::UpdateMedia(media.clone()));
				}
			} else {
				error!(
					path = ?path,
					"Error occurred trying to read modified date for media",
				);
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

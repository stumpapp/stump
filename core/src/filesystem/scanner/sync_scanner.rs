use std::{
	sync::{
		atomic::{AtomicU64, Ordering},
		Arc,
	},
	time::Duration,
};
use tracing::{debug, error, trace, warn};

use crate::{
	db::{
		entity::{LibraryOptions, Media, MediaBuilder, MediaBuilderOptions, Series},
		MediaDAO, DAO,
	},
	error::CoreResult,
	event::CoreEvent,
	filesystem::{
		scanner::{
			setup::{setup_series, SeriesSetup},
			utils,
		},
		PathUtils,
	},
	job::{utils::persist_job_start, JobUpdate, WorkerCtx},
	Ctx,
};

use super::setup::{setup_library, LibrarySetup};

async fn scan_series(
	ctx: Arc<Ctx>,
	job_id: String,
	series: Series,
	library_path: &str,
	library_options: LibraryOptions,
	mut on_progress: impl FnMut(String) + Send + Sync + 'static,
) {
	debug!(?series, "Scanning series");
	let SeriesSetup {
		mut visited_media,
		media_by_path,
		walkdir,
		glob_set,
	} = setup_series(&ctx, &series, library_path, &library_options).await;
	let media_dao = MediaDAO::new(ctx.db.clone());

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
			if let Some(modified_at) = media.modified_at.clone() {
				let result = utils::file_updated_since_scan(&entry, modified_at);

				if let Ok(has_been_modified) = result {
					// If the file has been modified since the last scan, we need to update it.
					if has_been_modified {
						debug!(?media, "Media file has been modified since last scan");
						// TODO: do something with media_updates
						warn!(
							outdated_media = ?media,
							"Stump does not support updating media entities yet",
						);
					}
				}
			}

			*visited_media.entry(path_str.to_string()).or_insert(true) = true;
			continue;
		}

		trace!(series_id = ?series.id, new_media_path = ?path, "New media found in series");
		let build_result = Media::build_with_options(
			path,
			MediaBuilderOptions {
				series_id: series.id.clone(),
				library_options: library_options.clone(),
			},
		);
		if let Ok(generated) = build_result {
			match media_dao.create(generated).await {
				Ok(created_media) => {
					visited_media.insert(created_media.path.clone(), true);
					ctx.emit_event(CoreEvent::CreatedMedia(Box::new(created_media)));
				},
				Err(e) => {
					error!(error = ?e, "Failed to create media");
					ctx.handle_failure_event(CoreEvent::CreateEntityFailed {
						job_id: Some(job_id.clone()),
						path: path.to_str().unwrap_or_default().to_string(),
						message: e.to_string(),
					})
					.await;
				},
			}
		} else {
			error!(error = ?build_result.err(), "Failed to build media");
			continue;
		}
	}

	let missing_media = visited_media
		.into_iter()
		.filter(|(_, visited)| !visited)
		.map(|(path, _)| path)
		.collect::<Vec<String>>();

	if !missing_media.is_empty() {
		warn!(
			missing_paths = ?missing_media,
			"Some paths were not visited during series scan"
		);
		let result = media_dao.mark_paths_missing(missing_media).await;

		if let Err(err) = result {
			error!(error = ?err, "Error trying to mark missing media");
		} else {
			debug!(
				affected_rows = result.unwrap_or_default(),
				"Marked missing media"
			);
		}
	}
}

pub async fn scan_library(ctx: WorkerCtx, path: String) -> CoreResult<u64> {
	ctx.emit_job_started(0, Some("Preparing library scan".to_string()));

	let core_ctx = ctx.core_ctx.clone();
	let LibrarySetup {
		library,
		library_options,
		library_series,
		tasks,
	} = setup_library(&core_ctx, path).await?;

	let job_id = ctx.job_id.clone();
	persist_job_start(&core_ctx, job_id.clone(), tasks).await?;

	// Sleep for a little to let the UI breathe.
	tokio::time::sleep(Duration::from_millis(500)).await;

	let counter = Arc::new(AtomicU64::new(0));
	for series in library_series {
		let progress_ctx = ctx.clone();
		let scanner_ctx = core_ctx.clone();

		let job_id = progress_ctx.job_id().to_string();
		let counter_ref = counter.clone();
		let library_path = library.path.clone();
		// Note: I don't ~love~ having to clone this struct each iteration. I think it's fine for now,
		// considering it consists of just a few booleans.
		let library_options = library_options.clone();

		scan_series(
			scanner_ctx,
			job_id.clone(),
			series,
			&library_path,
			library_options,
			move |msg| {
				let previous = counter_ref.fetch_add(1, Ordering::SeqCst);
				progress_ctx.emit_progress(JobUpdate::tick(
					job_id.clone(),
					previous + 1,
					tasks,
					Some(msg),
				));
			},
		)
		.await;
	}

	tokio::time::sleep(Duration::from_millis(500)).await;

	Ok(counter.load(Ordering::SeqCst))
}

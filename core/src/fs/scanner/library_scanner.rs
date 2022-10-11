use globset::GlobSetBuilder;
use itertools::Itertools;
use rayon::prelude::{ParallelBridge, ParallelIterator};
use std::{
	collections::HashMap,
	path::Path,
	sync::{
		atomic::{AtomicU64, Ordering},
		Arc,
	},
	time::Duration,
};
use tokio::{self, task::JoinHandle};
use tracing::{debug, error, trace, warn};
use walkdir::{DirEntry, WalkDir};

use crate::{
	config::context::Ctx,
	event::CoreEvent,
	fs::{
		image,
		scanner::{
			utils::{insert_series_batch, mark_media_missing},
			ScannedFileTrait,
		},
	},
	job::{persist_job_start, runner::RunnerCtx, JobUpdate},
	prisma::{library, media, series},
	types::{
		enums::FileStatus, errors::CoreError, models::library::LibraryOptions,
		CoreResult, LibraryScanMode,
	},
};

use super::{
	utils::{batch_media_operations, mark_library_missing, populate_glob_builder},
	BatchScanOperation,
};

// FIXME: clean up usage of Ctx vs RunnerCtx... It can get confusing.

// TODO: take in bottom up or top down scan option
fn check_series(
	library_path: &str,
	series: Vec<series::Data>,
	library_options: &LibraryOptions,
) -> (Vec<series::Data>, Vec<String>, Vec<DirEntry>) {
	let series_map = series
		.iter()
		.map(|data| (data.path.as_str(), false))
		.collect::<HashMap<&str, bool>>();

	let missing_series = series
		.iter()
		.filter(|s| {
			let path = Path::new(&s.path);
			!path.exists()
		})
		.map(|s| s.id.clone())
		.collect::<Vec<String>>();

	let mut walkdir = WalkDir::new(library_path);

	let is_collection_based = library_options.is_collection_based();

	if is_collection_based {
		walkdir = walkdir.max_depth(1);
	}

	let new_entries = walkdir
		// Set min_depth to 0 so we include the library path itself,
		// which allows us to add it as a series when there are media items in it
		.min_depth(0)
		.into_iter()
		.filter_entry(|e| e.path().is_dir())
		.filter_map(|e| e.ok())
		.par_bridge()
		.filter(|entry| {
			let path = entry.path();

			let path_str = path.as_os_str().to_string_lossy().to_string();

			if is_collection_based && path_str != library_path {
				// If we're doing a top level scan, we need to check that the path
				// has media deeply nested. Exception for when the path is the library path,
				// then we only need to check if it has media in it directly
				path.dir_has_media_deep() && !series_map.contains_key(path_str.as_str())
			} else {
				// If we're doing a bottom up scan, we need to check that the path has
				// media directly in it.
				path.dir_has_media() && !series_map.contains_key(path_str.as_str())
			}
		})
		.collect::<Vec<DirEntry>>();

	(series, missing_series, new_entries)
}

/// Queries the database for the library by the given `path` and performs basic
/// checks to ensure the library is in a valid state for scanning. Returns the
/// library itself, its series, and the number of files that will be processed.
async fn precheck(
	ctx: &Ctx,
	path: String,
	runner_id: &str,
) -> CoreResult<(library::Data, LibraryOptions, Vec<series::Data>, u64)> {
	let db = ctx.get_db();

	let library = db
		.library()
		.find_unique(library::path::equals(path.clone()))
		.with(library::series::fetch(vec![]))
		.with(library::library_options::fetch())
		.exec()
		.await?;

	if library.is_none() {
		return Err(CoreError::NotFound(format!("Library not found: {}", path)));
	}

	let library = library.unwrap();

	if !Path::new(&path).exists() {
		mark_library_missing(library, ctx).await?;

		return Err(CoreError::FileNotFound(format!(
			"Library path does not exist in fs: {}",
			path
		)));
	}

	let library_options: LibraryOptions = library
		.library_options()
		.map(|o| o.into())
		.unwrap_or_default();

	let series = library.series()?.to_owned();

	let (mut series, missing_series_ids, new_entries) =
		check_series(&path, series, &library_options);

	if !missing_series_ids.is_empty() {
		ctx.db
			.series()
			.update_many(
				vec![series::id::in_vec(missing_series_ids)],
				vec![series::status::set(FileStatus::Missing.to_string())],
			)
			.exec()
			.await?;
	}

	if !new_entries.is_empty() {
		trace!("Found {} new series", new_entries.len());

		let insertion_result =
			insert_series_batch(ctx, new_entries, library.id.clone()).await;

		if let Err(e) = insertion_result {
			error!("Failed to batch insert series: {}", e);

			ctx.emit_client_event(CoreEvent::CreateEntityFailed {
				runner_id: Some(runner_id.to_string()),
				message: format!("Failed to batch insert series: {}", e),
				path: path.clone(),
			});
		} else {
			let mut inserted_series = insertion_result.unwrap();

			ctx.emit_client_event(CoreEvent::CreatedSeriesBatch(
				inserted_series.len() as u64
			));

			series.append(&mut inserted_series);
		}
	}

	let start = std::time::Instant::now();

	let is_collection_based = library_options.is_collection_based();

	// TODO: perhaps use rayon instead...?
	// TODO: check this to see if it is still correct after adding the collection based
	// vs series based options
	let files_to_process: u64 = futures::future::join_all(
		series
			.iter()
			.map(|data| {
				let path = data.path.clone();

				let mut series_walkdir = WalkDir::new(&path);

				// When the series is the library itself, we want to set the max_depth
				// to 1 so it doesn't walk through the entire library (effectively doubling
				// the return result, instead of the actual number of files to process)
				if !is_collection_based || path == library.path {
					series_walkdir = series_walkdir.max_depth(1)
				}

				tokio::task::spawn_blocking(move || {
					series_walkdir
						.into_iter()
						.filter_map(|e| e.ok())
						.filter(|e| e.path().is_file())
						.count() as u64
				})
			})
			.collect::<Vec<JoinHandle<u64>>>(),
	)
	.await
	.into_iter()
	.filter_map(|res| res.ok())
	.sum();

	let duration = start.elapsed();

	debug!(
		"Files to process: {:?} (calculated in {}.{:03} seconds)",
		files_to_process,
		duration.as_secs(),
		duration.subsec_millis()
	);

	Ok((library, library_options, series, files_to_process))
}

async fn scan_series(
	ctx: Ctx,
	runner_id: String,
	series: series::Data,
	library_path: &str,
	library_options: LibraryOptions,
	mut on_progress: impl FnMut(String) + Send + Sync + 'static,
) {
	let db = ctx.get_db();

	let series_ignore_file = Path::new(series.path.as_str()).join(".stumpignore");
	let library_ignore_file = Path::new(library_path).join(".stumpignore");

	let media = db
		.media()
		.find_many(vec![media::series_id::equals(Some(series.id.clone()))])
		.exec()
		.await
		.unwrap();

	let mut visited_media = media
		.iter()
		.map(|data| (data.path.clone(), false))
		.collect::<HashMap<String, bool>>();

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
				.unique()
				.filter(|p| p.exists())
				.collect::<Vec<_>>()
				.as_slice(),
		);
	}

	// TODO: make this an error to enforce correct glob patterns in an ignore file.
	// This way, no scan will ever add things a user wants to ignore.
	let glob_set = builder.build().unwrap();

	for entry in walkdir
		.into_iter()
		.filter_map(|e| e.ok())
		.filter(|e| e.path().is_file())
	{
		let path = entry.path();
		let path_str = path.to_str().unwrap_or("");

		debug!("Currently scanning: {:?}", path);

		// Tell client we are on the next file, this will increment the counter in the
		// callback, as well.
		on_progress(format!("Analyzing {:?}", path));

		let glob_match = glob_set.is_match(path);
		// println!("Path: {:?} -> Matches: {}", path, glob_match);

		if path.should_ignore() || glob_match {
			trace!("Skipping ignored file: {:?}", path);
			trace!("Globbed ignore?: {}", glob_match);
			continue;
		} else if visited_media.get(path_str).is_some() {
			debug!("Existing media found: {:?}", path);
			*visited_media.entry(path_str.to_string()).or_insert(true) = true;
			continue;
		}

		debug!("New media found at {:?} in series {:?}", &path, &series.id);

		match super::utils::insert_media(&ctx, path, series.id.clone(), &library_options)
			.await
		{
			Ok(media) => {
				visited_media.insert(media.path.clone(), true);

				ctx.emit_client_event(CoreEvent::CreatedMedia(media.clone()));
			},
			Err(e) => {
				error!("Failed to insert media: {:?}", e);

				ctx.handle_failure_event(CoreEvent::CreateEntityFailed {
					runner_id: Some(runner_id.clone()),
					path: path.to_str().unwrap_or_default().to_string(),
					message: e.to_string(),
				})
				.await;
			},
		}
	}

	let missing_media = visited_media
		.into_iter()
		.filter(|(_, visited)| !visited)
		.map(|(path, _)| path)
		.collect::<Vec<String>>();

	if missing_media.is_empty() {
		warn!(
			"{} media were unable to be located during scan.",
			missing_media.len(),
		);

		debug!("Missing media paths: {:?}", missing_media);

		let result = mark_media_missing(&ctx, missing_media).await;

		if let Err(err) = result {
			error!("Failed to mark media as MISSING: {:?}", err);
		} else {
			debug!("Marked {} media as MISSING", result.unwrap());
		}
	}
}

// Note: if this function signature gets much larger I probably want to refactor it...
// TODO: return result...
// TODO: investigate this with LARGE libraries. I am noticing the UI huff and puff a bit
// trying to keep up with the shear amount of updates it gets. I might have to throttle the
// updates to the UI when libraries reach a certain size and send updates in batches instead.
async fn scan_series_batch(
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
		.unwrap();

	let mut visited_media = media
		.iter()
		.map(|data| (data.path.clone(), false))
		.collect::<HashMap<String, bool>>();

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

		debug!("Currently scanning: {:?}", path);

		// Tell client we are on the next file, this will increment the counter in the
		// callback, as well.
		on_progress(format!("Analyzing {:?}", path));

		let glob_match = glob_set.is_match(path);
		// println!("Path: {:?} -> Matches: {}", path, glob_match);

		if path.should_ignore() || glob_match {
			trace!("Skipping ignored file: {:?}", path);
			trace!("Globbed ignore?: {}", glob_match);
			continue;
		} else if visited_media.get(path_str).is_some() {
			debug!("Existing media found: {:?}", path);
			*visited_media.entry(path_str.to_string()).or_insert(true) = true;
			continue;
		}

		debug!("New media found at {:?} in series {:?}", &path, &series.id);

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

pub async fn scan_batch(
	ctx: RunnerCtx,
	path: String,
	runner_id: String,
) -> CoreResult<u64> {
	let core_ctx = ctx.core_ctx.clone();

	ctx.progress(JobUpdate::job_initializing(
		runner_id.clone(),
		Some("Preparing library scan...".to_string()),
	));

	let (library, library_options, series, files_to_process) =
		precheck(&core_ctx, path, &runner_id).await?;
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
				scan_series_batch(
					scanner_ctx,
					s,
					&library_path,
					library_options,
					move |msg| {
						let previous = counter_ref.fetch_add(1, Ordering::SeqCst);

						progress_ctx.progress(JobUpdate::job_progress(
							r_id.to_owned(),
							Some(previous + 1),
							files_to_process,
							Some(msg),
						));
					},
				)
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

		if let Err(err) = image::generate_thumbnails(created_media) {
			error!("Failed to generate thumbnails: {:?}", err);
		}
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

pub async fn scan_sync(
	ctx: RunnerCtx,
	path: String,
	runner_id: String,
) -> CoreResult<u64> {
	let core_ctx = ctx.core_ctx.clone();

	let (library, library_options, series, files_to_process) =
		precheck(&core_ctx, path, &runner_id).await?;

	// TODO: I am not sure if jobs should fail when the job fails to persist to DB.
	let _job = persist_job_start(&core_ctx, runner_id.clone(), files_to_process).await?;

	ctx.progress(JobUpdate::job_started(
		runner_id.clone(),
		0,
		files_to_process,
		Some(format!("Starting library scan at {}", &library.path)),
	));

	let counter = Arc::new(AtomicU64::new(0));

	for s in series {
		let progress_ctx = ctx.clone();
		let scanner_ctx = core_ctx.clone();
		let r_id = runner_id.clone();

		let counter_ref = counter.clone();
		let runner_id = runner_id.clone();
		let library_path = library.path.clone();
		// Note: I don't ~love~ having to clone this struct each iteration. I think it's fine for now,
		// considering it consists of just a few booleans.
		let library_options = library_options.clone();

		scan_series(
			scanner_ctx,
			runner_id,
			s,
			&library_path,
			library_options,
			move |msg| {
				let previous = counter_ref.fetch_add(1, Ordering::SeqCst);

				progress_ctx.progress(JobUpdate::job_progress(
					r_id.to_owned(),
					Some(previous + 1),
					files_to_process,
					Some(msg),
				));
			},
		)
		.await;
	}

	ctx.progress(JobUpdate::job_finishing(
		runner_id,
		Some(counter.load(Ordering::SeqCst)),
		files_to_process,
		None,
	));
	tokio::time::sleep(Duration::from_millis(1000)).await;

	Ok(counter.load(Ordering::SeqCst))
}

pub async fn scan(
	ctx: RunnerCtx,
	path: String,
	runner_id: String,
	scan_mode: LibraryScanMode,
) -> CoreResult<u64> {
	match scan_mode {
		LibraryScanMode::Batched => scan_batch(ctx, path, runner_id).await,
		LibraryScanMode::Sync => scan_sync(ctx, path, runner_id).await,
		_ => unreachable!("A job should not have reached this point if the scan mode is not batch or sync."),
	}
}

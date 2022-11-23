use std::{collections::HashMap, path::Path};

use rayon::prelude::{ParallelBridge, ParallelIterator};
use tokio::task::JoinHandle;
use tracing::{debug, error, trace};
use walkdir::{DirEntry, WalkDir};

use crate::{
	db::models::LibraryOptions,
	event::CoreEvent,
	fs::scanner::utils,
	prelude::{CoreError, CoreResult, Ctx, FileStatus},
	prisma::{library, series},
};

use super::ScannedFileTrait;

pub(crate) fn check_series(
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
pub(crate) async fn precheck(
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
		utils::mark_library_missing(library, ctx).await?;

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
			utils::insert_series_batch(ctx, new_entries, library.id.clone()).await;

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

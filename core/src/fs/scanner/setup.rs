use std::{collections::HashMap, path::Path};

use globset::{GlobSet, GlobSetBuilder};
use itertools::Itertools;
use rayon::prelude::{ParallelBridge, ParallelIterator};
use tokio::task::JoinHandle;
use tracing::{debug, error, trace};
use walkdir::{DirEntry, WalkDir};

use crate::{
	db::{
		models::{LibraryOptions, Media},
		Dao, SeriesDao, SeriesDaoImpl,
	},
	event::CoreEvent,
	fs::scanner::utils::{insert_series_batch, mark_library_missing},
	prelude::{CoreError, CoreResult, Ctx, FileStatus},
	prisma::{library, series},
};

use super::{utils::populate_glob_builder, ScannedFileTrait};

pub struct LibrarySetup {
	pub library: library::Data,
	pub library_options: LibraryOptions,
	pub library_series: Vec<series::Data>,
	pub tasks: u64,
}

pub(crate) async fn setup_library(ctx: &Ctx, path: String) -> CoreResult<LibrarySetup> {
	let start = std::time::Instant::now();

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
		.map(LibraryOptions::from)
		.unwrap_or_default();

	let is_collection_based = library_options.is_collection_based();
	let series = setup_library_series(ctx, &library, is_collection_based).await?;

	let is_collection_based = library_options.is_collection_based();
	let tasks: u64 = futures::future::join_all(
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
	let seconds = duration.as_secs();
	let setup_time = format!("{seconds}.{:03} seconds", duration.subsec_millis());

	debug!(
		task_count = tasks,
		?setup_time,
		"Scan setup for library completed"
	);

	Ok(LibrarySetup {
		library,
		library_options,
		library_series: series,
		tasks,
	})
}

async fn setup_library_series(
	ctx: &Ctx,
	library: &library::Data,
	is_collection_based: bool,
) -> CoreResult<Vec<series::Data>> {
	let library_path = library.path.clone();
	let mut series = library.series()?.to_owned();
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

	let mut walkdir = WalkDir::new(library_path.as_str());

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

	if !missing_series.is_empty() {
		ctx.db
			.series()
			.update_many(
				vec![series::id::in_vec(missing_series)],
				vec![series::status::set(FileStatus::Missing.to_string())],
			)
			.exec()
			.await?;
	}

	if !new_entries.is_empty() {
		trace!(new_series_count = new_entries.len(), "Inserting new series");
		// TODO: replace with dao?
		let result = insert_series_batch(ctx, new_entries, library.id.clone()).await;
		if let Err(e) = result {
			error!("Failed to batch insert series: {}", e);

		// TODO: uncomment once ctx has runner_id
		// ctx.emit_client_event(CoreEvent::CreateEntityFailed {
		// 	runner_id: Some(runner_id.to_string()),
		// 	message: format!("Failed to batch insert series: {}", e),
		// 	path: library_path.clone(),
		// });
		} else {
			let mut inserted_series = result.unwrap();
			ctx.emit_client_event(CoreEvent::CreatedSeriesBatch(
				inserted_series.len() as u64
			));
			series.append(&mut inserted_series);
		}
	}

	Ok(series)
}

pub struct SeriesSetup {
	pub visited_media: HashMap<String, bool>,
	pub media_by_path: HashMap<String, Media>,
	pub walkdir: WalkDir,
	pub glob_set: GlobSet,
}

pub(crate) async fn setup_series(
	ctx: &Ctx,
	series: &series::Data,
	library_path: &str,
	library_options: &LibraryOptions,
) -> SeriesSetup {
	let series_dao = SeriesDaoImpl::new(ctx.db.clone());
	let series_ignore_file = Path::new(series.path.as_str()).join(".stumpignore");
	let library_ignore_file = Path::new(library_path).join(".stumpignore");

	let media = series_dao
		.get_series_media(series.id.as_str())
		.await
		.unwrap_or_else(|e| {
			error!(error = ?e, "Error occurred trying to fetch media for series");
			vec![]
		});

	let mut visited_media = HashMap::with_capacity(media.len());
	let mut media_by_path = HashMap::with_capacity(media.len());
	for m in media {
		visited_media.insert(m.path.clone(), false);
		media_by_path.insert(m.path.clone(), m);
	}

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

	SeriesSetup {
		visited_media,
		media_by_path,
		walkdir,
		glob_set,
	}
}

use std::{collections::HashMap, path::Path};

use globset::{GlobSet, GlobSetBuilder};
use itertools::Itertools;
use rayon::prelude::{ParallelBridge, ParallelIterator};
use tracing::{debug, error};
use walkdir::{DirEntry, WalkDir};

use crate::{
	db::{
		entity::{common::FileStatus, LibraryOptions, Media, Series},
		SeriesDAO, DAO,
	},
	error::CoreResult,
	event::CoreEvent,
	filesystem::PathUtils,
	prisma::{library, media, series},
	Ctx,
};

use super::common::populate_glob_builder;

pub struct LibrarySetup {
	pub library: library::Data,
	pub library_options: LibraryOptions,
	pub library_series: Vec<Series>,
	pub tasks: u64,
}

pub async fn setup_library_series(
	ctx: &Ctx,
	library: &library::Data,
	is_collection_based: bool,
) -> CoreResult<Vec<Series>> {
	let library_path = library.path.clone();
	let mut series = library
		.series()?
		.iter()
		.map(|s| Series::from(s.to_owned()))
		.collect::<Vec<_>>();
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
		// trace!(new_series_count = new_entries.len(), "Inserting new series");
		let series_dao = SeriesDAO::new(ctx.db.clone());
		let series_to_create = new_entries
			.iter()
			.map(|e| Series::try_from_entry(&library.id, e))
			.filter_map(|res| {
				if let Err(e) = res {
					error!(error = ?e, "Failed to create series from entry");
					None
				} else {
					res.ok()
				}
			})
			.collect();
		let result = series_dao.create_many(series_to_create).await;
		match result {
			Ok(mut created_series) => {
				ctx.emit_event(
					CoreEvent::CreatedSeriesBatch(created_series.len() as u64),
				);
				series.append(&mut created_series);
			},
			Err(e) => {
				error!(error = ?e, "Failed to batch insert series");
			},
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
	series: &Series,
	library_path: &str,
	library_options: &LibraryOptions,
) -> SeriesSetup {
	let series_ignore_file = Path::new(series.path.as_str()).join(".stumpignore");
	let library_ignore_file = Path::new(library_path).join(".stumpignore");

	let media = ctx
		.db
		.media()
		.find_many(vec![media::series_id::equals(Some(series.id.clone()))])
		.exec()
		.await
		.unwrap_or_else(|e| {
			error!(error = ?e, "Error occurred trying to fetch media for series");
			vec![]
		});

	let mut visited_media = HashMap::with_capacity(media.len());
	let mut media_by_path = HashMap::with_capacity(media.len());
	for m in media {
		visited_media.insert(m.path.clone(), false);
		media_by_path.insert(m.path.clone(), Media::from(m));
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

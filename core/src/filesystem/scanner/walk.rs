use std::{
	collections::HashMap,
	path::{Path, PathBuf},
	sync::Arc,
};

use globset::GlobSet;
use itertools::{Either, Itertools};
use rayon::iter::{IntoParallelIterator, ParallelBridge, ParallelIterator};
use walkdir::{DirEntry, WalkDir};

use crate::{
	db::entity::Media,
	filesystem::{scanner::utils::file_updated_since_scan, PathUtils},
	prisma::{media, series, PrismaClient},
	CoreResult,
};

pub struct WalkerCtx {
	pub db: Arc<PrismaClient>,
	pub ignore_rules: GlobSet,
	// Will be 1 if the library is collection based, None
	pub max_depth: Option<usize>,
}

#[derive(Default)]
pub struct WalkedLibrary {
	pub seen_files: u64,
	pub ignored_files: u64,
	pub series_to_create: Vec<PathBuf>,
	pub series_to_visit: Vec<PathBuf>,
	pub missing_series: Vec<PathBuf>,
	pub library_is_missing: bool,
}

impl WalkedLibrary {
	fn missing() -> Self {
		Self {
			library_is_missing: true,
			..Default::default()
		}
	}
}

pub async fn walk_library(path: &str, ctx: WalkerCtx) -> CoreResult<WalkedLibrary> {
	let library_is_missing = !PathBuf::from(path).exists();
	if library_is_missing {
		tracing::error!("Failed to walk: {} is missing or inaccessible", path);
		return Ok(WalkedLibrary::missing());
	}

	let WalkerCtx {
		db,
		ignore_rules,
		max_depth,
	} = ctx;

	let mut walkdir = WalkDir::new(path);
	if let Some(num) = max_depth {
		walkdir = walkdir.max_depth(num);
	}

	let walk_start = std::time::Instant::now();
	tracing::debug!("Walking library at {}", path);

	let is_collection_based = max_depth.is_some_and(|d| d == 1);
	let (valid_entries, ignored_entries) = walkdir
		// Set min_depth to 0 so we include the library path itself,
		// which allows us to add it as a series when there are media items in it
		.min_depth(0)
		.into_iter()
		.filter_entry(|e| e.path().is_dir())
		.filter_map(|e| e.ok())
		.par_bridge()
		.partition_map::<Vec<DirEntry>, Vec<DirEntry>, _, _, _>(|entry| {
			let entry_path = entry.path();
			let entry_path_str = entry_path.as_os_str().to_string_lossy().to_string();
			let check_deep = is_collection_based && entry_path_str != path;

			if ignore_rules.is_match(entry.path()) {
				Either::Right(entry)
			} else if check_deep && entry_path.dir_has_media_deep() {
				// If we're doing a top level scan, we need to check that the path
				// has media deeply nested. Exception for when the path is the library path,
				// then we only need to check if it has media in it directly
				Either::Left(entry)
			} else if !check_deep && entry_path.dir_has_media() {
				// If we're doing a bottom up scan, we need to check that the path has
				// media directly in it.
				Either::Left(entry)
			} else {
				Either::Right(entry)
			}
		});

	let ignored_files = ignored_entries.len() as u64;
	let seen_files = valid_entries.len() as u64 + ignored_files;

	tracing::debug!(
		seen_files,
		ignored_entries = ignored_entries.len(),
		"Walk finished in {}ms",
		walk_start.elapsed().as_millis()
	);

	let computation_start = std::time::Instant::now();
	let (series_to_create, missing_series, series_to_visit) = {
		let existing_records = db
			.series()
			.find_many(vec![series::path::in_vec(
				valid_entries
					.iter()
					.map(|e| e.path().to_string_lossy().to_string())
					.collect(),
			)])
			.exec()
			.await?;

		let existing_series_map = existing_records
			.into_iter()
			.map(|s| (s.path.clone(), s.to_owned()))
			.collect::<HashMap<String, _>>();

		let missing_series = existing_series_map
			.iter()
			.filter(|(path, _)| !PathBuf::from(path).exists())
			.map(|(path, _)| PathBuf::from(path))
			.collect::<Vec<PathBuf>>();

		let (series_to_create, series_to_visit) = valid_entries
			.iter()
			.filter(|e| !missing_series.contains(&e.path().to_path_buf()))
			.map(|e| e.path().to_owned())
			.into_iter()
			.partition_map::<Vec<PathBuf>, Vec<PathBuf>, _, _, _>(|path| {
				let already_exists =
					existing_series_map.contains_key(path.to_string_lossy().as_ref());

				if !already_exists {
					Either::Right(path)
				} else {
					Either::Left(path)
				}
			});

		(series_to_create, missing_series, series_to_visit)
	};

	let to_create = series_to_create.len();
	tracing::trace!(?series_to_create, "Found {to_create} series to create");

	let is_missing = missing_series.len();
	tracing::trace!(
		?missing_series,
		"Found {is_missing} series to mark as missing"
	);

	tracing::trace!(
		"Finished computation steps in {}ms",
		computation_start.elapsed().as_millis()
	);

	Ok(WalkedLibrary {
		seen_files,
		ignored_files,
		series_to_create,
		series_to_visit,
		missing_series,
		library_is_missing,
	})
}

#[derive(Default)]
pub struct WalkedSeries {
	pub seen_files: u64,
	pub ignored_files: u64,
	pub media_to_create: Vec<PathBuf>,
	pub media_to_update: Vec<PathBuf>,
	pub missing_media: Vec<PathBuf>,
	pub series_is_missing: bool,
}

impl WalkedSeries {
	fn missing() -> Self {
		Self {
			series_is_missing: true,
			..Default::default()
		}
	}
}

pub async fn walk_series(path: &Path, ctx: WalkerCtx) -> CoreResult<WalkedSeries> {
	if !path.exists() {
		tracing::error!(
			"Failed to walk: {} is missing or inaccessible",
			path.display()
		);
		return Ok(WalkedSeries::missing());
	}

	let WalkerCtx {
		db, ignore_rules, ..
	} = ctx;

	tracing::debug!("Walking series at {}", path.display());

	let walk_start = std::time::Instant::now();
	let walker = WalkDir::new(path);
	let (valid_entries, ignored_entries) = walker
		.into_iter()
		.filter_entry(|e| e.path().is_file())
		.filter_map(|e| e.ok())
		.par_bridge()
		.partition_map::<Vec<DirEntry>, Vec<DirEntry>, _, _, _>(|entry| {
			let entry_path = entry.path();
			let matches_ignore_rule = ignore_rules.is_match(entry.path());

			if matches_ignore_rule || entry_path.should_ignore() {
				Either::Right(entry)
			} else {
				Either::Left(entry)
			}
		});

	let ignored_files = ignored_entries.len() as u64;
	let seen_files = valid_entries.len() as u64 + ignored_files;
	tracing::trace!(
		seen_files,
		ignored_entries = ignored_entries.len(),
		"Walk finished in {}ms",
		walk_start.elapsed().as_millis()
	);

	tracing::trace!("Fetching existing media...");
	let fetch_start = std::time::Instant::now();
	let existing_media = db
		.media()
		.find_many(vec![media::series::is(vec![series::path::equals(
			path.to_string_lossy().to_string(),
		)])])
		.exec()
		.await?;
	tracing::trace!(
		"Fetched {} existing media in {}ms",
		existing_media.len(),
		fetch_start.elapsed().as_millis()
	);

	let computation_start = std::time::Instant::now();

	let existing_media_map = existing_media
		.into_iter()
		.map(|m| (m.path.clone(), Media::from(m)))
		.collect::<HashMap<String, _>>();

	let (media_to_create, media_to_update) =
		valid_entries
			.iter()
			.fold((vec![], vec![]), |mut acc, entry| {
				let entry_path = entry.path();
				let entry_path_str = entry_path.to_string_lossy().to_string();

				if let Some(media) = existing_media_map.get(entry_path_str.as_str()) {
					let has_been_modified = if let Some(dt) = media.modified_at.clone() {
						file_updated_since_scan(&entry, dt)
							.map_err(|err| {
								tracing::error!(
									error = ?err,
									?path,
									"Failed to determine if entry has been modified since last scan"
								)
							})
							.unwrap_or(false)
					} else {
						false
					};

					// If the media has been modified, we need to update it
					if has_been_modified {
						acc.1.push(entry_path.to_path_buf());
					}

				// Else we don't need to do anything
				} else {
					// If the media doesn't exist, we need to create it
					acc.0.push(entry_path.to_path_buf());
				}

				acc
			});

	let missing_media = existing_media_map
		.into_par_iter()
		.filter(|(path, _)| !PathBuf::from(path).exists())
		.map(|(path, _)| PathBuf::from(path))
		.collect::<Vec<PathBuf>>();

	let to_create = media_to_create.len();
	tracing::trace!(?media_to_create, "Found {to_create} media to create");

	let to_update = media_to_update.len();
	tracing::trace!(?media_to_update, "Found {to_update} media to update");

	let is_missing = missing_media.len();
	tracing::trace!(
		?missing_media,
		"Found {is_missing} media to mark as missing"
	);

	tracing::trace!(
		"Finished computation steps in {}ms",
		computation_start.elapsed().as_millis()
	);

	Ok(WalkedSeries {
		seen_files,
		ignored_files,
		media_to_create,
		media_to_update,
		missing_media,
		series_is_missing: false,
	})
}

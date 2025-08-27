use std::{
	collections::HashMap,
	path::{Path, PathBuf},
	sync::Arc,
};

use globset::GlobSet;
use itertools::Either;
use models::entity::{media, series};
use rayon::iter::{
	IntoParallelIterator, IntoParallelRefIterator, ParallelBridge, ParallelIterator,
};
use sea_orm::{prelude::*, DatabaseConnection, QuerySelect};
use walkdir::{DirEntry, WalkDir};

use crate::{
	filesystem::{
		scanner::{options::BookVisitOperation, utils::file_updated_since_scan},
		PathUtils,
	},
	CoreResult,
};

use super::ScanOptions;

pub struct WalkerCtx {
	/// A reference to the database connection
	pub db: Arc<DatabaseConnection>,
	/// The globset of ignore rules to apply during the walk
	pub ignore_rules: GlobSet,
	// Will be 1 if the library is collection based, None
	pub max_depth: Option<usize>,
	/// The scan options to apply during the walk
	pub options: ScanOptions,
}

/// The output of walking a library
#[derive(Default)]
pub struct WalkedLibrary {
	/// The total number of directories seen during the walk
	pub seen_directories: u64,
	/// The number of directories that were ignored via ignore rules or common ignore patterns
	pub ignored_directories: u64,
	/// The paths for series that need to be created
	pub series_to_create: Vec<PathBuf>,
	/// A list of series IDs that were previously marked as missing but have been found on disk
	pub recovered_series: Vec<String>,
	/// The paths for series that need to be visited. This differs from [`WalkedSeries::media_to_visit`] because
	/// All series will always be visited in order to determine what media need to be reconciled in the series walk
	pub series_to_visit: Vec<PathBuf>,
	/// The paths for series that are missing from the filesystem
	pub missing_series: Vec<PathBuf>,
	/// Whether the library is missing from the filesystem
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

pub async fn walk_library(
	path: &str,
	WalkerCtx {
		db,
		ignore_rules,
		max_depth,
		..
	}: WalkerCtx,
) -> CoreResult<WalkedLibrary> {
	let library_is_missing = !PathBuf::from(path).exists();
	if library_is_missing {
		tracing::error!("Failed to walk: {} is missing or inaccessible", path);
		return Ok(WalkedLibrary::missing());
	}

	let mut walkdir = WalkDir::new(path);
	if let Some(num) = max_depth {
		walkdir = walkdir.max_depth(num);
	}

	let walk_start = std::time::Instant::now();
	let is_collection_based = max_depth.is_some_and(|d| d == 1);
	tracing::debug!(
		?path,
		max_depth,
		is_collection_based,
		?ignore_rules,
		"Walking library",
	);

	let (valid_entries, ignored_entries) = walkdir
		// Set min_depth to 0 so we include the library path itself,
		// which allows us to add it as a series when there are media items in it
		.min_depth(0)
		.into_iter()
		.filter_entry(|e| e.path().is_dir())
		.filter_map(Result::ok)
		.par_bridge()
		.partition_map::<Vec<DirEntry>, Vec<DirEntry>, _, _, _>(|entry| {
			let entry_path = entry.path();
			let entry_path_str = entry_path.as_os_str().to_string_lossy().to_string();
			let check_deep = is_collection_based && entry_path_str != path;

			let should_ignore = ignore_rules.is_match(entry.path());
			// If we're doing a top level scan, we need to check that the path
			// has media deeply nested. Exception for when the path is the library path,
			// then we only need to check if it has media in it directly
			//
			// If we're doing a bottom up scan, we need to check that the path has
			// media directly in it.
			let is_valid = !should_ignore
				&& (check_deep && entry_path.dir_has_media_deep(&ignore_rules)
					|| (!check_deep && entry_path.dir_has_media(&ignore_rules)));

			tracing::trace!(?is_valid, ?entry_path_str);

			if is_valid {
				Either::Left(entry)
			} else {
				Either::Right(entry)
			}
		});

	let ignored_directories = ignored_entries.len() as u64;
	let seen_directories = valid_entries.len() as u64 + ignored_directories;

	tracing::debug!(
		seen_directories,
		ignored_entries = ignored_entries.len(),
		"Walk finished in {}ms",
		walk_start.elapsed().as_millis()
	);

	let computation_start = std::time::Instant::now();
	let (series_to_create, missing_series, recovered_series, series_to_visit) = {
		let existing_records = series::Entity::find()
			.columns(vec![
				series::Column::Id,
				series::Column::Path,
				series::Column::Status,
			])
			.filter(series::Column::Path.starts_with(path))
			.all(db.as_ref())
			.await?;

		if existing_records.is_empty() {
			tracing::debug!(
				"No existing series found in the database, all series are new"
			);
			let series_to_create = valid_entries
				.into_iter()
				.map(|e| e.path().to_owned())
				.collect::<Vec<PathBuf>>();
			(series_to_create, vec![], vec![], vec![])
		} else {
			let existing_series_map = existing_records
				.iter()
				.map(|s| (s.path.clone(), s.clone()))
				.collect::<HashMap<String, _>>();

			let missing_series = existing_series_map
				.iter()
				.filter(|(path, _)| !PathBuf::from(path).exists())
				.map(|(path, _)| PathBuf::from(path))
				.collect::<Vec<PathBuf>>();

			let recovered_series = existing_records
				.into_iter()
				.filter(|s| {
					s.status.is_recovered_if_present() && PathBuf::from(path).exists()
				})
				.map(|s| s.id)
				.collect::<Vec<String>>();

			let (series_to_create, series_to_visit) = valid_entries
				.par_iter()
				.filter(|e| !missing_series.contains(&e.path().to_path_buf()))
				.map(|e| e.path().to_owned())
				.partition_map::<Vec<PathBuf>, Vec<PathBuf>, _, _, _>(|path| {
					let already_exists =
						existing_series_map.contains_key(path.to_string_lossy().as_ref());

					if already_exists {
						Either::Right(path)
					} else {
						Either::Left(path)
					}
				});

			(
				series_to_create,
				missing_series,
				recovered_series,
				series_to_visit,
			)
		}
	};

	let to_create = series_to_create.len();
	tracing::trace!(?series_to_create, "Found {to_create} series to create");

	let missing_series_len = missing_series.len();
	tracing::trace!(
		?missing_series,
		"Found {missing_series_len} series to mark as missing"
	);

	tracing::debug!(
		"Finished computation steps in {}ms",
		computation_start.elapsed().as_millis()
	);

	Ok(WalkedLibrary {
		seen_directories,
		ignored_directories,
		series_to_create,
		recovered_series,
		series_to_visit,
		missing_series,
		library_is_missing,
	})
}

/// The output of walking a series
#[derive(Default)]
pub struct WalkedSeries {
	/// The total number of files seen during the walk
	pub seen_files: u64,
	/// The number of files that were either ignored via ignore rules or common ignore patterns
	/// such as `.DS_Store`
	pub ignored_files: u64,
	/// The number of files which exist in the database but have not been updated since the last scan
	pub skipped_files: u64,
	/// The paths for media that need to be created
	pub media_to_create: Vec<PathBuf>,
	/// A list of media IDs that were previously marked as missing but have been found on disk
	pub recovered_media: Vec<String>,
	/// The paths for media that need to be visited, i.e. the timestamp on disk has changed and
	/// Stump will reconcile the media with the database
	pub media_to_visit: Vec<(PathBuf, BookVisitOperation)>,
	/// The paths for media that are missing from the filesystem
	pub missing_media: Vec<PathBuf>,
	/// Whether the series is missing from the filesystem
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

pub async fn walk_series(
	path: &Path,
	WalkerCtx {
		db,
		ignore_rules,
		max_depth,
		options,
	}: WalkerCtx,
) -> CoreResult<WalkedSeries> {
	if !path.exists() {
		tracing::error!(
			"Failed to walk: {} is missing or inaccessible",
			path.display()
		);
		return Ok(WalkedSeries::missing());
	}

	tracing::debug!("Walking series at {}", path.display());

	let mut walker = WalkDir::new(path);
	if let Some(num) = max_depth {
		walker = walker.max_depth(num);
	}

	let walk_start = std::time::Instant::now();
	let (valid_entries, ignored_entries) = walker
		.into_iter()
		.filter_map(Result::ok)
		.filter_map(|e| e.path().is_file().then_some(e))
		.par_bridge()
		.partition_map::<Vec<DirEntry>, Vec<DirEntry>, _, _, _>(|entry| {
			let entry_path = entry.path();
			let matches_ignore_rule = ignore_rules.is_match(entry.path());

			if matches_ignore_rule || entry_path.is_default_ignored() {
				Either::Right(entry)
			} else {
				Either::Left(entry)
			}
		});

	let valid_entries_len = valid_entries.len() as u64;
	let ignored_files = ignored_entries.len() as u64;
	let seen_files = valid_entries_len + ignored_files;
	tracing::debug!(
		seen_files,
		ignored_entries = ignored_entries.len(),
		"Walk finished in {}ms",
		walk_start.elapsed().as_millis()
	);

	tracing::trace!("Fetching existing media...");
	let fetch_start = std::time::Instant::now();
	let existing_media = media::Entity::find()
		.columns(vec![
			media::Column::Id,
			media::Column::Path,
			media::Column::ModifiedAt,
			media::Column::Status,
		])
		.inner_join(series::Entity)
		.filter(series::Column::Path.starts_with(path.to_string_lossy().to_string()))
		.all(db.as_ref())
		.await?;
	tracing::trace!(
		"Fetched {} existing media in {}ms",
		existing_media.len(),
		fetch_start.elapsed().as_millis()
	);

	let computation_start = std::time::Instant::now();

	let existing_media_map = existing_media
		.into_iter()
		.map(|m| (m.path.clone(), m.clone()))
		.collect::<HashMap<String, _>>();

	let (media_to_create, remaining_entries) = valid_entries
		.into_par_iter()
		.partition_map::<Vec<PathBuf>, Vec<DirEntry>, _, _, _>(|entry| {
			let entry_path = entry.path();
			let entry_path_str = entry_path.to_string_lossy().to_string();

			if existing_media_map.contains_key(entry_path_str.as_str()) {
				Either::Right(entry)
			} else {
				Either::Left(entry_path.to_path_buf())
			}
		});

	let book_visit_operations = remaining_entries
		.into_par_iter()
		.filter_map(|entry| {
			let entry_path = entry.path();
			let entry_path_str = entry_path.to_string_lossy().to_string();

			// We only want to visit media that are in the database, we handle new media
			// in the previous block of code
			existing_media_map
				.get(entry_path_str.as_str())
				.map(|m| (entry, m))
		})
		.filter_map(|(entry, media)| {
			let modified = media
				.modified_at
				.as_ref()
				.and_then(|dt| {
					file_updated_since_scan(&entry, dt.to_rfc3339())
						.map_err(|err| {
							tracing::error!(
								error = ?err,
								path = ?entry.path(),
								"Failed to determine if entry has been modified since last scan"
							);
						})
						.ok()
				})
				.unwrap_or_default();

			// We always rebuild when modified
			if modified {
				Some((entry.into_path(), BookVisitOperation::Rebuild))
			} else {
				// Otherwise, we will only perform the operation which is set in the options (if any)
				options
					.book_operation()
					.map(|operation| (entry.into_path(), operation))
			}
		})
		.collect::<Vec<(PathBuf, BookVisitOperation)>>();

	let missing_media = existing_media_map
		.par_iter()
		.filter(|(path, _)| !PathBuf::from(path).exists())
		.map(|(path, _)| PathBuf::from(path))
		.collect::<Vec<PathBuf>>();

	let recovered_media = existing_media_map
		.into_par_iter()
		.filter(|(path, media)| {
			media.status.is_recovered_if_present() && PathBuf::from(path).exists()
		})
		.map(|(_, media)| media.id)
		.collect::<Vec<String>>();

	let to_create = media_to_create.len();
	tracing::trace!(?media_to_create, "Found {to_create} media to create");

	let to_visit = book_visit_operations.len();
	tracing::trace!("Found {to_visit} media to visit");

	let skipped_files = seen_files - (to_create + to_visit) as u64;
	tracing::trace!(
		skipped_files,
		"Skipped files: {seen_files} - ({to_create} + {to_visit})"
	);

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
		skipped_files,
		media_to_create,
		recovered_media,
		media_to_visit: book_visit_operations,
		missing_media,
		series_is_missing: false,
	})
}

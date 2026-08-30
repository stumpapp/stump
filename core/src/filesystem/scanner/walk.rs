use std::{
	collections::HashMap,
	path::{Path, PathBuf},
	sync::Arc,
	time::UNIX_EPOCH,
};

use globset::GlobSet;
use itertools::{Either, Itertools};
use models::entity::{
	media,
	series::{self, SeriesIdentSelect},
};
use sea_orm::{prelude::*, DatabaseConnection, QuerySelect};
use walkdir::{DirEntry, WalkDir};

use crate::{
	error::CoreError,
	filesystem::{
		scanner::{
			options::BookVisitOperation,
			utils::{
				file_updated_since_scan, mtime_changed_since_scan,
				safely_get_current_mtime,
			},
		},
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
	/// Stored directory mtimes, loaded at scan start to be used for
	/// short-circuiting directories that have not been modified since the last scan
	pub dir_mtimes: HashMap<String, u64>,
	/// The series ID for this walk, if scoped to a specific series
	pub series_id: Option<String>,
	/// the directory for the library which oneshots are stored in, if any
	pub oneshot_directory: Option<String>,
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
	/// the directories to scan for oneshots, only populated if the library has a oneshot directory
	pub oneshot_dirs_to_visit: Vec<PathBuf>,
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
		oneshot_directory,
		..
	}: WalkerCtx,
) -> CoreResult<WalkedLibrary> {
	let library_is_missing = !PathBuf::from(path).exists();
	if library_is_missing {
		tracing::error!("Failed to walk: {} is missing or inaccessible", path);
		return Ok(WalkedLibrary::missing());
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

	let path_owned = path.to_string();
	let (valid_entries, ignored_entries): (Vec<DirEntry>, Vec<DirEntry>) =
		tokio::task::spawn_blocking(move || {
			let mut walkdir = WalkDir::new(&path_owned);
			if let Some(num) = max_depth {
				walkdir = walkdir.max_depth(num);
			}

			walkdir
				// Set min_depth to 0 so we include the library path itself,
				// which allows us to add it as a series when there are media items in it
				.min_depth(0)
				.into_iter()
				.filter_entry(|e| e.path().is_dir())
				.filter_map(Result::ok)
				.partition_map(|entry| {
					let entry_path = entry.path();
					let entry_path_str =
						entry_path.as_os_str().to_string_lossy().to_string();
					let check_deep = is_collection_based && entry_path_str != path_owned;

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
				})
		})
		.await
		.map_err(|e| CoreError::InternalError(format!("Failed to walk library! {e}")))?;

	let (oneshot_entries, regular_entries): (Vec<DirEntry>, Vec<DirEntry>) =
		valid_entries.into_iter().partition(|entry| {
			oneshot_directory
				.as_deref()
				.filter(|dir| !dir.is_empty())
				.map(|dir| {
					entry
						.path()
						.to_string_lossy()
						.to_lowercase()
						// TODO(oneshots): is contains okay? too tired to think through
						// edge cases but need to revisit before merge
						.contains(&dir.to_lowercase())
				})
				.unwrap_or(false)
		});
	let oneshot_dirs_to_visit: Vec<PathBuf> =
		oneshot_entries.into_iter().map(|e| e.into_path()).collect();

	let ignored_directories = ignored_entries.len() as u64;
	let seen_directories = regular_entries.len() as u64 + ignored_directories;

	tracing::debug!(
		seen_directories,
		ignored_entries = ignored_entries.len(),
		oneshot_dirs = oneshot_dirs_to_visit.len(),
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
			let series_to_create = regular_entries
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

			let (series_to_create, series_to_visit) = {
				// existing series in ignored_entries should be -> empty dirs but exist on disk, so we still
				// want to visit them. relates to https://github.com/stumpapp/stump/issues/1051
				let existing_empty_series: Vec<PathBuf> = ignored_entries
					.iter()
					.filter_map(|e| {
						let path_str = e.path().to_string_lossy().to_string();
						existing_series_map
							.contains_key(&path_str)
							.then(|| e.path().to_owned())
					})
					.collect();

				regular_entries
					.iter()
					.filter(|e| !missing_series.contains(&e.path().to_path_buf()))
					.map(|e| e.path().to_owned())
					.chain(existing_empty_series)
					.partition_map(|path| {
						let already_exists = existing_series_map
							.contains_key(path.to_string_lossy().as_ref());

						if already_exists {
							Either::Right(path)
						} else {
							Either::Left(path)
						}
					})
			};

			(
				series_to_create,
				missing_series,
				recovered_series,
				series_to_visit,
			)
		}
	};

	let count = series_to_create.len();
	tracing::trace!(count, "Found series to create");

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
		oneshot_dirs_to_visit,
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
	/// The *changed* mtimes observed for every directory during the walk. If a value was observed but
	/// unchanged, it will not be included in this map
	pub observed_dir_mtimes: HashMap<String, u64>,
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
		dir_mtimes,
		series_id,
		..
	}: WalkerCtx,
) -> CoreResult<WalkedSeries> {
	if tokio::fs::metadata(path).await.is_err() {
		tracing::error!(
			"Failed to walk: {} is missing or inaccessible",
			path.display()
		);
		return Ok(WalkedSeries::missing());
	}

	tracing::debug!("Walking series at {}", path.display());

	let path_buf = path.to_path_buf();
	let walk_start = std::time::Instant::now();
	let (valid_entries, ignored_entries, observed_dir_mtimes): (
		Vec<DirEntry>,
		Vec<DirEntry>,
		HashMap<String, u64>,
	) = tokio::task::spawn_blocking(move || {
		let mut walkdir = WalkDir::new(&path_buf);
		if let Some(num) = max_depth {
			walkdir = walkdir.max_depth(num);
		}

		let root_str = path_buf.to_string_lossy().into_owned();

		let mut it = walkdir.into_iter();

		let mut valid = Vec::new();
		let mut ignored = Vec::new();
		let mut observed = HashMap::new();

		loop {
			match it.next() {
				None => break,
				Some(Err(error)) => {
					tracing::warn!(
						error = ?error,
						path = ?error.path(),
						"Error encountered during walk, skipping entry"
					);
					continue;
				},
				Some(Ok(entry)) => {
					let entry_path = entry.path();

					if entry_path.is_dir() {
						let path_str = entry_path.to_string_lossy().into_owned();
						let current_mtime = entry_path
							.metadata()
							.and_then(|m| m.modified())
							.map(|t| {
								t.duration_since(UNIX_EPOCH).unwrap_or_default().as_secs()
							})
							.unwrap_or(0);
						let did_change = dir_mtimes
							.get(&path_str)
							.is_none_or(|&prev_mtime| prev_mtime != current_mtime);

						// no point observing mtimes if unchanged, as the write path will be useless since the
						// value is already same as before
						if did_change {
							tracing::trace!(
								mtime = current_mtime,
								path = path_str,
								"Observed changed dir"
							);
							observed.insert(path_str.clone(), current_mtime);
						}

						// we never skip the series root, itself. the mtime might not accurately
						// reflect changes deeper in the tree, and so skipping would cause us
						// to miss any changes at those levels
						let is_root = path_str == root_str;
						if !is_root && !did_change {
							tracing::trace!(
								mtime = current_mtime,
								path = path_str,
								"Skipping unchanged dir"
							);
							it.skip_current_dir();
						}
						continue;
					}

					if ignore_rules.is_match(entry_path)
						|| entry_path.is_default_ignored()
					{
						ignored.push(entry);
					} else {
						valid.push(entry);
					}
				},
			}
		}

		(valid, ignored, observed)
	})
	.await
	.map_err(|e| CoreError::InternalError(format!("Series walk task panicked: {e}")))?;

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
	let existing_media = match series_id.as_deref() {
		Some(id) => {
			media::Entity::find()
				.columns(vec![
					media::Column::Id,
					media::Column::Path,
					media::Column::ModifiedAt,
					media::Column::Status,
				])
				.filter(media::Column::SeriesId.eq(id))
				.all(db.as_ref())
				.await?
		},
		// walk_library calls walk_series with no series_id (it discovers series,
		// not scoping to one). A brand-new series also has no existing media yet
		None => Vec::new(),
	};
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

	let (media_to_create, remaining_entries): (Vec<PathBuf>, Vec<DirEntry>) =
		valid_entries.into_iter().partition_map(|entry: DirEntry| {
			let entry_path = entry.path();
			let entry_path_str = entry_path.to_string_lossy().to_string();

			if existing_media_map.contains_key(entry_path_str.as_str()) {
				Either::Right(entry)
			} else {
				Either::Left(entry_path.to_path_buf())
			}
		});

	let book_visit_operations = remaining_entries
		.into_iter()
		.filter_map(|entry: DirEntry| {
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
				.map(|dt| file_updated_since_scan(&entry, dt))
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
		.iter()
		.filter(|(path, _)| !PathBuf::from(path).exists())
		.map(|(path, _)| PathBuf::from(path))
		.collect::<Vec<PathBuf>>();

	let recovered_media = existing_media_map
		.into_iter()
		.filter(|(path, media)| {
			media.status.is_recovered_if_present() && PathBuf::from(path).exists()
		})
		.map(|(_, media)| media.id)
		.collect::<Vec<String>>();

	let to_create = media_to_create.len();
	tracing::trace!(to_create, "Found media to create");

	let to_visit = book_visit_operations.len();
	tracing::trace!(to_visit, "Found media to visit");

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
		observed_dir_mtimes,
	})
}

pub struct WalkedOneshots {
	/// The total number of files seen during the walk
	pub seen_files: u64,
	/// The number of files that were either ignored via ignore rules or common ignore patterns
	/// such as `.DS_Store`
	pub ignored_files: u64,
	//
	// TODO: other fields, figure it out. oneshots are quite strange relative to other
	// entities here so might not cleanly fit into same structures
}

// dir_mtimes, // TODO: check before walking?
pub async fn walk_oneshots(
	path: &Path,
	WalkerCtx {
		db,
		ignore_rules,
		options,
		..
	}: WalkerCtx,
) -> CoreResult<WalkedSeries> {
	if tokio::fs::metadata(path).await.is_err() {
		unimplemented!("err like series or library missing")
	}

	let dir_path = path.to_path_buf();
	let file_paths = tokio::task::spawn_blocking(move || match dir_path.read_dir() {
		Ok(read_dir) => read_dir
			.map(|entry| entry.map(|e| e.path()))
			.filter_map(Result::ok)
			.filter(|file_path| {
				!file_path.is_default_ignored() && !ignore_rules.is_match(file_path)
			})
			.collect::<Vec<PathBuf>>(),
		Err(error) => {
			tracing::error!(
				?error,
				path = ?dir_path,
				"Failed to read oneshot directory"
			);
			Vec::new()
		},
	})
	.await?;
	// ^ originally i went the tokio::fs::read_dir route but there is not iterator impl
	// so that was a hard pass

	let existing_oneshots = series::Entity::find()
		.select_only()
		.columns(SeriesIdentSelect::columns())
		.filter(series::Column::Path.starts_with(path.to_string_lossy().as_ref()))
		.into_model::<SeriesIdentSelect>()
		.all(db.as_ref())
		.await?
		.into_iter()
		.map(|s| (s.path, s.id))
		.collect::<HashMap<String, String>>();

	// this is a vec of (series_path,series_id) but will mark both series and
	// book as missing, since the books are series
	let mut missing_oneshots = Vec::new();

	for (path, id) in existing_oneshots.iter() {
		// TODO(chore): the other fns should be refactored follow this pattern since
		// we are in async runtime here and PathBuf::exists is blocking
		match tokio::fs::try_exists(PathBuf::from(path)).await {
			Ok(exists) => {
				if !exists {
					missing_oneshots.push((path.clone(), id.clone()));
				}
			},
			Err(error) => {
				tracing::error!(
					?error,
					path = ?path,
					"Failed to check existence of oneshot series"
				);
			},
		}
	}

	// what im thinking is sm along the lines of:
	// for each file:
	//  series = get series from map
	//  if !series: create it (prolly need new logic, bc built from book)
	//  return series tasks? (e.g., create/visit media)?

	let (to_create, remaining_paths): (Vec<PathBuf>, Vec<PathBuf>) =
		file_paths.into_iter().partition_map(|file_path: PathBuf| {
			let file_path_str = file_path.to_string_lossy().to_string();
			if existing_oneshots.contains_key(&file_path_str) {
				Either::Right(file_path)
			} else {
				Either::Left(file_path)
			}
		});
	// ^ to_create = series+media pair, remaining_paths = media check for visit (mtimes)

	// TODO: selection to reduce query
	let existing_books = media::Entity::find()
		.filter(
			media::Column::Path.is_in(
				remaining_paths
					.iter()
					.map(|p| p.to_string_lossy().to_string())
					.collect::<Vec<String>>(),
			),
		)
		.all(db.as_ref())
		.await?;

	let existing_book_map = existing_books
		.into_iter()
		.map(|b| (b.path.clone(), b))
		.collect::<HashMap<String, media::Model>>();

	let mut visit_operations = Vec::new();

	for book_path in remaining_paths.iter() {
		let path_str = book_path.to_string_lossy().to_string();
		let Some(existing_book) = existing_book_map.get(&path_str) else {
			tracing::warn!(
				?path_str,
				"Book path was not found in existing book map, skipping"
			);
			// ^ this should realistically never happen
			continue;
		};
		let current_mtime = safely_get_current_mtime(book_path).await;
		let did_change = existing_book
			.modified_at
			.as_ref()
			.map(|dt| mtime_changed_since_scan(current_mtime, dt))
			.unwrap_or_default();

		if did_change {
			visit_operations.push((book_path.clone(), BookVisitOperation::Rebuild));
		} else {
			if let Some(operation) = options.book_operation() {
				visit_operations.push((book_path.clone(), operation));
			}
		}
	}

	// note to self im finding myself forgetting often that these ops are kinda referring
	// to the same thing, since the series are the books lol but ill get used to it

	todo!()
}

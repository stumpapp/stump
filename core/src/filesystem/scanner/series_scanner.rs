use std::{
	collections::HashMap,
	path::Path,
	sync::{
		atomic::{AtomicU64, Ordering},
		Arc,
	},
	time::Duration,
};

use globset::{GlobSet, GlobSetBuilder};
use itertools::Itertools;
use walkdir::WalkDir;

use crate::{
	db::entity::{FileStatus, Library, LibraryOptions, Media, Series},
	event::CoreEvent,
	filesystem::{
		scanner::utils::{
			create_media, file_updated_since_scan, mark_media_paths_missing, update_media,
		},
		MediaBuilder, PathUtils,
	},
	job::{utils::persist_job_start, JobUpdate, WorkerCtx},
	prisma::{library, media, series},
	CoreError, CoreResult, Ctx,
};

use super::utils::populate_glob_builder;

pub struct SeriesScanner {
	/// The path to the series to scan. This is required when running a series
	/// scan isolated from a library scan.
	path: Option<String>,
	worker_ctx: WorkerCtx,
}

impl SeriesScanner {
	pub fn new(worker_ctx: WorkerCtx) -> Self {
		Self {
			path: None,
			worker_ctx,
		}
	}

	pub fn with_path(self, path: String) -> Self {
		Self {
			path: Some(path),
			..self
		}
	}

	pub fn task_count(path: &str, library_path: &str, is_collection_based: bool) -> u64 {
		let mut series_walkdir = WalkDir::new(path);

		// When the series is the library itself, we want to set the max_depth
		// to 1 so it doesn't walk through the entire library (effectively doubling
		// the return result, instead of the actual number of files to process)
		if !is_collection_based || path == library_path {
			series_walkdir = series_walkdir.max_depth(1)
		}

		series_walkdir
			.into_iter()
			.filter_map(|e| e.ok())
			.filter(|e| e.path().is_file())
			.count() as u64
	}

	pub async fn scan(&self) -> CoreResult<u64> {
		self.worker_ctx
			.emit_job_started(0, Some("Preparing library scan".to_string()));

		let core_ctx = self.worker_ctx.core_ctx.clone();
		let series_path = self.path.clone().ok_or(CoreError::JobInitializationError(
			"Series path is required for series scan".to_string(),
		))?;

		let library = core_ctx
			.db
			.library()
			.find_first(vec![library::series::some(vec![series::path::equals(
				series_path.clone(),
			)])])
			.with(
				library::series::fetch(vec![series::path::equals(series_path.clone())])
					.with(series::media::fetch(vec![])),
			)
			.with(library::library_options::fetch())
			.exec()
			.await?
			.ok_or(CoreError::NotFound(
				"Library containing target series was not found".to_string(),
			))?;

		let library = Library::from(library);
		let library_options = library.library_options.clone();
		let series = library
			.series
			.ok_or(CoreError::InternalError(
				"Series relation failed to load".to_string(),
			))?
			.first()
			.ok_or(CoreError::NotFound("TODO: different error".to_string()))?
			.clone();

		let tasks = Self::task_count(
			&series.path,
			&library.path,
			library_options.is_collection_based(),
		);

		let job_id = self.worker_ctx.job_id.clone();
		persist_job_start(&core_ctx, job_id.clone(), tasks).await?;

		// Sleep for a little to let the UI breathe.
		tokio::time::sleep(Duration::from_millis(500)).await;

		let counter = Arc::new(AtomicU64::new(0));
		let progress_ctx = self.worker_ctx.clone();

		let counter_ref = counter.clone();

		self.scan_series(series, library.path, library_options, move |msg| {
			let previous = counter_ref.fetch_add(1, Ordering::SeqCst);
			progress_ctx.emit_progress(JobUpdate::tick(
				job_id.clone(),
				previous + 1,
				tasks,
				Some(msg),
			));
		})
		.await;

		// self.finish(library_options).await;

		tokio::time::sleep(Duration::from_millis(500)).await;

		Ok(counter.load(Ordering::SeqCst))
	}

	pub async fn scan_series(
		&self,
		series: Series,
		library_path: String,
		library_options: LibraryOptions,
		mut on_progress: impl FnMut(String) + Send + Sync + 'static,
	) {
		let ctx = self.worker_ctx.core_ctx.clone();

		tracing::debug!(?series, "Scanning series");
		let SeriesSetup {
			mut visited_media,
			media_by_path,
			walkdir,
			glob_set,
		} = setup_series(&ctx, &series, &library_path, &library_options).await;

		let iter = walkdir
			.into_iter()
			.filter_map(|e| e.ok())
			.filter(|e| e.path().is_file());

		for entry in iter {
			let path = entry.path();
			let path_str = path.to_str().unwrap_or("").to_string();

			tracing::trace!(?path, "Scanning file");

			let glob_match = glob_set.is_match(path);
			let should_ignore = glob_match || path.should_ignore();
			if should_ignore {
				tracing::trace!(?path, glob_match, "Skipping ignored file");
				on_progress(format!("Skipping {:?}", path));
				continue;
			}

			on_progress(format!("Analyzing {:?}", path));

			if let Some(media) = media_by_path.get(&path_str) {
				tracing::trace!(media_path = ?path, "Existing media found");

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

				let is_changed_readiness_state = media.status != FileStatus::Ready;

				if has_been_modified || is_changed_readiness_state {
					tracing::debug!(
						?path,
						has_been_modified,
						is_changed_readiness_state,
						"File has been modified since last scan"
					);

					let build_result = MediaBuilder::new(
						path,
						&series.id,
						library_options.clone(),
						ctx.config.clone(),
					)
					.rebuild(media);

					if let Ok(generated) = build_result {
						tracing::warn!(
							"Stump currently has minimal support for updating media",
						);
						match update_media(&ctx.db, generated).await {
							Ok(created_media) => {
								ctx.emit_event(CoreEvent::CreateOrUpdateMedia {
									id: created_media.id,
									series_id: created_media.series_id,
									library_id: series.library_id.clone(),
								});
							},
							Err(e) => {
								tracing::error!(error = ?e, "Failed to update media");
								// TODO: persist error
							},
						}
					} else {
						tracing::error!(
							error = ?build_result.err(),
							?path,
							"Failed to build media for update!",
						);
					}
				}

				*visited_media.entry(path_str).or_insert(true) = true;
			} else {
				tracing::trace!(series_id = ?series.id, new_media_path = ?path, "New media found in series");
				let build_result = MediaBuilder::new(
					path,
					&series.id,
					library_options.clone(),
					ctx.config.clone(),
				)
				.build();
				if let Ok(generated) = build_result {
					match create_media(&ctx.db, generated).await {
						Ok(created_media) => {
							visited_media.insert(path_str, true);
							ctx.emit_event(CoreEvent::CreateOrUpdateMedia {
								id: created_media.id,
								series_id: created_media.series_id,
								library_id: series.library_id.clone(),
							});
						},
						Err(e) => {
							tracing::error!(error = ?e, ?path, "Failed to create media");
							// TODO: persist error
						},
					}
				} else {
					tracing::error!(error = ?build_result.err(), ?path, "Failed to build media");
				}
			}
		}

		let missing_media = visited_media
			.into_iter()
			.filter(|(_, visited)| !visited)
			.map(|(path, _)| path)
			.collect::<Vec<String>>();

		if !missing_media.is_empty() {
			tracing::warn!(
				missing_paths = ?missing_media,
				"Some paths were not visited during series scan"
			);
			let result = mark_media_paths_missing(&ctx.db, missing_media).await;

			if let Err(err) = result {
				tracing::error!(error = ?err, "Error trying to mark missing media");
			} else {
				tracing::debug!(
					affected_rows = result.unwrap_or_default(),
					"Marked missing media"
				);
			}
		}

		tracing::trace!(?series, "Finished scanning series");
		ctx.emit_event(CoreEvent::SeriesScanComplete { id: series.id });
	}
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
			tracing::error!(error = ?e, "Error occurred trying to fetch media for series");
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

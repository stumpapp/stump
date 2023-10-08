use std::{
	collections::HashMap,
	path::Path,
	sync::{
		atomic::{AtomicU64, Ordering},
		Arc,
	},
	time::{Duration, Instant},
};

use rayon::prelude::{IntoParallelRefIterator, ParallelBridge, ParallelIterator};
use walkdir::{DirEntry, WalkDir};

use crate::{
	db::{
		entity::{FileStatus, Library, LibraryOptions, Series},
		SeriesDAO, DAO,
	},
	event::CoreEvent,
	filesystem::{
		image::{ThumbnailJob, ThumbnailJobConfig},
		media::MediaBuilder,
		scanner::{
			series_scanner::{setup_series, SeriesSetup},
			utils::{
				create_media, file_updated_since_scan, mark_library_missing,
				mark_media_paths_missing, update_media,
			},
		},
		PathUtils, SeriesBuilder,
	},
	job::{utils::persist_job_start, JobUpdate, WorkerCtx},
	prisma::{library, series},
	CoreError, CoreResult,
};

pub struct LibrarySetup {
	pub library: Library,
	pub library_options: LibraryOptions,
	pub library_series: Vec<Series>,
	pub tasks: u64,
}

pub struct LibraryScanner {
	path: String,
	worker_ctx: WorkerCtx,
}

impl LibraryScanner {
	pub fn new(path: String, worker_ctx: WorkerCtx) -> Self {
		Self { path, worker_ctx }
	}

	pub async fn scan(&self) -> CoreResult<u64> {
		self.worker_ctx
			.emit_job_started(0, Some("Preparing library scan".to_string()));

		let core_ctx = self.worker_ctx.core_ctx.clone();
		let LibrarySetup {
			library_options,
			library_series,
			tasks,
			..
		} = self.setup().await?;

		let job_id = self.worker_ctx.job_id.clone();
		persist_job_start(&core_ctx, job_id.clone(), tasks).await?;

		// Sleep for a little to let the UI breathe.
		tokio::time::sleep(Duration::from_millis(500)).await;

		let counter = Arc::new(AtomicU64::new(0));
		for series in library_series {
			let progress_ctx = self.worker_ctx.clone();

			let job_id = progress_ctx.job_id().to_string();
			let counter_ref = counter.clone();

			let library_options = library_options.clone();
			self.scan_series(series, library_options, move |msg| {
				let previous = counter_ref.fetch_add(1, Ordering::SeqCst);
				progress_ctx.emit_progress(JobUpdate::tick(
					job_id.clone(),
					previous + 1,
					tasks,
					Some(msg),
				));
			})
			.await;
		}

		self.finish(library_options).await;

		tokio::time::sleep(Duration::from_millis(500)).await;

		Ok(counter.load(Ordering::SeqCst))
	}

	async fn setup(&self) -> CoreResult<LibrarySetup> {
		self.worker_ctx
			.emit_job_message("Running library scan setup");

		let start = Instant::now();

		let ctx = self.worker_ctx.core_ctx.clone();
		let db = ctx.get_db();

		let library = db
			.library()
			.find_unique(library::path::equals(self.path.clone()))
			.with(library::series::fetch(vec![]))
			.with(library::library_options::fetch())
			.exec()
			.await?
			.ok_or(CoreError::NotFound(format!(
				"Library not found: {}",
				self.path
			)))?;

		if !Path::new(&self.path).exists() {
			mark_library_missing(db, &library).await?;

			return Err(CoreError::FileNotFound(format!(
				"Library could not be found on disk: {}",
				self.path
			)));
		}

		let library = Library::from(library);
		let existing_series = library.series.unwrap_or_default();
		let library_options = library.library_options.clone();
		let is_collection_based = library_options.is_collection_based();

		let series = self
			.discover_series(library.id.clone(), existing_series, is_collection_based)
			.await?;

		let tasks: u64 = series
			.par_iter()
			.map(|series| {
				let mut series_walkdir = WalkDir::new(&series.path);

				// When the series is the library itself, we want to set the max_depth
				// to 1 so it doesn't walk through the entire library (effectively doubling
				// the return result, instead of the actual number of files to process)
				if !is_collection_based || series.path == library.path {
					series_walkdir = series_walkdir.max_depth(1)
				}

				series_walkdir
					.into_iter()
					.filter_map(|e| e.ok())
					.filter(|e| e.path().is_file())
					.count() as u64
			})
			.sum();

		let duration = start.elapsed();
		let seconds = duration.as_secs();
		let setup_time = format!("{seconds}.{:03} seconds", duration.subsec_millis());

		tracing::debug!(
			task_count = tasks,
			?setup_time,
			"Library scan setup completed"
		);

		Ok(LibrarySetup {
			library: Library {
				series: None,
				..library
			},
			library_options,
			library_series: series,
			tasks,
		})
	}

	async fn discover_series(
		&self,
		library_id: String,
		mut existing_series: Vec<Series>,
		is_collection_based: bool,
	) -> CoreResult<Vec<Series>> {
		self.worker_ctx
			.emit_job_message("Discovering any new series");

		let ctx = self.worker_ctx.core_ctx.clone();
		let library_path = self.path.clone();

		let series_map = existing_series
			.iter()
			.map(|data| (data.path.as_str(), false))
			.collect::<HashMap<&str, bool>>();

		let missing_series = existing_series
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
					path.dir_has_media_deep()
						&& !series_map.contains_key(path_str.as_str())
				} else {
					// If we're doing a bottom up scan, we need to check that the path has
					// media directly in it.
					path.dir_has_media() && !series_map.contains_key(path_str.as_str())
				}
			})
			.collect::<Vec<DirEntry>>();

		if !missing_series.is_empty() {
			self.worker_ctx.emit_job_message("Updating missing series");

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
			self.worker_ctx.emit_job_message("Creating new series");

			// TODO: remove this DAO!!
			let series_dao = SeriesDAO::new(ctx.db.clone());
			let series_to_create = new_entries
				.par_iter()
				.map(|e| SeriesBuilder::new(e.path(), &library_id).build())
				.filter_map(|res| {
					if let Err(e) = res {
						tracing::error!(error = ?e, "Failed to create series from entry");
						None
					} else {
						res.ok()
					}
				})
				.collect::<Vec<Series>>();

			let chunks = series_to_create.chunks(1000);
			tracing::debug!(chunk_count = chunks.len(), "Batch inserting new series");
			for chunk in chunks {
				let result = series_dao.create_many(chunk.to_vec()).await;
				match result {
					Ok(mut created_series) => {
						ctx.emit_event(CoreEvent::CreatedSeriesBatch {
							count: created_series.len() as u64,
							library_id: library_id.clone(),
						});
						existing_series.append(&mut created_series);
					},
					Err(e) => {
						tracing::error!(error = ?e, "Failed to batch insert series");
					},
				}
			}
		}

		Ok(existing_series)
	}

	async fn scan_series(
		&self,
		series: Series,
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
		} = setup_series(&ctx, &series, &self.path, &library_options).await;

		let iter = walkdir
			.into_iter()
			.filter_map(|e| e.ok())
			.filter(|e| e.path().is_file())
			.filter(|e| {
				let path = e.path();
				let glob_match = glob_set.is_match(path);
				let should_ignore = glob_match || path.should_ignore();
				if should_ignore {
					tracing::trace!(?path, glob_match, "Skipping ignored file");
				}
				!should_ignore
			});

		for entry in iter {
			let path = entry.path();
			let path_str = path.to_str().unwrap_or("").to_string();

			tracing::trace!(?path, "Scanning file");

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

				if has_been_modified {
					tracing::debug!(?path, "File has been modified since last scan");

					let build_result =
						MediaBuilder::new(path, &series.id, library_options.clone())
							.build();

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
								tracing::error!(error = ?e, "Failed to create media");
								// TODO: persist error
							},
						}
					} else {
						tracing::error!(
							?build_result,
							"Failed to build media for update!",
						);
					}
				}

				*visited_media.entry(path_str).or_insert(true) = true;
			} else {
				tracing::trace!(series_id = ?series.id, new_media_path = ?path, "New media found in series");
				let build_result =
					MediaBuilder::new(path, &series.id, library_options.clone()).build();
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
							tracing::error!(error = ?e, "Failed to create media");
							// TODO: persist error
						},
					}
				} else {
					tracing::error!(error = ?build_result.err(), "Failed to build media");
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

	async fn finish(&self, options: LibraryOptions) {
		self.worker_ctx
			.emit_job_message("Performing post-scan cleanup");

		let core_ctx = self.worker_ctx.core_ctx.clone();
		if let Some(thumbnail_config) = options.thumbnail_config {
			let job_config = ThumbnailJobConfig::SingleLibrary {
				library_id: options.library_id.unwrap_or_else(|| {
					tracing::error!("No library ID found in library options, cannot dispatch thumbnail job");
					"".to_string()
				}),
				force_regenerate: false,
			};

			let dispatch_result =
				core_ctx.dispatch_job(ThumbnailJob::new(thumbnail_config, job_config));
			if dispatch_result.is_err() {
				tracing::error!("Failed to dispatch thumbnail job!");
			}
		} else {
			tracing::debug!("No thumbnail config found, skipping thumbnail job dispatch");
		}

		tokio::time::sleep(Duration::from_millis(200)).await;
	}
}

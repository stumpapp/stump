use std::{
	path::Path,
	sync::{
		atomic::{AtomicU64, Ordering},
		Arc,
	},
	time::{Duration, Instant},
};

use futures::StreamExt;
use tokio::task::JoinHandle;
use walkdir::WalkDir;

use crate::{
	db::entity::{LibraryOptions, Media, MediaBuilder, MediaBuilderOptions, Series},
	event::CoreEvent,
	filesystem::{
		image::{ThumbnailJob, ThumbnailJobConfig},
		scanner::{
			setup::{setup_library_series, setup_series, SeriesSetup},
			utils::{
				batch_media_operations, file_updated_since_scan, mark_library_missing,
			},
		},
		PathUtils,
	},
	job::{utils::persist_job_start, JobUpdate, WorkerCtx},
	prisma::library,
	CoreError, CoreResult,
};

use super::{common::BatchScanOperation, setup::LibrarySetup};

pub struct LibraryScanner {
	path: String,
	worker_ctx: WorkerCtx,
}

impl LibraryScanner {
	pub fn new(path: String, worker_ctx: WorkerCtx) -> Self {
		Self { path, worker_ctx }
	}

	async fn setup(&self) -> CoreResult<LibrarySetup> {
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

		let library_options: LibraryOptions = library
			.library_options()
			.map(LibraryOptions::from)
			.unwrap_or_default();

		let is_collection_based = library_options.is_collection_based();
		// TODO: move this!
		let series = setup_library_series(&ctx, &library, is_collection_based).await?;

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

		tracing::debug!(
			task_count = tasks,
			?setup_time,
			"Library scan setup completed"
		);

		Ok(LibrarySetup {
			library,
			library_options,
			library_series: series,
			tasks,
		})
	}

	async fn quick_scan_series(
		&self,
		series: Series,
		library_options: LibraryOptions,
		mut on_progress: impl FnMut(String) + Send + Sync + 'static,
	) -> Vec<BatchScanOperation> {
		let ctx = self.worker_ctx.core_ctx.clone();

		tracing::debug!(?series, "Scanning series");
		let SeriesSetup {
			mut visited_media,
			media_by_path,
			walkdir,
			glob_set,
		} = setup_series(&ctx, &series, &self.path, &library_options).await;

		let mut operations = vec![];

		let iter = walkdir
			.into_iter()
			.filter_map(|e| e.ok())
			.filter(|e| e.path().is_file());

		for entry in iter {
			let path = entry.path();
			let path_str = path.to_str().unwrap_or("");

			tracing::trace!(?path, "Scanning file");

			// Tell client we are on the next file, this will increment the counter in the
			// callback, as well
			on_progress(format!("Analyzing {:?}", path));

			let glob_match = glob_set.is_match(path);

			if path.should_ignore() || glob_match {
				tracing::trace!(?path, glob_match, "Skipping ignored file");
				continue;
			} else if let Some(media) = media_by_path.get(path_str) {
				tracing::trace!(media_path = ?path, "Existing media found");

				let has_been_modified = if let Some(dt) = media.modified_at.clone() {
					file_updated_since_scan(&entry, dt)
						.map_err(|err| {
							tracing::error!(
								error = ?err,
								path = path_str,
								"Failed to determine if entry has been modified since last scan"
							)
						})
						.unwrap_or(false)
				} else {
					false
				};

				// If the file has been modified since the last scan, we need to update it.
				if has_been_modified {
					tracing::debug!(?path, "File has been modified since last scan");

					let build_result = Media::build_with_options(
						path,
						MediaBuilderOptions {
							series_id: media.series_id.clone(),
							library_options: library_options.clone(),
						},
					);

					// TODO: improve update support, e.g. update metadata, etc.
					if let Ok(generated) = build_result {
						tracing::warn!(
							"Stump currently has minimal support for updating media",
						);
						operations.push(BatchScanOperation::UpdateMedia(
							media.resolve_changes(&generated),
						));
					} else {
						tracing::error!(
							?build_result,
							"Failed to build media for update!",
						);
					}
				}

				*visited_media.entry(path_str.to_string()).or_insert(true) = true;
			} else {
				tracing::debug!(series_id = ?series.id, new_media_path = ?path, "Analyzing new book");

				let build_result = Media::build_with_options(
					path,
					MediaBuilderOptions {
						series_id: series.id.clone(),
						library_options: library_options.clone(),
					},
				);

				if let Ok(generated) = build_result {
					operations.push(BatchScanOperation::InsertMedia(generated));
				} else {
					tracing::error!(?build_result, "Failed to build new media!");
				}
			}
		}

		visited_media
			.into_iter()
			.filter(|(_, visited)| !visited)
			.for_each(|(path, _)| {
				operations.push(BatchScanOperation::MarkMediaMissing { path })
			});

		operations
	}

	pub async fn quick_scan(&self) -> CoreResult<u64> {
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
		let future_iter = library_series.into_iter().map(|s| async {
			let progress_ctx = self.worker_ctx.clone();

			let job_id = progress_ctx.job_id().to_string();
			let counter_ref = counter.clone();

			let library_options = library_options.clone();
			self.quick_scan_series(s, library_options, move |msg| {
				let previous = counter_ref.fetch_add(1, Ordering::SeqCst);
				progress_ctx.emit_progress(JobUpdate::tick(
					job_id.clone(),
					previous + 1,
					tasks,
					Some(msg),
				));
			})
			.await
		});

		// TODO: investigate if this is the best implementation
		let operations = futures::stream::iter(future_iter)
			// Execute up to 5 in parallel
			.buffer_unordered(5)
			.collect::<Vec<_>>()
			.await
			.into_iter()
			.flatten()
			.collect();

		let final_count = counter.load(Ordering::SeqCst);
		let created_media =
			batch_media_operations(&core_ctx, operations, &library_options)
				.await
				.map_err(|e| {
					tracing::error!("Failed to batch media operations: {:?}", e);
					CoreError::InternalError(e.to_string())
				})?;

		if !created_media.is_empty() {
			core_ctx.emit_event(CoreEvent::CreatedMediaBatch(created_media.len() as u64));
		}

		if let Some(options) = library_options.thumbnail_config {
			let dispatch_result = core_ctx.dispatch_job(ThumbnailJob::new(
				options,
				ThumbnailJobConfig::MediaGroup(
					created_media.iter().map(|m| m.id.clone()).collect(),
				),
			));
			if dispatch_result.is_err() {
				tracing::error!("Failed to dispatch thumbnail job!");
			} else {
				tracing::debug!(
					expected_thumbnail_count = created_media.len(),
					"Dispatched thumbnail job!"
				)
			}
		} else {
			tracing::debug!("No thumbnail config found, skipping thumbnail job dispatch");
		}

		tokio::time::sleep(Duration::from_millis(200)).await;

		Ok(final_count)
	}

	pub async fn scan(&self) -> CoreResult<u64> {
		unimplemented!()
	}
}

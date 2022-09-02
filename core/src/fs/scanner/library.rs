use prisma_client_rust::raw;
use rocket::tokio::{self, task::JoinHandle};
use std::{
	collections::HashMap,
	path::Path,
	sync::{
		atomic::{AtomicU64, Ordering},
		Arc, Mutex,
	},
};
use walkdir::WalkDir;

use crate::{
	config::context::Ctx,
	event::ClientEvent,
	fs::scanner::ScannedFileTrait,
	job::persist_job_start,
	prisma::{library, media, series},
	types::errors::ApiError,
};

use super::utils::mark_library_missing;

async fn precheck(
	ctx: &Ctx,
	path: String,
) -> Result<(library::Data, Vec<series::Data>, u64), ApiError> {
	let db = ctx.get_db();

	// TODO: load library options
	let library = db
		.library()
		.find_unique(library::path::equals(path.clone()))
		.with(library::series::fetch(vec![]))
		.exec()
		.await?;

	if library.is_none() {
		return Err(ApiError::NotFound(format!("Library not found: {}", path)));
	}

	let library = library.unwrap();

	if !Path::new(&path).exists() {
		mark_library_missing(library, &ctx).await?;

		return Err(ApiError::InternalServerError(format!(
			"Library path does not exist in fs: {}",
			path
		)));
	}

	let mut series = library.series()?.to_owned();

	let series_map = series
		.iter()
		.map(|data| (data.path.as_str(), data.to_owned()).into())
		.collect::<HashMap<&str, series::Data>>();

	// FIXME: I still don't like this. This needs to create series from bottom-most level, not top most
	// level I think. It's a little more annoying, but worth in the end? UNLESS, I just use the file explorer
	// option PNG suggested.
	let new_entries = WalkDir::new(&path)
		// I only allow depth of 1 because the top most directory will *always* be the series. Nested
		// directories get 'folded' into the series represented by the top directory.
		.max_depth(1)
		.into_iter()
		.filter_entry(|e| e.path().is_dir())
		.filter_map(|e| e.ok())
		.filter(|entry| {
			let path = entry.path();

			let path_str = path.as_os_str().to_string_lossy().to_string();

			// The root should only be added as a series if it has a file as a direct descendent.
			// This has to short circuit here, since below checks for deeply nested files, which will
			// always be true for library paths unless there is truly no media in it.
			if path_str == library.path {
				return path.dir_has_media()
					&& !series_map.contains_key(path_str.as_str());
			}

			let has_media_nested = WalkDir::new(path)
				.into_iter()
				.filter_map(|e| e.ok())
				.any(|e| e.path().is_file());

			// Only create series if there is media inside them, and if they aren't in
			// the exisitng series map.
			has_media_nested && !series_map.contains_key(path_str.as_str())
		})
		.collect();

	// TODO: I need to check for missing series? maybe? UGH...

	let mut inserted_series =
		super::utils::insert_series_many(ctx, new_entries, library.id.clone()).await;

	series.append(&mut inserted_series);

	let start = std::time::Instant::now();

	let files_to_process: u64 = futures::future::join_all(
		series
			.iter()
			.map(|data| {
				let path = data.path.clone();

				tokio::task::spawn_blocking(move || {
					WalkDir::new(&path)
						.into_iter()
						// FIXME: why won't this work??
						// .filter_entry(|e| e.path().is_file())
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

	log::debug!(
		"Files to process: {:?} (calculated in {}.{:03} seconds)",
		files_to_process,
		duration.as_secs(),
		duration.subsec_millis()
	);

	Ok((library, series, files_to_process))
}

async fn scan_series(
	ctx: Ctx,
	runner_id: String,
	series: series::Data,
	mut on_progress: impl FnMut(String) + Send + Sync + 'static,
) {
	let db = ctx.get_db();

	let media = db
		.media()
		.find_many(vec![media::series_id::equals(Some(series.id.clone()))])
		.exec()
		.await
		.unwrap();

	let mut visited_media = media
		.iter()
		.map(|data| (data.path.clone(), false).into())
		.collect::<HashMap<String, bool>>();

	for entry in WalkDir::new(&series.path)
		.into_iter()
		.filter_map(|e| e.ok())
		.filter(|e| e.path().is_file())
	{
		let path = entry.path();
		let path_str = path.to_str().unwrap_or("");

		log::debug!("Currently scanning: {:?}", path);

		// Tell client we are on the next file, this will increment the counter in the
		// callback, as well.
		on_progress(format!("Analyzing {:?}", path));

		if path.should_ignore() {
			log::trace!("Skipping ignored file: {:?}", path);
			continue;
		} else if path.is_thumbnail_img() {
			// TODO: these will *eventually* be supported, but not priority right now.
			log::debug!(
				"Stump does not support thumbnail image overrides yet ({:?}). Stay tuned!",
				path
			);
			continue;
		} else if let Some(_) = visited_media.get(path_str) {
			log::debug!("Existing media found: {:?}", path);
			*visited_media.entry(path_str.to_string()).or_insert(true) = true;
			continue;
		}

		log::debug!("New media found at {:?} in series {:?}", &path, &series.id);

		match super::utils::insert_media(&ctx, path, series.id.clone()).await {
			Ok(media) => {
				visited_media.insert(media.path.clone(), true);

				// TODO: error handling...
				let _ = ctx.emit_client_event(ClientEvent::CreatedMedia(media.clone()));
			},
			Err(e) => {
				log::error!("Failed to insert media: {:?}", e);

				ctx.handle_failure_event(ClientEvent::CreateEntityFailed {
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

	if missing_media.len() > 0 {
		log::info!("{} media in this series ({}) have not been found at the end of this series-level scan.", missing_media.len(), &series.id);
		log::debug!("{:?}", missing_media);
		// TODO: replace once batching is implemented -> https://github.com/Brendonovich/prisma-client-rust/issues/31
		if let Err(e) = db
			._execute_raw(raw!(format!(
				"UPDATE media SET status=\"{}\" WHERE path in ({})",
				"MISSING".to_string(),
				missing_media
					.into_iter()
					.map(|path| format!("\"{}\"", path))
					.collect::<Vec<_>>()
					.join(",")
			)
			.as_str()))
			.exec()
			.await
		{
			log::error!("Failed to mark missing media as MISSING: {:?}", e);
		} else {
			log::debug!("Marked missing media as MISSING.");
		}
	}
}

// FIXME: The *major* snag I've hit with concurrent is it starts to cause timeouts and connection errors
// to the database. I think there are just too many writers to the database file.
//
// I'm *definitely* not removing this, however I'm really hopeful that a
// potential solution lies in https://github.com/Brendonovich/prisma-client-rust/issues/60.
// Once transactions are supported, I think at the end of each series scan I can commit
// the transaction to maybe reduce load on the sql file. For now, I'll use the sync
// version...
//
// Ideas:
// - maybe create a TentativeMedia struct that scan_path returns? OR just the paths + series.id?
// grab the media before scan_path then block thread for the inserstions?
// - Create a ScanOperation enum, scan_series would instead return a Vec<ScanOperation> across
// multiple threads, and then at the end would sequentially run the operations. something like:
/*
	enum ScanOperation {
		CreateMedia { path: PathBuf },
		CreateSeries { path: PathBuf },
		... etc ...
	}
*/
pub async fn scan_concurrent(
	ctx: Ctx,
	path: String,
	runner_id: String,
) -> Result<(), ApiError> {
	let (_library, series, _files_to_process) = precheck(&ctx, path).await?;

	let counter = Arc::new(Mutex::new(1));

	let tasks: Vec<JoinHandle<()>> = series
		.into_iter()
		// .cloned()
		.map(|s| {
			let ctx_cpy = ctx.get_ctx();
			// let r_id = runner_id.clone();

			let counter_ref = counter.clone();

			let runner_id = runner_id.clone();

			tokio::spawn(async move {
				scan_series(ctx_cpy.get_ctx(), runner_id, s, move |_msg| {
					let mut shared = counter_ref.lock().unwrap();

					*shared += 1;

					// log::debug!("{:?} - {:?}", msg, shared);

					// let _ = ctx_cpy.job_progress(ClientEvent::job_progress(
					// 	"runnerid".to_string(),
					// 	counter as u64,
					// 	files_to_process,
					// 	Some(msg),
					// ));
				})
				.await;
			})
		})
		.collect();

	futures::future::join_all(tasks).await;

	Ok(())
}

pub async fn scan_sync(
	ctx: Ctx,
	path: String,
	runner_id: String,
) -> Result<u64, ApiError> {
	let (library, series, files_to_process) = precheck(&ctx, path).await?;

	// TODO: I am not sure if jobs should fail when the job fails to persist to DB.
	let _job = persist_job_start(&ctx, runner_id.clone(), files_to_process).await?;

	let _ = ctx.emit_client_event(ClientEvent::job_started(
		runner_id.clone(),
		// TODO: my brain is being silly and I don't know if I want 0 or 1 here....
		0,
		files_to_process,
		Some(format!("Starting library scan at {}", &library.path)),
	));

	let counter = Arc::new(AtomicU64::new(0));

	for s in series {
		let progress_ctx = ctx.get_ctx();
		let r_id = runner_id.clone();

		let counter_ref = counter.clone();

		let runner_id = runner_id.clone();

		scan_series(ctx.get_ctx(), runner_id, s, move |msg| {
			let previous = counter_ref.fetch_add(1, Ordering::SeqCst);

			let _ = progress_ctx.emit_client_event(ClientEvent::job_progress(
				r_id.to_owned(),
				previous + 1,
				files_to_process,
				Some(msg),
			));
		})
		.await;
	}

	Ok(counter.load(Ordering::SeqCst))
}

// TODO: add a 'scan all' for scanning all libraries...

// Note: You can't really run these tests from the top module level, as you need to
// delete all media before each one runs for good performance metrics. What I have been
// doing is deleting media, then running them individually, as I haven't figured out a
// way to get rust to run these sequentially *while* not limiting to single threaded...
#[cfg(test)]
mod tests {
	use rocket::tokio;

	use crate::config::context::*;

	use crate::types::errors::ApiError;

	#[tokio::test(flavor = "multi_thread")]
	#[ignore]
	async fn scan_concurrent() -> Result<(), ApiError> {
		let ctx = Ctx::mock().await;

		let start = std::time::Instant::now();
		super::scan_concurrent(
			ctx,
			"/Users/aaronleopold/Documents/Stump/Demo".to_string(),
			"runner_id_concurrent".to_string(),
		)
		.await?;
		let duration = start.elapsed();

		log::debug!(
			"Concurrent: {}.{:03} seconds",
			duration.as_secs(),
			duration.subsec_millis()
		);

		Ok(())
	}

	#[tokio::test(flavor = "multi_thread")]
	#[ignore]
	async fn scan_sync() -> Result<(), ApiError> {
		let ctx = Ctx::mock().await;

		let start = std::time::Instant::now();
		super::scan_sync(
			ctx,
			"/Users/aaronleopold/Documents/Stump/Demo".to_string(),
			"runner_id_sync".to_string(),
		)
		.await?;
		let duration = start.elapsed();

		log::debug!(
			"Sync: {}.{:03} seconds",
			duration.as_secs(),
			duration.subsec_millis()
		);

		Ok(())
	}
}

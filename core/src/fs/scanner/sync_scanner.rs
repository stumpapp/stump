use globset::GlobSetBuilder;
use itertools::Itertools;
use std::{
	collections::HashMap,
	path::Path,
	sync::{
		atomic::{AtomicU64, Ordering},
		Arc,
	},
	time::Duration,
};
use tracing::{debug, error, trace, warn};
use walkdir::WalkDir;

use crate::{
	db::models::LibraryOptions,
	event::CoreEvent,
	fs::scanner::{utils, validate, ScannedFileTrait},
	job::{persist_job_start, runner::RunnerCtx, JobUpdate},
	prelude::{CoreResult, Ctx},
	prisma::{media, series},
};

async fn scan_series(
	ctx: Ctx,
	runner_id: String,
	series: series::Data,
	library_path: &str,
	library_options: LibraryOptions,
	mut on_progress: impl FnMut(String) + Send + Sync + 'static,
) {
	let db = ctx.get_db();

	let series_ignore_file = Path::new(series.path.as_str()).join(".stumpignore");
	let library_ignore_file = Path::new(library_path).join(".stumpignore");

	let media = db
		.media()
		.find_many(vec![media::series_id::equals(Some(series.id.clone()))])
		.exec()
		.await
		.unwrap();

	let mut visited_media = media
		.iter()
		.map(|data| (data.path.clone(), false))
		.collect::<HashMap<String, bool>>();

	let mut walkdir = WalkDir::new(&series.path);

	let is_collection_based = library_options.is_collection_based();

	if !is_collection_based || series.path == library_path {
		walkdir = walkdir.max_depth(1);
	}

	let mut builder = GlobSetBuilder::new();

	if series_ignore_file.exists() || library_ignore_file.exists() {
		utils::populate_glob_builder(
			&mut builder,
			vec![series_ignore_file, library_ignore_file]
				.into_iter()
				.unique()
				.filter(|p| p.exists())
				.collect::<Vec<_>>()
				.as_slice(),
		);
	}

	// TODO: make this an error to enforce correct glob patterns in an ignore file.
	// This way, no scan will ever add things a user wants to ignore.
	let glob_set = builder.build().unwrap();

	for entry in walkdir
		.into_iter()
		.filter_map(|e| e.ok())
		.filter(|e| e.path().is_file())
	{
		let path = entry.path();
		let path_str = path.to_str().unwrap_or("");

		debug!("Currently scanning: {:?}", path);

		// Tell client we are on the next file, this will increment the counter in the
		// callback, as well.
		on_progress(format!("Analyzing {:?}", path));

		let glob_match = glob_set.is_match(path);
		// println!("Path: {:?} -> Matches: {}", path, glob_match);

		if path.should_ignore() || glob_match {
			trace!("Skipping ignored file: {:?}", path);
			trace!("Globbed ignore?: {}", glob_match);
			continue;
		} else if visited_media.get(path_str).is_some() {
			debug!("Existing media found: {:?}", path);
			*visited_media.entry(path_str.to_string()).or_insert(true) = true;
			continue;
		}

		debug!("New media found at {:?} in series {:?}", &path, &series.id);

		match super::utils::insert_media(&ctx, path, series.id.clone(), &library_options)
			.await
		{
			Ok(media) => {
				visited_media.insert(media.path.clone(), true);

				// ctx.emit_client_event(CoreEvent::CreatedMedia(media.clone()));
			},
			Err(e) => {
				error!("Failed to insert media: {:?}", e);

				ctx.handle_failure_event(CoreEvent::CreateEntityFailed {
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

	if missing_media.is_empty() {
		warn!(
			"{} media were unable to be located during scan.",
			missing_media.len(),
		);

		debug!("Missing media paths: {:?}", missing_media);

		let result = utils::mark_media_missing(&ctx, missing_media).await;

		if let Err(err) = result {
			error!("Failed to mark media as MISSING: {:?}", err);
		} else {
			debug!("Marked {} media as MISSING", result.unwrap());
		}
	}
}

pub async fn scan(ctx: RunnerCtx, path: String, runner_id: String) -> CoreResult<u64> {
	let core_ctx = ctx.core_ctx.clone();

	let (library, library_options, series, files_to_process) =
		validate::precheck(&core_ctx, path, &runner_id).await?;

	// TODO: I am not sure if jobs should fail when the job fails to persist to DB.
	let _job = persist_job_start(&core_ctx, runner_id.clone(), files_to_process).await?;

	ctx.progress(JobUpdate::job_started(
		runner_id.clone(),
		0,
		files_to_process,
		Some(format!("Starting library scan at {}", &library.path)),
	));

	let counter = Arc::new(AtomicU64::new(0));

	for s in series {
		let progress_ctx = ctx.clone();
		let scanner_ctx = core_ctx.clone();
		let r_id = runner_id.clone();

		let counter_ref = counter.clone();
		let runner_id = runner_id.clone();
		let library_path = library.path.clone();
		// Note: I don't ~love~ having to clone this struct each iteration. I think it's fine for now,
		// considering it consists of just a few booleans.
		let library_options = library_options.clone();

		scan_series(
			scanner_ctx,
			runner_id,
			s,
			&library_path,
			library_options,
			move |msg| {
				let previous = counter_ref.fetch_add(1, Ordering::SeqCst);

				progress_ctx.progress(JobUpdate::job_progress(
					r_id.to_owned(),
					Some(previous + 1),
					files_to_process,
					Some(msg),
				));
			},
		)
		.await;
	}

	ctx.progress(JobUpdate::job_finishing(
		runner_id,
		Some(counter.load(Ordering::SeqCst)),
		files_to_process,
		None,
	));
	tokio::time::sleep(Duration::from_millis(1000)).await;

	Ok(counter.load(Ordering::SeqCst))
}

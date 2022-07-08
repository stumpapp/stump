use prisma_client_rust::raw;
use rocket::tokio::{self, task::JoinHandle};
use std::{
	collections::HashMap,
	path::Path,
	sync::{atomic::AtomicI64, Arc, Mutex},
};
use walkdir::{DirEntry, WalkDir};

use crate::{
	config::context::Context,
	fs::scanner::ScannedFileTrait,
	prisma::{library, media, series},
	types::{errors::ApiError, event::ClientEvent},
};

use super::utils::mark_library_missing;

async fn precheck(
	ctx: &Context,
	path: String,
) -> Result<(library::Data, Vec<series::Data>), ApiError> {
	let db = ctx.get_db();

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

			// Only create series if there is media inside them, and if they aren't in
			// the exisitng series map.
			path.dir_has_media() && !series_map.contains_key(path_str.as_str())
		})
		.collect();

	// TODO: I need to check for missing series? maybe? UGH...

	let mut inserted_series =
		super::utils::insert_series_many(ctx, new_entries, library.id.clone()).await;

	series.append(&mut inserted_series);

	Ok((library, series))
}

async fn scan_series(
	ctx: Context,
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

	let _visited_media = media
		.iter()
		.map(|data| (data.path.as_str(), false).into())
		.collect::<HashMap<&str, bool>>();

	for entry in WalkDir::new(&series.path)
		.into_iter()
		.filter_map(|e| e.ok())
		.filter(|e| e.path().is_file())
	{
		let entry_path = entry.path();

		log::info!("Currently scanning: {:?}", entry_path);

		on_progress(format!("Analyzing {:?}", entry_path));

		// Just a query to slow it down a little to mimick an insertion or something each iteration
		let _res = ctx
			.db
			._query_raw::<media::Data>(raw!("SELECT * FROM media"))
			.await;
	}
}

pub async fn scan_concurrent(ctx: Context, path: String) -> Result<(), ApiError> {
	let (library, series) = precheck(&ctx, path).await?;

	// let counter = Arc::new(Mutex::new(0));

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

	println!(
		"Files to process: {:?} (calculated in {}.{:03} seconds)",
		files_to_process,
		duration.as_secs(),
		duration.subsec_millis()
	);

	let tasks: Vec<JoinHandle<()>> = series
		.into_iter()
		// .cloned()
		.map(|s| {
			let ctx_cpy = ctx.get_ctx();

			// let counter_ref = counter.clone();

			tokio::spawn(async move {
				scan_series(ctx_cpy.get_ctx(), s, move |_msg| {
					// let mut shared = counter_ref.lock().unwrap();

					// *shared += 1;

					// println!("{:?} - {:?}", msg, shared);

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

pub async fn scan_sync(ctx: Context, path: String) -> Result<(), ApiError> {
	let (library, series) = precheck(&ctx, path).await?;

	// let counter = Arc::new(Mutex::new(0));
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

	println!(
		"Files to process: {} (calculated in {}.{:03} seconds)",
		files_to_process,
		duration.as_secs(),
		duration.subsec_millis()
	);

	for s in series {
		scan_series(ctx.get_ctx(), s, move |_msg| {
			// counter += 1;

			// println!("{:?} - {:?}", msg, counter);

			// let _ = ctx_cpy.job_progress(ClientEvent::job_progress(
			// 	"runnerid".to_string(),
			// 	counter as u64,
			// 	files_to_process,
			// 	Some(msg),
			// ));
		})
		.await;
	}

	Ok(())
}

#[cfg(test)]
mod tests {
	use rocket::tokio;

	use crate::config::context::*;

	// use crate::prisma::*;
	use crate::types::errors::ApiError;

	#[tokio::test(flavor = "multi_thread")]
	async fn scan_concurrent() -> Result<(), ApiError> {
		let ctx = Context::mock().await;

		let start = std::time::Instant::now();
		super::scan_concurrent(
			ctx,
			"/Users/aaronleopold/Documents/Stump/Demo".to_string(),
		)
		.await?;
		let duration = start.elapsed();

		println!(
			"Concurrent: {}.{:03} seconds",
			duration.as_secs(),
			duration.subsec_millis()
		);

		Ok(())
	}

	#[tokio::test(flavor = "multi_thread")]
	async fn scan_sync() -> Result<(), ApiError> {
		let ctx = Context::mock().await;

		let start = std::time::Instant::now();
		super::scan_sync(ctx, "/Users/aaronleopold/Documents/Stump/Demo".to_string())
			.await?;
		let duration = start.elapsed();

		println!(
			"Sync: {}.{:03} seconds",
			duration.as_secs(),
			duration.subsec_millis()
		);

		Ok(())
	}
}

use std::sync::Arc;

use crate::{
	db::entity::LibraryOptions,
	filesystem::scanner::LibraryScanJob,
	job::WrappedJob,
	prisma::{job_schedule_config, library},
	CoreResult, Ctx,
};

// TODO: refactor this!
// 1. Schedule multiple job types (complex config)
// 2. Last run timestamp, so on boot we don't immediately trigger the scheduled tasks

pub struct JobScheduler {
	pub scheduler_handle: Option<tokio::task::JoinHandle<()>>,
}

impl JobScheduler {
	pub async fn init(core_ctx: Arc<Ctx>) -> CoreResult<Arc<Self>> {
		let client = core_ctx.db.clone();

		let result = client
			.job_schedule_config()
			.find_first(vec![])
			.with(job_schedule_config::excluded_libraries::fetch(vec![]))
			.exec()
			.await?;

		if let Some(schedule_config) = result {
			tracing::info!(
				?schedule_config,
				"Found schedule config. Initializing scheduler."
			);

			let excluded_library_ids = schedule_config
				.excluded_libraries()
				.cloned()
				.unwrap_or_else(|e| {
					tracing::error!(?e, "Failed to fetch excluded libraries");
					vec![]
				})
				.into_iter()
				.map(|l| l.id)
				.collect::<Vec<String>>();

			let interval_secs: u64 = schedule_config
				.interval_secs
				.try_into()
				.unwrap_or_else(|e| {
					tracing::error!(
						?e,
						"Failed to convert configured interval_secs to u64"
					);
					86400
				});

			let handle = tokio::spawn(async move {
				let scheduler_ctx = core_ctx.clone();
				let client = scheduler_ctx.db.clone();
				let mut interval =
					tokio::time::interval(std::time::Duration::from_secs(interval_secs));

				// TODO: Support persisting/resuming the scheduler state so that it can be resumed
				loop {
					interval.tick().await;

					tracing::info!("Scanning libraries on schedule");
					let libraries_to_scan = client
						.library()
						.find_many(vec![library::id::not_in_vec(
							excluded_library_ids.clone(),
						)])
						.with(library::library_options::fetch())
						.exec()
						.await
						.unwrap_or_else(|e| {
							tracing::error!(?e, "Failed to fetch libraries to scan");
							vec![]
						});

					for library in libraries_to_scan.iter() {
						// TODO: support default scan mode on libraries
						// let scan_mode = library.default_scan_mode.clone();
						let library_path = library.path.clone();
						let options = library.library_options().ok().take();
						let result =
							scheduler_ctx.enqueue_job(WrappedJob::new(LibraryScanJob {
								id: library.id.clone(),
								path: library_path,
								options: options.map(LibraryOptions::from),
							}));
						if result.is_err() {
							tracing::error!(
								?library,
								"Failed to dispatch scan job for library"
							);
						}
					}
				}
			});

			Ok(Arc::new(Self {
				scheduler_handle: Some(handle),
			}))
		} else {
			tracing::info!("No schedule config found. Scheduling is disabled.");
			Ok(Arc::new(Self {
				scheduler_handle: None,
			}))
		}
	}
}

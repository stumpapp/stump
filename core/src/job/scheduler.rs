use std::sync::Arc;

use entity::{
	job_schedule_config, library, library_config,
	sea_orm::{prelude::*, Iterable, QuerySelect},
};

use crate::{
	db::entity::LibraryConfig, filesystem::scanner::LibraryScanJob, job::WrappedJob,
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
		let conn = core_ctx.conn.as_ref();

		let result = job_schedule_config::Entity::find()
			.select_only()
			.columns(job_schedule_config::Column::iter())
			.column(library::Column::Id)
			.find_with_related(library::Entity)
			.all(conn)
			.await?
			.pop();

		if let Some((schedule_config, excluded_libraries)) = result {
			tracing::info!(
				?schedule_config,
				"Found schedule config. Initializing scheduler."
			);

			let excluded_library_ids = excluded_libraries
				.into_iter()
				.map(|library| library.id)
				.collect::<Vec<_>>();

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
				let conn = scheduler_ctx.conn.clone();
				let mut interval =
					tokio::time::interval(std::time::Duration::from_secs(interval_secs));

				// TODO: Support persisting/resuming the scheduler state so that it can be resumed
				loop {
					interval.tick().await;

					tracing::info!("Scanning libraries on schedule");

					let libraries_to_scan = library::Entity::find()
						.select_only()
						.column(library::Column::Id)
						.column(library::Column::Path)
						.columns(library_config::Column::iter())
						.filter(
							library::Column::Id.is_not_in(excluded_library_ids.clone()),
						)
						.find_also_related(library_config::Entity)
						.all(conn.as_ref())
						.await
						.unwrap_or_else(|e| {
							tracing::error!(?e, "Failed to fetch libraries to scan");
							vec![]
						});

					for (library, config) in &libraries_to_scan {
						let library_path = library.path.clone();
						// TODO(sea-orm): Fix
						// let result =
						// 	scheduler_ctx.enqueue_job(WrappedJob::new(LibraryScanJob {
						// 		id: library.id.clone(),
						// 		path: library_path,
						// 		config: config.map(LibraryConfig::from),
						// 		options: Default::default(),
						// 	}));
						// if result.is_err() {
						// 	tracing::error!(
						// 		?library,
						// 		"Failed to dispatch scan job for library"
						// 	);
						// }
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

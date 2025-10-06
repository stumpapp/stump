use std::sync::Arc;

use crate::{filesystem::scanner::LibraryScanJob, job::WrappedJob, CoreResult, Ctx};
use models::entity::{
	library, library_config, scheduled_job_config, scheduled_job_library,
};
use sea_orm::prelude::*;

// TODO(scheduler): Support multiple scheduled job configs
// TODO(scheduler): Last run timestamp, so on boot we don't immediately trigger the scheduled tasks
// TODO(graphql): Be sure to add note in release notes about the inverted logic of the scheduler, where
// libraries are opt-in rather than opt-out. This is a "breaking" change for the scheduler config

pub struct JobScheduler {
	pub scheduler_handle: Option<tokio::task::JoinHandle<()>>,
}

impl JobScheduler {
	pub async fn init(core_ctx: Arc<Ctx>) -> CoreResult<Arc<Self>> {
		let conn = core_ctx.conn.as_ref();

		let result = scheduled_job_config::Entity::find()
			.find_with_linked(scheduled_job_library::ScheduledJobConfigsToLibraries)
			.all(conn)
			.await?
			.pop();

		if let Some((schedule_config, included_libraries)) = result {
			tracing::info!(
				?schedule_config,
				"Found schedule config. Initializing scheduler."
			);

			let included_library_ids = included_libraries
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
						.filter(library::Column::Id.is_in(included_library_ids.clone()))
						.find_also_related(library_config::Entity)
						.all(conn.as_ref())
						.await
						.unwrap_or_else(|e| {
							tracing::error!(?e, "Failed to fetch libraries to scan");
							vec![]
						});

					for (library, config) in &libraries_to_scan {
						let library_path = library.path.clone();
						let result =
							scheduler_ctx.enqueue_job(WrappedJob::new(LibraryScanJob {
								id: library.id.clone(),
								path: library_path,
								config: config.clone(),
								options: Default::default(),
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

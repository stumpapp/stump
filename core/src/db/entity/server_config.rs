use serde::{Deserialize, Serialize};
use specta::Type;
use utoipa::ToSchema;

use crate::prisma::{job_schedule_config, server_config};

use super::Library;

#[derive(Debug, Clone, Deserialize, Serialize, Type, ToSchema)]
pub struct ServerConfig {
	pub id: String,
	pub job_scheduler_config: Option<JobSchedulerConfig>,
}

#[derive(Debug, Clone, Deserialize, Serialize, Type, ToSchema)]
pub struct JobSchedulerConfig {
	id: String,
	interval_secs: i32,
	#[schema(no_recursion)]
	excluded_libraries: Vec<Library>,
}

impl From<server_config::Data> for ServerConfig {
	fn from(data: server_config::Data) -> Self {
		let job_scheduler_config = match data.job_schedule_config() {
			Ok(job_scheduler_config) => {
				job_scheduler_config.cloned().map(JobSchedulerConfig::from)
			},
			Err(_) => None,
		};
		Self {
			id: data.id,
			job_scheduler_config,
		}
	}
}

impl From<job_schedule_config::Data> for JobSchedulerConfig {
	fn from(data: job_schedule_config::Data) -> Self {
		let excluded_libraries = data.excluded_libraries().cloned().unwrap_or_default();
		Self {
			id: data.id,
			interval_secs: data.interval_secs,
			excluded_libraries: excluded_libraries
				.into_iter()
				.map(Library::from)
				.collect(),
		}
	}
}

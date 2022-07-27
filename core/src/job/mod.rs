pub mod jobs;
pub mod pool;
pub mod runner;

use std::fmt::Debug;

use serde::{Deserialize, Serialize};

use crate::{config::context::Ctx, types::errors::ApiError};

// This entire `job` crate was *heavily* inspired by the `job` crate from spacedrive.
// https://github.com/spacedriveapp/spacedrive/tree/main/core/src/job
// This taught me a lot and honestly it would have taken me forever without the reference.
// HOWEVER, it is still really not an optimal solution. It's a little messy,
// and a little all over the place, and it isn't structured in a way that makes it easy
// for the UI to consume. But, for now it works. It will have a lot of changes very soon...

#[derive(Clone, Serialize, Deserialize, Debug)]
pub enum JobStatus {
	#[serde(rename = "Running")]
	Running,
	#[serde(rename = "Completed")]
	Completed,
	#[serde(rename = "Failed")]
	Failed,
}

#[derive(Clone, Serialize, Deserialize, Debug)]
#[serde(rename_all = "camelCase")]
pub struct JobUpdate {
	pub runner_id: String,
	pub current_task: u64,
	pub task_count: u64,
	pub message: Option<String>,
	pub status: Option<JobStatus>,
}

#[async_trait::async_trait]
pub trait Job: Send + Sync + Debug {
	async fn run(&self, runner_id: String, ctx: Ctx) -> Result<(), ApiError>;
}

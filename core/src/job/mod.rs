pub mod library_scan;
pub mod pool;
pub mod runner;

use std::fmt::Debug;

use serde::{Deserialize, Serialize};

use crate::{config::context::Ctx, types::errors::ApiError};

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
	// TODO: change this to data: Option<T: Serialize> or something...
	pub message: Option<String>,
	pub status: Option<JobStatus>,
}

#[async_trait::async_trait]
pub trait Job: Send + Sync + Debug {
	async fn run(&self, runner_id: String, ctx: Ctx) -> Result<(), ApiError>;
}

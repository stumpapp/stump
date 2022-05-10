pub mod jobs;
pub mod runner;

use std::fmt::Debug;

use serde::{Deserialize, Serialize};

use crate::{config::context::Context, types::errors::ApiError};

#[derive(Clone, Serialize, Deserialize)]
pub struct JobUpdate;

#[async_trait::async_trait]
pub trait Job: Send + Sync + Debug {
	async fn run(&self, ctx: Context) -> Result<(), ApiError>;
}

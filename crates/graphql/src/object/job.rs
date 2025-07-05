use async_graphql::{
	dataloader::DataLoader, ComplexObject, Context, Json, Result, SimpleObject,
};
use models::{entity::job, shared::enums::UserPermission};
use stump_core::job::CoreJobOutput;

use crate::{
	guard::PermissionGuard, loader::log::JobAssociatedLogLoader, object::log::Log,
};

#[derive(Debug, SimpleObject)]
#[graphql(complex)]
pub struct Job {
	#[graphql(flatten)]
	pub model: job::Model,
}

impl From<job::Model> for Job {
	fn from(entity: job::Model) -> Self {
		Self { model: entity }
	}
}

#[ComplexObject]
impl Job {
	async fn output_data(&self) -> Option<CoreJobOutput> {
		match &self.model.output_data {
			Some(data) => serde_json::from_slice(data.as_ref())
				.map_err(|error| {
					tracing::error!(?error, "Failed to parse job output data");
					error
				})
				.ok(),
			None => None,
		}
	}

	async fn save_state(&self) -> Option<Json<serde_json::Value>> {
		match &self.model.save_state {
			Some(data) => serde_json::from_slice(data.as_ref())
				.map(Json)
				.map_err(|error| {
					tracing::error!(?error, "Failed to parse job save state");
					error
				})
				.ok(),
			None => None,
		}
	}

	#[graphql(guard = "PermissionGuard::one(UserPermission::ReadPersistedLogs)")]
	async fn log_count(&self, ctx: &Context<'_>) -> Result<u64> {
		let loader = ctx.data::<DataLoader<JobAssociatedLogLoader>>()?;

		let logs = loader
			.load_one(self.model.id.clone())
			.await?
			.unwrap_or_default();

		Ok(logs.len() as u64)
	}

	#[graphql(guard = "PermissionGuard::one(UserPermission::ReadPersistedLogs)")]
	async fn logs(&self, ctx: &Context<'_>) -> Result<Vec<Log>> {
		let loader = ctx.data::<DataLoader<JobAssociatedLogLoader>>()?;

		let logs = loader
			.load_one(self.model.id.clone())
			.await?
			.unwrap_or_default();

		Ok(logs)
	}
}

#[derive(SimpleObject)]
pub struct DeleteJobAssociatedLogs {
	/// The number of logs deleted that were related to a job
	pub affected_rows: u64,
}

#[derive(SimpleObject)]
pub struct DeleteJobHistory {
	/// The number of logs deleted that were related to a job
	pub affected_rows: u64,
}

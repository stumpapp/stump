use async_graphql::{ComplexObject, Json, Result, SimpleObject};
use models::{entity::job, shared::enums::UserPermission};
use stump_core::job::CoreJobOutput;

use crate::{guard::PermissionGuard, object::log::Log};

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
	async fn logs(&self) -> Result<Vec<Log>> {
		Ok(vec![])
	}
}

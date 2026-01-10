use async_graphql::dataloader::Loader;
use models::entity::log;
use sea_orm::prelude::*;
use sea_orm::DatabaseConnection;
use std::{collections::HashMap, sync::Arc};

use crate::object::log::Log;

pub struct JobAssociatedLogLoader {
	conn: Arc<DatabaseConnection>,
}

/// A loader for optimizing the loading of a log entity
impl JobAssociatedLogLoader {
	pub fn new(conn: Arc<DatabaseConnection>) -> Self {
		Self { conn }
	}
}

/// A type alias for the key used in the JobAssociatedLogLoader, which represents the job ID
pub type JobAssociatedLogLoaderKey = String;

impl Loader<JobAssociatedLogLoaderKey> for JobAssociatedLogLoader {
	type Value = Vec<Log>;
	type Error = Arc<sea_orm::error::DbErr>;

	async fn load(
		&self,
		keys: &[JobAssociatedLogLoaderKey],
	) -> Result<HashMap<JobAssociatedLogLoaderKey, Self::Value>, Self::Error> {
		let log_list = log::Entity::find()
			.filter(log::Column::JobId.is_in(keys.to_vec()))
			.all(self.conn.as_ref())
			.await?;

		let mut result = HashMap::new();

		for log in log_list {
			match log.job_id.as_deref() {
				Some(job_id) => {
					let job_id = job_id.to_string();
					result
						.entry(job_id)
						.or_insert_with(Vec::new)
						.push(Log::from(log));
				},
				None => {
					tracing::warn!(
						"Log entry with no associated job ID found: {:?}",
						log
					);
				},
			}
		}

		Ok(result)
	}
}

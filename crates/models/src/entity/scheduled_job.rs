use sea_orm::entity::prelude::*;
use serde::{Deserialize, Serialize};

use crate::shared::enums::{MetadataFetchStatus, ScheduledJobKind};

#[derive(Clone, Debug, PartialEq, DeriveEntityModel, Eq, Serialize, Deserialize)]
#[sea_orm(table_name = "scheduled_jobs")]
pub struct Model {
	#[sea_orm(primary_key, auto_increment = true)]
	pub id: i32,
	#[sea_orm(column_type = "Text")]
	pub name: String,
	pub kind: ScheduledJobKind,
	/// A cron expression (e.g. "0 0 * * *" for daily at midnight)
	#[sea_orm(column_type = "Text")]
	pub schedule: String,
	#[sea_orm(column_type = "Json", nullable)]
	pub config: Option<serde_json::Value>,
	pub enabled: bool,
	pub created_at: DateTimeUtc,
	pub last_run_at: Option<DateTimeUtc>,
}

#[derive(Copy, Clone, Debug, EnumIter, DeriveRelation)]
pub enum Relation {}

impl ActiveModelBehavior for ActiveModel {}

/// Configuration for a library scan scheduled job
#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct LibraryScanConfig {
	/// The library IDs to scan. An empty vec is treated as "all libraries"
	pub library_ids: Vec<String>,
}

/// Configuration for a metadata retry scheduled job
#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct MetadataRetryConfig {
	/// Which statuses to retry
	pub statuses: Vec<MetadataFetchStatus>,
}

impl Model {
	pub fn library_scan_config(&self) -> Option<LibraryScanConfig> {
		self.config
			.as_ref()
			.and_then(|v| serde_json::from_value(v.clone()).ok())
	}

	pub fn metadata_retry_config(&self) -> Option<MetadataRetryConfig> {
		self.config
			.as_ref()
			.and_then(|v| serde_json::from_value(v.clone()).ok())
	}
}

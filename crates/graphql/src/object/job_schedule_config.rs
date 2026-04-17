use async_graphql::SimpleObject;
use models::entity::scheduled_job;
use models::shared::enums::ScheduledJobKind;
use sea_orm::prelude::DateTimeUtc;

#[derive(Debug, SimpleObject)]
pub struct ScheduledJob {
	pub id: i32,
	pub name: String,
	pub kind: ScheduledJobKind,
	pub schedule: String,
	pub config: Option<serde_json::Value>,
	pub enabled: bool,
	pub created_at: DateTimeUtc,
	pub last_run_at: Option<DateTimeUtc>,
}

impl From<scheduled_job::Model> for ScheduledJob {
	fn from(m: scheduled_job::Model) -> Self {
		Self {
			id: m.id,
			name: m.name,
			kind: m.kind,
			schedule: m.schedule,
			config: m.config,
			enabled: m.enabled,
			created_at: m.created_at,
			last_run_at: m.last_run_at,
		}
	}
}

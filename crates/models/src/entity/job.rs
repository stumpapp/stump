use async_graphql::SimpleObject;
use async_trait::async_trait;
use chrono::Utc;
use sea_orm::{entity::prelude::*, ActiveValue::Set, FromQueryResult};

use crate::shared::enums::JobStatus;

#[derive(Clone, Debug, PartialEq, DeriveEntityModel, Eq, SimpleObject)]
#[graphql(name = "JobModel")]
#[sea_orm(table_name = "jobs")]
pub struct Model {
	#[sea_orm(primary_key, auto_increment = false, column_type = "Text")]
	pub id: String,
	#[sea_orm(column_type = "Text")]
	pub name: String,
	#[sea_orm(column_type = "Text", nullable)]
	pub description: Option<String>,
	#[sea_orm(column_type = "Text")]
	pub status: JobStatus,
	#[sea_orm(column_type = "Blob", nullable)]
	#[graphql(skip)]
	pub save_state: Option<Vec<u8>>,
	#[sea_orm(column_type = "Blob", nullable)]
	#[graphql(skip)]
	pub output_data: Option<Vec<u8>>,
	pub ms_elapsed: i64,
	#[sea_orm(column_type = "custom(\"DATETIME\")")]
	pub created_at: DateTimeWithTimeZone,
	#[sea_orm(column_type = "custom(\"DATETIME\")", nullable)]
	pub completed_at: Option<DateTimeWithTimeZone>,
}

#[derive(FromQueryResult)]
pub struct JobCreatedAtSelect {
	pub id: String,
	pub created_at: DateTimeWithTimeZone,
}

#[derive(FromQueryResult)]
pub struct JobStatusSelect {
	pub id: String,
	pub status: JobStatus,
}

#[derive(FromQueryResult)]
pub struct SaveStateSelect {
	pub save_state: Option<Vec<u8>>,
}

#[derive(Copy, Clone, Debug, EnumIter, DeriveRelation)]
pub enum Relation {
	#[sea_orm(has_one = "super::library_scan_record::Entity")]
	LibraryScanRecord,
	#[sea_orm(has_many = "super::log::Entity")]
	Log,
}

impl Related<super::library_scan_record::Entity> for Entity {
	fn to() -> RelationDef {
		Relation::LibraryScanRecord.def()
	}
}

impl Related<super::log::Entity> for Entity {
	fn to() -> RelationDef {
		Relation::Log.def()
	}
}

#[async_trait]
impl ActiveModelBehavior for ActiveModel {
	async fn before_save<C>(mut self, _db: &C, insert: bool) -> Result<Self, DbErr>
	where
		C: ConnectionTrait,
	{
		if insert {
			if self.id.is_not_set() {
				self.id = Set(uuid::Uuid::new_v4().to_string());
			}
			self.ms_elapsed = Set(0);
			self.created_at = Set(DateTimeWithTimeZone::from(Utc::now()));
			if self.status.is_not_set() {
				self.status = Set(JobStatus::Queued);
			}
		}

		Ok(self)
	}
}

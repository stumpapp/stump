

use sea_orm::entity::prelude::*;

#[derive(Clone, Debug, PartialEq, DeriveEntityModel, Eq)]
#[sea_orm(table_name = "server_config")]
pub struct Model {
	#[sea_orm(primary_key, auto_increment = false, column_type = "Text")]
	pub id: String,
	#[sea_orm(column_type = "Text", nullable)]
	pub public_url: Option<String>,
	pub initial_wal_setup_complete: bool,
	#[sea_orm(column_type = "Text", nullable, unique)]
	pub job_schedule_config_id: Option<String>,
	#[sea_orm(column_type = "Text", nullable)]
	pub encryption_key: Option<String>,
}

#[derive(Copy, Clone, Debug, EnumIter, DeriveRelation)]
pub enum Relation {
	#[sea_orm(
		belongs_to = "super::job_schedule_config::Entity",
		from = "Column::JobScheduleConfigId",
		to = "super::job_schedule_config::Column::Id",
		on_update = "Cascade",
		on_delete = "SetNull"
	)]
	JobScheduleConfigs,
}

impl Related<super::job_schedule_config::Entity> for Entity {
	fn to() -> RelationDef {
		Relation::JobScheduleConfigs.def()
	}
}

impl ActiveModelBehavior for ActiveModel {}

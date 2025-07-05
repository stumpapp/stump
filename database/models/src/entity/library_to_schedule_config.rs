use sea_orm::entity::prelude::*;

#[derive(Clone, Debug, PartialEq, DeriveEntityModel, Eq)]
#[sea_orm(table_name = "_library_to_schedule_config")]
pub struct Model {
	#[sea_orm(primary_key)]
	pub id: i32,
	#[sea_orm(column_type = "Text")]
	pub schedule_id: String,
	#[sea_orm(column_type = "Text")]
	pub library_id: String,
}

#[derive(Copy, Clone, Debug, EnumIter, DeriveRelation)]
pub enum Relation {
	#[sea_orm(
		belongs_to = "super::library::Entity",
		from = "Column::LibraryId",
		to = "super::library::Column::Id",
		on_update = "Cascade",
		on_delete = "Cascade"
	)]
	Library,
	#[sea_orm(
		belongs_to = "super::job_schedule_config::Entity",
		from = "Column::ScheduleId",
		to = "super::job_schedule_config::Column::Id",
		on_update = "Cascade",
		on_delete = "Cascade"
	)]
	ScheduleConfig,
}

impl Related<super::library::Entity> for Entity {
	fn to() -> RelationDef {
		Relation::Library.def()
	}
}

impl Related<super::job_schedule_config::Entity> for Entity {
	fn to() -> RelationDef {
		Relation::ScheduleConfig.def()
	}
}

impl ActiveModelBehavior for ActiveModel {}

use sea_orm::{entity::prelude::*, LinkDef, Linked};

#[derive(Clone, Debug, PartialEq, DeriveEntityModel, Eq)]
#[sea_orm(table_name = "scheduled_job_libraries")]
pub struct Model {
	#[sea_orm(primary_key)]
	pub id: i32,
	pub schedule_id: i32,
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
		belongs_to = "super::scheduled_job_config::Entity",
		from = "Column::ScheduleId",
		to = "super::scheduled_job_config::Column::Id",
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

impl Related<super::scheduled_job_config::Entity> for Entity {
	fn to() -> RelationDef {
		Relation::ScheduleConfig.def()
	}
}

// Linked implementation for library to scheduled job configs
pub struct LibraryToScheduledJobConfigs;

impl Linked for LibraryToScheduledJobConfigs {
	type FromEntity = super::library::Entity;
	type ToEntity = super::scheduled_job_config::Entity;

	fn link(&self) -> Vec<LinkDef> {
		vec![
			super::library::Entity::belongs_to(Entity)
				.from(super::library::Column::Id)
				.to(Column::LibraryId)
				.into(),
			Entity::belongs_to(super::scheduled_job_config::Entity)
				.from(Column::ScheduleId)
				.to(super::scheduled_job_config::Column::Id)
				.into(),
		]
	}
}

// Reverse linked implementation for scheduled job configs to libraries
pub struct ScheduledJobConfigsToLibraries;

impl Linked for ScheduledJobConfigsToLibraries {
	type FromEntity = super::scheduled_job_config::Entity;
	type ToEntity = super::library::Entity;

	fn link(&self) -> Vec<LinkDef> {
		vec![
			super::scheduled_job_config::Entity::belongs_to(Entity)
				.from(super::scheduled_job_config::Column::Id)
				.to(Column::ScheduleId)
				.into(),
			Entity::belongs_to(super::library::Entity)
				.from(Column::LibraryId)
				.to(super::library::Column::Id)
				.into(),
		]
	}
}

impl ActiveModelBehavior for ActiveModel {}

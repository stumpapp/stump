use sea_orm::{entity::prelude::*, DerivePartialModel, FromQueryResult};

#[derive(Clone, Debug, PartialEq, DeriveEntityModel, Eq)]
#[sea_orm(table_name = "libraries")]
pub struct Model {
	#[sea_orm(primary_key, auto_increment = false, column_type = "Text")]
	pub id: String,
	#[sea_orm(column_type = "Text", unique)]
	pub name: String,
	#[sea_orm(column_type = "Text", nullable)]
	pub description: Option<String>,
	#[sea_orm(column_type = "Text", unique)]
	pub path: String,
	#[sea_orm(column_type = "Text")]
	pub status: String,
	#[sea_orm(column_type = "custom(\"DATETIME\")")]
	pub updated_at: String,
	#[sea_orm(column_type = "custom(\"DATETIME\")")]
	pub created_at: String,
	#[sea_orm(column_type = "Text", nullable)]
	pub emoji: Option<String>,
	#[sea_orm(column_type = "Text", unique)]
	pub config_id: String,
	#[sea_orm(column_type = "Text", nullable)]
	pub job_schedule_config_id: Option<String>,
	#[sea_orm(column_type = "custom(\"DATETIME\")", nullable)]
	pub last_scanned_at: Option<String>,
}

#[derive(Clone, Debug, DerivePartialModel, FromQueryResult)]
#[sea_orm(entity = "<Model as ModelTrait>::Entity")]
pub struct LibraryIdentModel {
	pub id: String,
	pub path: String,
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
	JobScheduleConfig,
	#[sea_orm(has_many = "super::last_library_visit::Entity")]
	LastLibraryVisit,
	#[sea_orm(
		belongs_to = "super::library_config::Entity",
		from = "Column::ConfigId",
		to = "super::library_config::Column::Id",
		on_update = "Cascade",
		on_delete = "Restrict"
	)]
	LibraryConfig,
	#[sea_orm(has_many = "super::library_scan_record::Entity")]
	LibraryScanRecords,
	#[sea_orm(has_many = "super::series::Entity")]
	Series,
}

impl Related<super::job_schedule_config::Entity> for Entity {
	fn to() -> RelationDef {
		Relation::JobScheduleConfig.def()
	}
}

impl Related<super::last_library_visit::Entity> for Entity {
	fn to() -> RelationDef {
		Relation::LastLibraryVisit.def()
	}
}

impl Related<super::library_config::Entity> for Entity {
	fn to() -> RelationDef {
		Relation::LibraryConfig.def()
	}
}

impl Related<super::library_scan_record::Entity> for Entity {
	fn to() -> RelationDef {
		Relation::LibraryScanRecords.def()
	}
}

impl Related<super::series::Entity> for Entity {
	fn to() -> RelationDef {
		Relation::Series.def()
	}
}

impl ActiveModelBehavior for ActiveModel {}

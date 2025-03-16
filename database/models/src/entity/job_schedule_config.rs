use sea_orm::entity::prelude::*;

#[derive(Clone, Debug, PartialEq, DeriveEntityModel, Eq)]
#[sea_orm(table_name = "job_schedule_configs")]
pub struct Model {
	#[sea_orm(primary_key, auto_increment = false, column_type = "Text")]
	pub id: String,
	pub interval_secs: i32,
}

#[derive(Copy, Clone, Debug, EnumIter, DeriveRelation)]
pub enum Relation {
	#[sea_orm(has_many = "super::library::Entity")]
	ExcludedLibraries,
	#[sea_orm(has_one = "super::server_config::Entity")]
	ServerConfig,
}

impl Related<super::library::Entity> for Entity {
	fn to() -> RelationDef {
		Relation::ExcludedLibraries.def()
	}
}

impl Related<super::server_config::Entity> for Entity {
	fn to() -> RelationDef {
		Relation::ServerConfig.def()
	}
}

impl ActiveModelBehavior for ActiveModel {}

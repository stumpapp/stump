use async_graphql::SimpleObject;
use sea_orm::entity::prelude::*;

#[derive(Clone, Debug, PartialEq, DeriveEntityModel, Eq, SimpleObject)]
#[sea_orm(table_name = "scheduled_job_configs")]
#[graphql(name = "ScheduledJobConfigModel")]
pub struct Model {
	#[sea_orm(primary_key, auto_increment = true)]
	pub id: i32,
	pub interval_secs: i32,
}

#[derive(Copy, Clone, Debug, EnumIter, DeriveRelation)]
pub enum Relation {
	#[sea_orm(has_many = "super::scheduled_job_library::Entity")]
	Libraries,
}

impl Related<super::scheduled_job_library::Entity> for Entity {
	fn to() -> RelationDef {
		Relation::Libraries.def()
	}
}

impl ActiveModelBehavior for ActiveModel {}

use async_graphql::SimpleObject;
use filter_gen::Ordering;
use sea_orm::{prelude::*, QueryOrder};

use crate::shared::{
	enums::LogLevel,
	ordering::{OrderBy, OrderDirection},
};

#[derive(Clone, Debug, PartialEq, DeriveEntityModel, Eq, SimpleObject, Ordering)]
#[graphql(name = "LogModel")]
#[sea_orm(table_name = "logs")]
pub struct Model {
	#[sea_orm(primary_key)]
	pub id: i32,
	#[sea_orm(column_type = "Text")]
	pub level: LogLevel,
	#[sea_orm(column_type = "Text")]
	pub message: String,
	#[sea_orm(column_type = "custom(\"DATETIME\")")]
	pub timestamp: DateTimeWithTimeZone,
	#[sea_orm(column_type = "Text", nullable)]
	pub job_id: Option<String>,
	#[sea_orm(column_type = "Text", nullable)]
	pub context: Option<String>,
}

#[derive(Copy, Clone, Debug, EnumIter, DeriveRelation)]
pub enum Relation {
	#[sea_orm(
		belongs_to = "super::job::Entity",
		from = "Column::JobId",
		to = "super::job::Column::Id",
		on_update = "Cascade",
		on_delete = "Cascade"
	)]
	Job,
}

impl Related<super::job::Entity> for Entity {
	fn to() -> RelationDef {
		Relation::Job.def()
	}
}

impl ActiveModelBehavior for ActiveModel {}

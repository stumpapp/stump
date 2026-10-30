use async_graphql::SimpleObject;
use filter_gen::Ordering;
use sea_orm::prelude::*;

use crate::shared::{
	enums::LogLevel,
	ordering::{OrderDirection, OrderingField},
};

use super::job;

#[sea_orm::model]
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
	#[sea_orm(
		belongs_to,
		from = "job_id",
		to = "id",
		on_update = "Cascade",
		on_delete = "Cascade"
	)]
	#[graphql(skip)]
	pub job: BelongsTo<Option<job::Entity>>,
}

impl ActiveModelBehavior for ActiveModel {}

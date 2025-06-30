use async_graphql::SimpleObject;
use sea_orm::{entity::prelude::*, FromQueryResult};

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
	pub status: String,
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
	pub completed_at: Option<String>,
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

impl ActiveModelBehavior for ActiveModel {}

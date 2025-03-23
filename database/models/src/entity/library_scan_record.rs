use async_graphql::SimpleObject;
use sea_orm::entity::prelude::*;

#[derive(Clone, Debug, PartialEq, DeriveEntityModel, Eq, SimpleObject)]
#[graphql(name = "LibraryScanRecordModel")]
#[sea_orm(table_name = "library_scan_records")]
pub struct Model {
	#[sea_orm(primary_key)]
	pub id: i32,
	#[sea_orm(column_type = "Blob", nullable)]
	pub options: Option<Vec<u8>>,
	#[sea_orm(column_type = "custom(\"DATETIME\")")]
	pub timestamp: DateTimeWithTimeZone,
	#[sea_orm(column_type = "Text")]
	pub library_id: String,
	#[sea_orm(column_type = "Text", nullable, unique)]
	pub job_id: Option<String>,
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
	#[sea_orm(
		belongs_to = "super::library::Entity",
		from = "Column::LibraryId",
		to = "super::library::Column::Id",
		on_update = "Cascade",
		on_delete = "Cascade"
	)]
	Library,
}

impl Related<super::job::Entity> for Entity {
	fn to() -> RelationDef {
		Relation::Job.def()
	}
}

impl Related<super::library::Entity> for Entity {
	fn to() -> RelationDef {
		Relation::Library.def()
	}
}

impl ActiveModelBehavior for ActiveModel {}

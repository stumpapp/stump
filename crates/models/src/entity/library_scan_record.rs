use async_graphql::SimpleObject;
use sea_orm::entity::prelude::*;

use super::{job, library};

#[sea_orm::model]
#[derive(Clone, Debug, PartialEq, DeriveEntityModel, Eq, SimpleObject)]
#[graphql(name = "LibraryScanRecordModel")]
#[sea_orm(table_name = "library_scan_records")]
pub struct Model {
	#[sea_orm(primary_key)]
	pub id: i32,
	#[graphql(skip)]
	#[sea_orm(column_type = "Blob", nullable)]
	pub options: Option<Vec<u8>>,
	#[sea_orm(column_type = "custom(\"DATETIME\")")]
	pub timestamp: DateTimeWithTimeZone,
	#[sea_orm(column_type = "Text")]
	pub library_id: String,
	#[sea_orm(column_type = "Text", nullable, unique)]
	pub job_id: Option<String>,
	#[sea_orm(
		belongs_to,
		from = "job_id",
		to = "id",
		on_update = "Cascade",
		on_delete = "Cascade"
	)]
	#[graphql(skip)]
	pub job: BelongsTo<Option<job::Entity>>,
	#[sea_orm(
		belongs_to,
		from = "library_id",
		to = "id",
		on_update = "Cascade",
		on_delete = "Cascade"
	)]
	#[graphql(skip)]
	pub library: BelongsTo<library::Entity>,
}

impl ActiveModelBehavior for ActiveModel {}

use sea_orm::{entity::prelude::*, FromQueryResult};

#[derive(Clone, Debug, PartialEq, DeriveEntityModel, Eq)]
#[sea_orm(table_name = "series")]
pub struct Model {
	#[sea_orm(primary_key, auto_increment = false, column_type = "Text")]
	pub id: String,
	#[sea_orm(column_type = "Text")]
	pub name: String,
	#[sea_orm(column_type = "Text", nullable)]
	pub description: Option<String>,
	#[sea_orm(column_type = "custom(\"DATETIME\")")]
	pub updated_at: DateTimeWithTimeZone,
	#[sea_orm(column_type = "custom(\"DATETIME\")")]
	pub created_at: DateTimeWithTimeZone,
	#[sea_orm(column_type = "Text")]
	pub path: String,
	#[sea_orm(column_type = "Text")]
	pub status: String,
	#[sea_orm(column_type = "Text", nullable)]
	pub library_id: Option<String>,
}

#[derive(FromQueryResult)]
pub struct SeriesIdentSelect {
	pub id: String,
	pub path: String,
}

pub struct ModelWithMetadata {
	pub series: Model,
	pub metadata: Option<super::series_metadata::Model>,
}

impl FromQueryResult for ModelWithMetadata {
	fn from_query_result(
		res: &sea_orm::QueryResult,
		_pre: &str,
	) -> Result<Self, sea_orm::DbErr> {
		let series = Model::from_query_result(res, Entity.table_name())?;
		let metadata = super::series_metadata::Model::from_query_result_optional(
			res,
			"series_metadata",
		)?;
		Ok(Self { series, metadata })
	}
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
	#[sea_orm(has_many = "super::media::Entity")]
	Media,
	#[sea_orm(has_one = "super::series_metadata::Entity")]
	SeriesMetadata,
}

impl Related<super::library::Entity> for Entity {
	fn to() -> RelationDef {
		Relation::Library.def()
	}
}

impl Related<super::media::Entity> for Entity {
	fn to() -> RelationDef {
		Relation::Media.def()
	}
}

impl Related<super::series_metadata::Entity> for Entity {
	fn to() -> RelationDef {
		Relation::SeriesMetadata.def()
	}
}

impl ActiveModelBehavior for ActiveModel {}

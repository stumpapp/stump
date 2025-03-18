use async_graphql::SimpleObject;
use sea_orm::entity::prelude::*;

#[derive(Clone, Debug, PartialEq, DeriveEntityModel, Eq, SimpleObject)]
#[graphql(name = "MediaMetadataModel")]
#[sea_orm(table_name = "media_metadata")]
pub struct Model {
	#[sea_orm(primary_key, auto_increment = true)]
	pub id: i32,
	#[sea_orm(column_type = "Text", nullable)]
	pub title: Option<String>,
	#[sea_orm(column_type = "Text", nullable)]
	pub series: Option<String>,
	pub number: Option<Decimal>,
	pub volume: Option<i32>,
	#[sea_orm(column_type = "Text", nullable)]
	pub summary: Option<String>,
	#[sea_orm(column_type = "Text", nullable)]
	pub notes: Option<String>,
	#[sea_orm(column_type = "Text", nullable)]
	pub genre: Option<String>,
	pub year: Option<i32>,
	pub month: Option<i32>,
	pub day: Option<i32>,
	#[sea_orm(column_type = "Text", nullable)]
	pub writers: Option<String>,
	#[sea_orm(column_type = "Text", nullable)]
	pub pencillers: Option<String>,
	#[sea_orm(column_type = "Text", nullable)]
	pub inkers: Option<String>,
	#[sea_orm(column_type = "Text", nullable)]
	pub colorists: Option<String>,
	#[sea_orm(column_type = "Text", nullable)]
	pub letterers: Option<String>,
	#[sea_orm(column_type = "Text", nullable)]
	pub cover_artists: Option<String>,
	#[sea_orm(column_type = "Text", nullable)]
	pub editors: Option<String>,
	#[sea_orm(column_type = "Text", nullable)]
	pub publisher: Option<String>,
	#[sea_orm(column_type = "Text", nullable)]
	pub links: Option<String>,
	#[sea_orm(column_type = "Text", nullable)]
	pub characters: Option<String>,
	#[sea_orm(column_type = "Text", nullable)]
	pub teams: Option<String>,
	pub page_count: Option<i32>,
	#[sea_orm(column_type = "Text", nullable, unique)]
	pub media_id: Option<String>,
	pub age_rating: Option<i32>,
}

#[derive(Copy, Clone, Debug, EnumIter, DeriveRelation)]
pub enum Relation {
	#[sea_orm(
		belongs_to = "super::media::Entity",
		from = "Column::MediaId",
		to = "super::media::Column::Id",
		on_update = "Cascade",
		on_delete = "Cascade"
	)]
	Media,
	#[sea_orm(has_one = "super::page_dimension::Entity")]
	PageDimension,
}

impl Related<super::media::Entity> for Entity {
	fn to() -> RelationDef {
		Relation::Media.def()
	}
}

impl Related<super::page_dimension::Entity> for Entity {
	fn to() -> RelationDef {
		Relation::PageDimension.def()
	}
}

impl ActiveModelBehavior for ActiveModel {}

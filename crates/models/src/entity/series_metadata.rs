use crate::shared::ordering::{OrderBy, OrderDirection};
use async_graphql::SimpleObject;
use filter_gen::Ordering;
use sea_orm::{entity::prelude::*, QueryOrder};

#[derive(Clone, Debug, PartialEq, DeriveEntityModel, Eq, SimpleObject, Ordering)]
#[graphql(name = "SeriesMetadataModel")]
#[sea_orm(table_name = "series_metadata")]
pub struct Model {
	#[sea_orm(primary_key, auto_increment = false, column_type = "Text")]
	pub series_id: String,
	pub age_rating: Option<i32>,
	#[sea_orm(column_type = "Text", nullable)]
	#[graphql(skip)]
	pub characters: Option<String>,
	#[sea_orm(column_type = "Text", nullable)]
	pub booktype: Option<String>,
	pub comicid: Option<i32>,
	#[sea_orm(column_type = "Text", nullable)]
	#[graphql(skip)]
	pub genres: Option<String>,
	#[sea_orm(column_type = "Text", nullable)]
	pub imprint: Option<String>,
	#[sea_orm(column_type = "Text", nullable)]
	#[graphql(skip)]
	pub links: Option<String>,
	#[sea_orm(column_type = "Text", nullable)]
	pub meta_type: Option<String>,
	#[sea_orm(column_type = "Text", nullable)]
	pub publisher: Option<String>,
	#[sea_orm(column_type = "Text", nullable)]
	pub status: Option<String>,
	#[sea_orm(column_type = "Text", nullable)]
	pub summary: Option<String>,
	#[sea_orm(column_type = "Text", nullable)]
	pub title: Option<String>,
	pub volume: Option<i32>,
	#[sea_orm(column_type = "Text", nullable)]
	#[graphql(skip)]
	pub writers: Option<String>,
}

#[derive(Copy, Clone, Debug, EnumIter, DeriveRelation)]
pub enum Relation {
	#[sea_orm(
		belongs_to = "super::series::Entity",
		from = "Column::SeriesId",
		to = "super::series::Column::Id",
		on_update = "Cascade",
		on_delete = "Cascade"
	)]
	Series,
}

impl Related<super::series::Entity> for Entity {
	fn to() -> RelationDef {
		Relation::Series.def()
	}
}

impl ActiveModelBehavior for ActiveModel {}

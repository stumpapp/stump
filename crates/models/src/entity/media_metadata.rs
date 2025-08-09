use async_graphql::SimpleObject;
use filter_gen::Ordering;
use sea_orm::{prelude::*, QueryOrder, QuerySelect};
use serde::Serialize;

use crate::shared::{
	ordering::{OrderBy, OrderDirection},
	page_dimension::PageAnalysis,
};

#[derive(
	Clone,
	Default,
	Debug,
	PartialEq,
	DeriveEntityModel,
	Eq,
	SimpleObject,
	Serialize,
	Ordering,
)]
#[graphql(name = "MediaMetadataModel")]
#[sea_orm(table_name = "media_metadata")]
pub struct Model {
	#[serde(skip_serializing)]
	#[sea_orm(primary_key, auto_increment = true)]
	pub id: i32,
	#[sea_orm(column_type = "Text", nullable, unique)]
	pub media_id: Option<String>,
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
	#[graphql(skip)]
	pub writers: Option<String>,
	#[sea_orm(column_type = "Text", nullable)]
	#[graphql(skip)]
	pub pencillers: Option<String>,
	#[sea_orm(column_type = "Text", nullable)]
	#[graphql(skip)]
	pub inkers: Option<String>,
	#[sea_orm(column_type = "Text", nullable)]
	#[graphql(skip)]
	pub colorists: Option<String>,
	#[sea_orm(column_type = "Text", nullable)]
	#[graphql(skip)]
	pub letterers: Option<String>,
	#[sea_orm(column_type = "Text", nullable)]
	#[graphql(skip)]
	pub cover_artists: Option<String>,
	#[sea_orm(column_type = "Text", nullable)]
	#[graphql(skip)]
	pub editors: Option<String>,
	#[sea_orm(column_type = "Text", nullable)]
	pub publisher: Option<String>,
	#[sea_orm(column_type = "Text", nullable)]
	#[graphql(skip)]
	pub links: Option<String>,
	#[sea_orm(column_type = "Text", nullable)]
	#[graphql(skip)]
	pub characters: Option<String>,
	#[sea_orm(column_type = "Text", nullable)]
	#[graphql(skip)]
	pub teams: Option<String>,
	pub page_count: Option<i32>,
	pub age_rating: Option<i32>,
	#[sea_orm(column_type = "Text", nullable)]
	pub page_analysis: Option<PageAnalysis>,
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

impl Entity {
	pub fn find_for_column(col: Column) -> Select<Entity> {
		Self::find()
			.select_only()
			.columns(vec![col])
			.filter(col.is_not_null())
			.order_by_asc(col)
			.distinct()
	}
}

#[cfg(test)]
mod tests {
	use super::*;
	use sea_orm::{sea_query::SqliteQueryBuilder, QueryTrait};

	#[test]
	fn test_find_for_column() {
		let actual = Entity::find_for_column(Column::Title)
			.into_query()
			.to_string(SqliteQueryBuilder);
		assert_eq!(actual, r#"SELECT DISTINCT "media_metadata"."title" FROM "media_metadata" WHERE "media_metadata"."title" IS NOT NULL ORDER BY "media_metadata"."title" ASC"#.to_string());
	}
}

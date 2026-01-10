use crate::shared::{
	ordering::{OrderBy, OrderDirection},
	series_metadata::CollectedItems,
};
use async_graphql::SimpleObject;
use filter_gen::Ordering;
use sea_orm::{entity::prelude::*, QueryOrder};

#[derive(Clone, Debug, PartialEq, DeriveEntityModel, Eq, SimpleObject, Ordering)]
#[graphql(name = "SeriesMetadataModel")]
#[sea_orm(table_name = "series_metadata")]
pub struct Model {
	#[sea_orm(primary_key, auto_increment = false, column_type = "Text")]
	pub series_id: String,
	/// Age rating of the series
	pub age_rating: Option<i32>,
	#[sea_orm(column_type = "Text", nullable)]
	#[graphql(skip)]
	pub characters: Option<String>,
	/// Booktype of the series (Print, OneShot, TPB or GN)
	#[sea_orm(column_type = "Text", nullable)]
	pub booktype: Option<String>,
	/// TPB or GN may collect various single issues/series. This will list them here
	#[sea_orm(column_type = "Json", nullable)]
	#[graphql(skip)]
	pub collects: Option<CollectedItems>,
	/// ComicVine comicid
	pub comicid: Option<i32>,
	/// Image URL pointing to CV image of series cover (usually issue #1)
	#[sea_orm(column_type = "Text", nullable)]
	pub comic_image: Option<String>,
	/// Description (summary) with line breaks, carriage returns, etc.
	#[sea_orm(column_type = "Text", nullable)]
	pub description_formatted: Option<String>,
	#[sea_orm(column_type = "Text", nullable)]
	#[graphql(skip)]
	pub genres: Option<String>,
	/// Name of imprint while under publisher
	#[sea_orm(column_type = "Text", nullable)]
	pub imprint: Option<String>,
	#[sea_orm(column_type = "Text", nullable)]
	#[graphql(skip)]
	pub links: Option<String>,
	/// Type of series (e.g. "comicSeries")
	#[sea_orm(column_type = "Text", nullable)]
	pub meta_type: Option<String>,
	/// Start and end of the series in "Month Year - Month Year" format. If series status is Continuing, the end value is "Present"
	#[sea_orm(column_type = "Text", nullable)]
	pub publication_run: Option<String>,
	/// Publisher name
	#[sea_orm(column_type = "Text", nullable)]
	pub publisher: Option<String>,
	/// Either "Continuing" or "Ended"
	#[sea_orm(column_type = "Text", nullable)]
	pub status: Option<String>,
	/// Description taken from source (un-edited) with no line breaks, carriage returns, etc.
	/// Stump calls this 'summary' to align with other models, but is derived from 'description_text' in series.json
	#[sea_orm(column_type = "Text", nullable)]
	pub summary: Option<String>,
	/// Title of series
	#[sea_orm(column_type = "Text", nullable)]
	pub title: Option<String>,
	/// Total issues in the series up until this point in time
	pub total_issues: Option<i32>,
	/// Volume of the series in relation to other titles (this can be either numerical or the series year)
	pub volume: Option<i32>,
	#[sea_orm(column_type = "Text", nullable)]
	#[graphql(skip)]
	pub writers: Option<String>,
	/// Year the series started (publication start)
	pub year: Option<i32>,
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

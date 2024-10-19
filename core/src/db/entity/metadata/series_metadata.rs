use order_by_gen::OrderByGen;
use serde::{Deserialize, Serialize};
use specta::Type;
use utoipa::ToSchema;

use crate::{db::query::IntoOrderBy, prisma::series_metadata};

use super::common::age_rating_deserializer;

#[derive(Debug, Clone, Deserialize, Serialize, Type, ToSchema)]
pub struct SeriesMetadata {
	/// The type of series. ex: "comicSeries"
	#[serde(alias = "type")]
	pub _type: String,
	/// The title of the series, renamed from 'name' to keep consistency with the rest of the models
	pub title: Option<String>,
	/// The associated series' description, renamed from 'description' to keep consistency with the rest of the models
	pub summary: Option<String>,
	/// The publisher of the associated series
	pub publisher: Option<String>,
	/// The name of the imprint while under the publisher
	pub imprint: Option<String>,
	/// The ComicVine id of the associated series
	pub comicid: Option<i32>,
	/// The volume of the series in relation to other titles (this can be either numerical or the series year)
	pub volume: Option<i32>,
	/// The booktype of the series, e.g. Print, OneShot, TPB or GN
	pub booktype: Option<String>,
	/// The age rating of the associated series
	#[serde(deserialize_with = "age_rating_deserializer")]
	pub age_rating: Option<i32>,
	/// The status of the associated series, e.g. Continuing, Ended
	pub status: Option<String>,
}

pub type SeriesMetadataCreateAction = (String, Vec<series_metadata::SetParam>);

impl SeriesMetadata {
	pub fn create_action(self) -> (String, Vec<series_metadata::SetParam>) {
		(
			self._type,
			vec![
				series_metadata::title::set(self.title),
				series_metadata::summary::set(self.summary),
				series_metadata::publisher::set(self.publisher),
				series_metadata::imprint::set(self.imprint),
				series_metadata::comicid::set(self.comicid),
				series_metadata::volume::set(self.volume),
				series_metadata::booktype::set(self.booktype),
				series_metadata::age_rating::set(self.age_rating),
				series_metadata::status::set(self.status),
			],
		)
	}
}

impl From<series_metadata::Data> for SeriesMetadata {
	fn from(metadata: series_metadata::Data) -> Self {
		SeriesMetadata {
			_type: metadata.meta_type,
			title: metadata.title,
			summary: metadata.summary,
			publisher: metadata.publisher,
			imprint: metadata.imprint,
			comicid: metadata.comicid,
			volume: metadata.volume,
			booktype: metadata.booktype,
			age_rating: metadata.age_rating,
			status: metadata.status,
		}
	}
}

#[derive(Default, Debug, Deserialize, Serialize, Type, ToSchema, OrderByGen)]
#[serde(rename_all = "snake_case")]
#[prisma(module = "series_metadata")]
pub enum SeriesMetadataOrderBy {
	#[default]
	Title,
	MetaType,
	Summary,
	Publisher,
	Imprint,
	Comicid,
	Volume,
	Booktype,
	AgeRating,
	Status,
}

use crate::{filesystem::FileError, utils::serde::age_rating_deserializer};
use models::entity::series_metadata;
use sea_orm::Set;
use serde::{Deserialize, Serialize};
use std::{fs::File, io::BufReader, path::Path};

#[derive(Debug, Clone, Deserialize, Serialize)]
pub struct ProcessedSeriesMetadata {
	/// The type of series. ex: "comicSeries"
	#[serde(alias = "type")]
	pub _type: Option<String>,
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

impl ProcessedSeriesMetadata {
	pub fn from_series_root(
		path: &Path,
	) -> Result<Option<ProcessedSeriesMetadata>, FileError> {
		let series_json_path = path.join("series.json");
		if series_json_path.exists() {
			let series_json = SeriesJson::from_file(&series_json_path)?;
			Ok(Some(series_json.metadata))
		} else {
			Ok(None)
		}
	}

	pub fn into_active_model(self) -> series_metadata::ActiveModel {
		series_metadata::ActiveModel {
			meta_type: Set(self._type),
			title: Set(self.title),
			summary: Set(self.summary),
			publisher: Set(self.publisher),
			imprint: Set(self.imprint),
			comicid: Set(self.comicid),
			volume: Set(self.volume),
			booktype: Set(self.booktype),
			age_rating: Set(self.age_rating),
			status: Set(self.status),
			..Default::default()
		}
	}
}

#[derive(Debug, Deserialize, Serialize)]
pub struct SeriesJson {
	pub version: Option<String>,
	pub metadata: ProcessedSeriesMetadata,
}

impl SeriesJson {
	pub fn from_file(path: &Path) -> Result<SeriesJson, FileError> {
		let file = File::open(path)?;
		let reader = BufReader::new(file);
		let series_json: SeriesJson = serde_json::from_reader(reader)?;
		Ok(series_json)
	}
}

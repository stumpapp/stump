use crate::{filesystem::FileError, utils::serde::age_rating_deserializer};
use models::{
	entity::series_metadata,
	shared::series_metadata::{CollectedItem, CollectedItems},
};
use sea_orm::Set;
use serde::{Deserialize, Serialize};
use std::{fs::File, io::BufReader, path::Path};

/// Represents the processed series metadata extracted from a few different sources,
/// but primarily from the `series.json` file.
/// See https://github.com/mylar3/mylar3/wiki/series.json-schema-%28version-1.0.1%29
#[derive(Debug, Clone, Deserialize, Serialize)]
pub struct ProcessedSeriesMetadata {
	/// The type of series. ex: "comicSeries"
	#[serde(alias = "type")]
	pub _type: Option<String>,
	/// The title of the series, renamed from 'name' to keep consistency with the rest of the models
	#[serde(alias = "name")]
	pub title: Option<String>,
	/// The associated series' description (plain text, no formatting)
	#[serde(alias = "description_text")]
	pub summary: Option<String>,
	/// The formatted description with line breaks, carriage returns, etc.
	pub description_formatted: Option<String>,
	/// The publisher of the associated series
	pub publisher: Option<String>,
	/// The name of the imprint while under the publisher
	pub imprint: Option<String>,
	/// The ComicVine id of the associated series
	pub comicid: Option<i32>,
	/// The year the series started (publication start)
	pub year: Option<i32>,
	/// The volume of the series in relation to other titles (this can be either numerical or the series year)
	pub volume: Option<i32>,
	/// The booktype of the series, e.g. Print, OneShot, TPB or GN
	pub booktype: Option<String>,
	/// The age rating of the associated series
	#[serde(default, deserialize_with = "age_rating_deserializer")]
	pub age_rating: Option<i32>,
	/// TPB or GN may collect various single issues/series
	pub collects: Option<Vec<CollectedItem>>,
	/// Image URL pointing to the series cover (usually issue #1)
	#[serde(alias = "comicImage")]
	pub comic_image: Option<String>,
	/// Total issues in the series up until this point in time
	pub total_issues: Option<i32>,
	/// Start and end of the series in 'Month Year - Month Year' format
	pub publication_run: Option<String>,
	/// The status of the associated series, e.g. Continuing, Ended
	pub status: Option<String>,
}

impl ProcessedSeriesMetadata {
	pub fn from_series_root(
		path: &Path,
	) -> Result<Option<ProcessedSeriesMetadata>, FileError> {
		let series_json_path = path.join("series.json");

		if series_json_path.exists() {
			match SeriesJson::from_file(&series_json_path) {
				Ok(series_json) => Ok(Some(series_json.metadata)),
				Err(error) => {
					tracing::error!(
						?error,
						?series_json_path,
						"Failed to read series.json!"
					);
					Ok(None)
				},
			}
		} else {
			Ok(None)
		}
	}

	pub fn into_active_model(self) -> series_metadata::ActiveModel {
		series_metadata::ActiveModel {
			meta_type: Set(self._type),
			title: Set(self.title),
			summary: Set(self.summary),
			description_formatted: Set(self.description_formatted),
			publisher: Set(self.publisher),
			imprint: Set(self.imprint),
			comicid: Set(self.comicid),
			year: Set(self.year),
			volume: Set(self.volume),
			booktype: Set(self.booktype),
			age_rating: Set(self.age_rating),
			collects: Set(self.collects.map(CollectedItems::from)),
			comic_image: Set(self.comic_image),
			total_issues: Set(self.total_issues),
			publication_run: Set(self.publication_run),
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

#[cfg(test)]
mod tests {
	use super::*;

	#[test]
	fn test_deserialize_empty_metadata() {
		let json = r#"{"metadata": {}}"#;
		let result: Result<SeriesJson, _> = serde_json::from_str(json);

		assert!(
			result.is_ok(),
			"Should deserialize empty metadata without error"
		);

		let series_json = result.unwrap();
		assert!(series_json.metadata.age_rating.is_none());
		assert!(series_json.metadata.title.is_none());
		assert!(series_json.metadata.publisher.is_none());
	}

	#[test]
	fn test_deserialize_metadata_with_missing_age_rating() {
		let json =
			r#"{"metadata": {"title": "Test Series", "publisher": "Test Publisher"}}"#;
		let result: Result<SeriesJson, _> = serde_json::from_str(json);

		assert!(
			result.is_ok(),
			"Should deserialize metadata with missing age_rating field"
		);

		let series_json = result.unwrap();
		assert!(series_json.metadata.age_rating.is_none());
		assert_eq!(series_json.metadata.title, Some("Test Series".to_string()));
		assert_eq!(
			series_json.metadata.publisher,
			Some("Test Publisher".to_string())
		);
	}

	#[test]
	fn test_deserialize_metadata_with_null_age_rating() {
		let json = r#"{"metadata": {"age_rating": null, "title": "Test Series"}}"#;
		let result: Result<SeriesJson, _> = serde_json::from_str(json);

		assert!(
			result.is_ok(),
			"Should deserialize metadata with null age_rating"
		);

		let series_json = result.unwrap();
		assert!(series_json.metadata.age_rating.is_none());
		assert_eq!(series_json.metadata.title, Some("Test Series".to_string()));
	}

	#[test]
	fn test_deserialize_metadata_with_empty_age_rating() {
		let json = r#"{"metadata": {"age_rating": "", "title": "Test Series"}}"#;
		let result: Result<SeriesJson, _> = serde_json::from_str(json);

		assert!(
			result.is_ok(),
			"Should deserialize metadata with empty age_rating string"
		);

		let series_json = result.unwrap();
		assert!(series_json.metadata.age_rating.is_none());
		assert_eq!(series_json.metadata.title, Some("Test Series".to_string()));
	}
}

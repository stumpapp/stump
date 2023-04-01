use std::path::PathBuf;

use serde::{Deserialize, Serialize};
use specta::Type;

pub struct ProcessedMediaFile {
	pub thumbnail_path: Option<PathBuf>,
	pub path: PathBuf,
	pub checksum: Option<String>,
	pub metadata: Option<MediaMetadata>,
	pub pages: i32,
}

// Derived from ComicInfo.xml
#[derive(Debug, Serialize, Deserialize, PartialEq, Eq, Type, Default)]
pub struct MediaMetadata {
	#[serde(rename = "Series")]
	pub series: Option<String>,
	#[serde(rename = "Number")]
	pub number: Option<u32>,
	#[serde(rename = "Web")]
	pub web: Option<String>,
	#[serde(rename = "Summary")]
	pub summary: Option<String>,
	#[serde(rename = "Publisher")]
	pub publisher: Option<String>,
	#[serde(rename = "Genre")]
	pub genre: Option<String>,
	#[serde(rename = "PageCount")]
	pub page_count: Option<u32>,
}

// impl MediaMetadata {
// 	pub fn default() -> Self {
// 		Self {
// 			series: None,
// 			number: None,
// 			web: None,
// 			summary: None,
// 			publisher: None,
// 			genre: None,
// 			page_count: None,
// 		}
// 	}
// }

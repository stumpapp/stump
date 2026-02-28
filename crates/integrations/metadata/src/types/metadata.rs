use async_graphql::{SimpleObject, Union};
use serde::{Deserialize, Serialize};

use crate::types::PublicationStatus;

#[derive(Debug, Clone, Serialize, Deserialize, Union)]
pub enum ExternalMetadata {
	Media(ExternalMediaMetadata),
	Series(ExternalSeriesMetadata),
}

impl ExternalMetadata {
	/// Returns a reference to the series metadata if this is a Series variant
	pub fn as_series(&self) -> Option<&ExternalSeriesMetadata> {
		match self {
			Self::Series(s) => Some(s),
			_ => None,
		}
	}

	/// Returns a reference to the media metadata if this is a Media variant
	pub fn as_media(&self) -> Option<&ExternalMediaMetadata> {
		match self {
			Self::Media(m) => Some(m),
			_ => None,
		}
	}
}

// TODO: Hone the fields we can pull across different providers

/// Metadata about a media item from an external metadata provider
#[derive(Debug, Clone, Default, Serialize, Deserialize, SimpleObject)]
pub struct ExternalMediaMetadata {
	pub provider: String,
	pub external_id: String,

	pub title: Option<String>,
	pub summary: Option<String>,
	pub page_count: Option<i32>,

	pub series_name: Option<String>,
	pub series_external_id: Option<String>,
	pub number: Option<f32>, // TODO: string?

	pub day: Option<i32>,
	pub month: Option<i32>,
	pub year: Option<i32>,

	pub genres: Option<Vec<String>>,
	pub tags: Option<Vec<String>>,

	pub isbn: Option<String>,
	pub isbn_13: Option<String>,

	pub writers: Option<Vec<String>>,
	pub artists: Option<Vec<String>>,
	pub colorists: Option<Vec<String>>,
	pub letterers: Option<Vec<String>>,
	pub cover_artists: Option<Vec<String>>,

	pub cover_url: Option<String>,

	pub provider_url: Option<String>,
}

/// Metadata about a series from an external metadata provider
#[derive(Debug, Clone, Default, Serialize, Deserialize, SimpleObject)]
pub struct ExternalSeriesMetadata {
	pub provider: String,
	pub external_id: String,
	// pub provider_url: Option<String>,
	pub title: String,
	pub alternative_titles: Vec<String>,
	pub summary: Option<String>,
	pub status: Option<PublicationStatus>,
	pub year: Option<i32>,
	pub end_year: Option<i32>,

	pub genres: Option<Vec<String>>,
	pub tags: Option<Vec<String>>,
	pub age_rating: Option<String>,

	// TODO: Consider something like Vec<ExternalAuthor> to capture IDs
	pub authors: Option<Vec<String>>,
	pub artists: Option<Vec<String>>,
	pub publisher: Option<String>,

	pub cover_url: Option<String>,
	pub volume_count: Option<i32>,
}

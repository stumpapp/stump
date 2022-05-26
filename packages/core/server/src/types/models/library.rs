// use prisma_client_rust::chrono::{DateTime, FixedOffset};
use rocket_okapi::JsonSchema;
use serde::Serialize;

use crate::prisma;

use super::{series::Series, tag::Tag};

#[derive(Debug, Clone, Serialize, JsonSchema)]
#[serde(rename_all = "camelCase")]
pub struct Library {
	pub id: String,
	/// The name of the library. ex: "Marvel Comics"
	pub name: String,
	/// The description of the library. ex: "The best library ever"
	pub description: Option<String>,
	/// The path to the library. ex: "/home/user/Library"
	pub path: String,
	/// The status of the library since last scan or access. ex: "READY" or "MISSING"
	pub status: String,
	// The date in which the library was last updated. This is usually after a scan. ex: "2022-04-20 04:20:69"
	pub updated_at: String,
	/// The series that are in this library. Will be `None` only if the relation is not loaded.
	pub series: Option<Vec<Series>>,
	/// The tags associated with this library. Will be `None` only if the relation is not loaded.
	pub tags: Option<Vec<Tag>>,
}

impl Into<Library> for prisma::library::Data {
	fn into(self) -> Library {
		let series = match self.series() {
			Ok(series) => Some(series.into_iter().map(|s| s.to_owned().into()).collect()),
			Err(e) => {
				log::debug!("Failed to load series for library: {}", e);
				None
			},
		};

		let tags = match self.tags() {
			Ok(tags) => Some(tags.into_iter().map(|tag| tag.to_owned().into()).collect()),
			Err(e) => {
				log::debug!("Failed to load tags for library: {}", e);
				None
			},
		};

		Library {
			id: self.id,
			name: self.name,
			description: self.description,
			path: self.path,
			status: self.status,
			updated_at: self.updated_at.to_string(),
			series,
			tags,
		}
	}
}

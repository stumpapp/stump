use serde::{Deserialize, Serialize};
use specta::Type;
use utoipa::ToSchema;

use crate::{
	db::entity::Media,
	metadata_getters::{self, MetadataOutput, MetadataSourceError},
	prisma::metadata_source,
};

// A model representing a [`metadata_source::Data`] object in the database.
#[derive(Debug, Clone, Deserialize, Serialize, Type, ToSchema)]
pub struct MetadataSourceEntry {
	pub id: String,
	pub enabled: bool,
}

impl MetadataSourceEntry {
	pub async fn get_metadata(
		&self,
		media: &Media,
	) -> Result<MetadataOutput, MetadataSourceError> {
		metadata_getters::get_source_by_name(&self.id)?
			.get_metadata(media)
			.await
	}
}

impl From<metadata_source::Data> for MetadataSourceEntry {
	fn from(value: metadata_source::Data) -> Self {
		Self {
			id: value.id,
			enabled: value.enabled,
		}
	}
}

impl From<MetadataSourceEntry> for metadata_source::Data {
	fn from(value: MetadataSourceEntry) -> Self {
		Self {
			id: value.id,
			enabled: value.enabled,
		}
	}
}

#[cfg(test)]
mod tests {
	use super::*;

	#[tokio::test]
	async fn dev_test() {
		let test_media = Media {
			name: "Dune".to_string(),
			..Media::default()
		};

		let source = MetadataSourceEntry {
			id: "OpenLibrarySource".to_string(),
			enabled: true,
		};

		let title_from_source = source
			.get_metadata(&test_media)
			.await
			.unwrap()
			.title
			.unwrap();
		assert_eq!(title_from_source, "Dune");
	}
}

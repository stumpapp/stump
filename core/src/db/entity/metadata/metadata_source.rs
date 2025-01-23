use metadata_sources::{MetadataOutput, MetadataSourceError, MetadataSourceInput};
use serde::{Deserialize, Serialize};
use specta::Type;
use utoipa::ToSchema;

use crate::prisma::metadata_source;

// A model representing a [`metadata_source::Data`] object in the database.
#[derive(Debug, Clone, Deserialize, Serialize, Type, ToSchema)]
pub struct MetadataSourceEntry {
	/// The identifier assigned to the source.
	pub id: String,
	/// Whether the user has enabled the source.
	pub enabled: bool,
}

impl MetadataSourceEntry {
	pub async fn get_metadata(
		&self,
		input: &MetadataSourceInput,
	) -> Result<MetadataOutput, MetadataSourceError> {
		metadata_sources::get_source_by_name(&self.id)?
			.get_metadata(input)
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
		let test_input = MetadataSourceInput {
			name: "Dune".to_string(),
		};

		let source = MetadataSourceEntry {
			id: "OpenLibrarySource".to_string(),
			enabled: true,
		};

		let title_from_source = source
			.get_metadata(&test_input)
			.await
			.unwrap()
			.title
			.unwrap();
		assert_eq!(title_from_source, "Dune");
	}
}

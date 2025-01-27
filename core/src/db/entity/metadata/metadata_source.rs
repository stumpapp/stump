use serde::{Deserialize, Serialize};
use specta::Type;
use utoipa::ToSchema;

use crate::prisma;
use metadata_sources::{
	MetadataOutput, MetadataSourceError, MetadataSourceInput, SchemaField,
	SchemaFieldType, SchemaOutput,
};

// A model representing a [`metadata_source::Data`] object in the database.
#[derive(Debug, Clone, Deserialize, Serialize, Type, ToSchema)]
pub struct MetadataSourceEntry {
	/// The identifier assigned to the source.
	pub name: String,
	/// Whether the user has enabled the source.
	pub enabled: bool,
	/// The JSON-encoded config for the metadata source, if one exists.
	pub config: Option<String>,
}

#[derive(Debug, Clone, Serialize, Type, ToSchema)]
pub struct MetadataSourceSchema {
	pub fields: Vec<MetadataSourceSchemaField>,
}

impl From<SchemaOutput> for MetadataSourceSchema {
	fn from(value: SchemaOutput) -> Self {
		Self {
			fields: value
				.fields
				.into_iter()
				.map(MetadataSourceSchemaField::from)
				.collect(),
		}
	}
}

#[derive(Debug, Clone, Serialize, Type, ToSchema)]
pub struct MetadataSourceSchemaField {
	pub key: String,
	pub field_type: MetadataSourceSchemaFieldType,
}

impl From<SchemaField> for MetadataSourceSchemaField {
	fn from(value: SchemaField) -> Self {
		Self {
			key: value.key,
			field_type: value.field_type.into(),
		}
	}
}

#[derive(Debug, Clone, Serialize, Type, ToSchema)]
pub enum MetadataSourceSchemaFieldType {
	Integer,
	Float,
	String,
}

impl From<SchemaFieldType> for MetadataSourceSchemaFieldType {
	fn from(value: SchemaFieldType) -> Self {
		match value {
			SchemaFieldType::Integer => MetadataSourceSchemaFieldType::Integer,
			SchemaFieldType::Float => MetadataSourceSchemaFieldType::Float,
			SchemaFieldType::String => MetadataSourceSchemaFieldType::String,
		}
	}
}

impl MetadataSourceEntry {
	pub async fn get_metadata(
		&self,
		input: &MetadataSourceInput,
	) -> Result<MetadataOutput, MetadataSourceError> {
		metadata_sources::get_source_by_name(&self.name)?
			.get_metadata(input)
			.await
	}

	pub fn get_config_schema(&self) -> Option<MetadataSourceSchema> {
		match metadata_sources::get_source_by_name(&self.name) {
			Ok(source) => source.get_config_schema().map(MetadataSourceSchema::from),
			// No schema returned for
			Err(_) => None,
		}
	}
}

impl From<prisma::metadata_sources::Data> for MetadataSourceEntry {
	fn from(value: prisma::metadata_sources::Data) -> Self {
		Self {
			name: value.name,
			enabled: value.enabled,
			config: value.config,
		}
	}
}

impl From<MetadataSourceEntry> for prisma::metadata_sources::Data {
	fn from(value: MetadataSourceEntry) -> Self {
		Self {
			name: value.name,
			enabled: value.enabled,
			config: value.config,
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
			isbn: None,
		};

		let source = MetadataSourceEntry {
			name: "OpenLibrarySource".to_string(),
			enabled: true,
			config: None,
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

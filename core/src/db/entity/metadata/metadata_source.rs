use serde::{Deserialize, Serialize};
use specta::Type;
use utoipa::ToSchema;

use crate::prisma;
use metadata_sources::{
	ConfigSchema, MetadataOutput, MetadataSourceError, MetadataSourceInput, SchemaField,
	SchemaFieldType,
};

/// A model representing a [`metadata_source::Data`] object in the database.
#[derive(Debug, Clone, Deserialize, Serialize, Type, ToSchema)]
pub struct MetadataSourceEntry {
	/// The identifier assigned to the source.
	pub name: String,
	/// Whether the user has enabled the source.
	pub enabled: bool,
	/// The JSON-encoded config for the metadata source, if one exists.
	pub config: Option<String>,
}

impl MetadataSourceEntry {
	/// TODO - Document
	pub async fn get_metadata(
		&self,
		input: &MetadataSourceInput,
	) -> Result<MetadataOutput, MetadataSourceError> {
		metadata_sources::get_source_by_name(&self.name)?
			.get_metadata(input, &self.config)
			.await
	}

	/// TODO - Document
	pub fn validate_config(&self, config: Option<&String>) -> bool {
		// This really shouldn't happen, but return false if name doesn't resolve
		let source = match metadata_sources::get_source_by_name(&self.name) {
			Ok(s) => s,
			Err(_) => return false,
		};

		match source.get_config_schema() {
			// If there's no schema, we only succeed if there's also no config
			None => config.is_none(),
			// If there is a schema then we need to validate against it
			Some(schema) => match config {
				Some(config) => schema.validate_config(config),
				None => false,
			},
		}
	}

	/// TODO - Document
	pub fn get_config_schema(&self) -> Option<MetadataSourceSchema> {
		match metadata_sources::get_source_by_name(&self.name) {
			Ok(source) => source.get_config_schema().map(MetadataSourceSchema::from),
			// No schema returned for name
			Err(_) => None,
		}
	}
}

impl From<prisma::metadata_sources::Data> for MetadataSourceEntry {
	fn from(data: prisma::metadata_sources::Data) -> Self {
		Self {
			name: data.name,
			enabled: data.enabled,
			config: data.config,
		}
	}
}

impl From<MetadataSourceEntry> for prisma::metadata_sources::Data {
	fn from(entry: MetadataSourceEntry) -> Self {
		Self {
			name: entry.name,
			enabled: entry.enabled,
			config: entry.config,
		}
	}
}

#[derive(Debug, Clone, Serialize, Type, ToSchema)]
pub struct MetadataSourceSchema {
	pub fields: Vec<MetadataSourceSchemaField>,
}

impl From<ConfigSchema> for MetadataSourceSchema {
	fn from(value: ConfigSchema) -> Self {
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

#[cfg(test)]
mod tests {
	use super::*;

	#[tokio::test]
	async fn dev_test() {
		let test_input = MetadataSourceInput {
			title: "Dune".to_string(),
			isbn: None,
			series: None,
			number: None,
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

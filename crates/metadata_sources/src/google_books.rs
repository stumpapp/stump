use schemars::JsonSchema;
use serde::{Deserialize, Serialize};

use crate::{schema_parser::parse_schema, SchemaOutput};

use super::{MetadataOutput, MetadataSource, MetadataSourceError, MetadataSourceInput};

pub const SOURCE_NAME: &str = "Google Books";

pub struct GoogleBooksSource;

#[derive(Deserialize, Serialize, JsonSchema, Default)]
pub struct GoogleBooksConfig {
	api_key: Option<String>,
}

#[async_trait::async_trait]
impl MetadataSource for GoogleBooksSource {
	fn name(&self) -> &'static str {
		SOURCE_NAME
	}

	async fn get_metadata(
		&self,
		input: &MetadataSourceInput,
	) -> Result<MetadataOutput, MetadataSourceError> {
		todo!("Gotta implement the metadata getter for Google Books still!")
	}

	fn get_config_schema(&self) -> Option<SchemaOutput> {
		let schema = schemars::schema_for!(GoogleBooksConfig);
		Some(parse_schema(schema))
	}

	fn get_default_config(&self) -> Option<String> {
		Some(
			serde_json::to_string(&GoogleBooksConfig::default())
				.expect("GoogleBooksConfig should be serializable"),
		)
	}
}

#[cfg(test)]
mod tests {
	use super::*;

	#[tokio::test]
	async fn dev_test() {
		let source = GoogleBooksSource;

		let test_input = MetadataSourceInput {
			name: "Dune".to_string(),
			isbn: None,
		};
		let metadata_output = source.get_metadata(&test_input).await.unwrap();
		assert_eq!(metadata_output.title.unwrap(), "Dune");
	}
}

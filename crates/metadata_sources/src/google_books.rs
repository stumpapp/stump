use super::{MetadataOutput, MetadataSource, MetadataSourceError, MetadataSourceInput};

pub const SOURCE_NAME: &str = "Google Books";

pub struct GoogleBooksSource;

#[async_trait::async_trait]
impl MetadataSource for GoogleBooksSource {
	fn name(&self) -> &'static str {
		SOURCE_NAME
	}

	async fn get_metadata(
		&self,
		input: &MetadataSourceInput,
	) -> Result<MetadataOutput, MetadataSourceError> {
		todo!()
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
		};
		let metadata_output = source.get_metadata(&test_input).await.unwrap();
		assert_eq!(metadata_output.title.unwrap(), "Dune");
	}
}

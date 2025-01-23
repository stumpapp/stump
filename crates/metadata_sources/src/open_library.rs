use serde::Deserialize;

use super::{MetadataOutput, MetadataSource, MetadataSourceError, MetadataSourceInput};

pub const SOURCE_NAME: &str = "Open Library";

#[derive(Debug, Deserialize)]
struct OpenLibrarySearchResult {
	num_found: u32,
	docs: Vec<OpenLibraryDoc>,
}

#[derive(Debug, Deserialize)]
struct OpenLibraryDoc {
	title: String,
	author_name: Vec<String>,
}

pub struct OpenLibrarySource;

#[async_trait::async_trait]
impl MetadataSource for OpenLibrarySource {
	fn name(&self) -> &'static str {
		SOURCE_NAME
	}

	async fn get_metadata(
		&self,
		input: &MetadataSourceInput,
	) -> Result<MetadataOutput, MetadataSourceError> {
		let media_name = &input.name;
		let response_text = reqwest::get(format!(
			"https://openlibrary.org/search.json?q={media_name}"
		))
		.await?
		.text()
		.await?;

		let response: OpenLibrarySearchResult = serde_json::from_str(&response_text)?;

		// TODO - Fix dumb implementation, the cloning should be unnecessary.
		let first_doc = response.docs.first();
		let title = first_doc.map(|doc| doc.title.clone());
		let author = first_doc.and_then(|doc| doc.author_name.first().cloned());

		Ok(MetadataOutput { title, author })
	}
}

#[cfg(test)]
mod tests {
	use super::*;

	#[tokio::test]
	async fn dev_test() {
		let source = OpenLibrarySource;

		let test_input = MetadataSourceInput {
			name: "Dune".to_string(),
		};
		let metadata_output = source.get_metadata(&test_input).await.unwrap();
		assert_eq!(metadata_output.title.unwrap(), "Dune");
	}
}

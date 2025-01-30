//! This module contains the [OpenLibrary](https://openlibrary.org/developers/api) implementation of
//! the [`MetadataSource`] trait.

use serde::Deserialize;

use crate::ConfigSchema;

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
		_config: &Option<String>,
	) -> Result<MetadataOutput, MetadataSourceError> {
		let media_title = &input.title;
		let response = reqwest::get(format!(
			"https://openlibrary.org/search.json?q={media_title}"
		))
		.await?
		.json::<OpenLibrarySearchResult>()
		.await?;

		// TODO - Fix dumb implementation, the cloning should be unnecessary.
		let first_doc = response.docs.first();
		let title = first_doc.map(|doc| doc.title.clone());
		let mut authors = Vec::new();
		if let Some(doc) = first_doc {
			authors.extend(doc.author_name.clone());
		}

		Ok(MetadataOutput {
			title,
			authors,
			description: None,
			published: None,
		})
	}

	fn get_config_schema(&self) -> Option<ConfigSchema> {
		None
	}

	fn get_default_config(&self) -> Option<String> {
		None
	}
}

#[cfg(test)]
mod tests {
	use super::*;

	#[tokio::test]
	async fn dev_test() {
		let source = OpenLibrarySource;

		let test_input = MetadataSourceInput {
			title: "Dune".to_string(),
			isbn: None,
			series: None,
			number: None,
		};
		let metadata_output = source.get_metadata(&test_input, &None).await.unwrap();
		assert_eq!(metadata_output.title.unwrap(), "Dune");
	}
}

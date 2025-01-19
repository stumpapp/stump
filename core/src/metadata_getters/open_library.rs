use serde::Deserialize;

use super::{MetadataIntegrationError, MetadataOutput, MetadataSource};
use crate::db::entity::Media;

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

impl MetadataSource for OpenLibrarySource {
	async fn get_metadata(
		media: &Media,
	) -> Result<MetadataOutput, MetadataIntegrationError> {
		let media_name = &media.name;
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
		let test_media = Media {
			name: "Dune".to_string(),
			..Media::default()
		};
		let metadata_output = OpenLibrarySource::get_metadata(&test_media).await.unwrap();
		assert_eq!(metadata_output.title.unwrap(), "Dune");
	}
}

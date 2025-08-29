use async_graphql::{ComplexObject, SimpleObject};
use models::entity::series_metadata;
use stump_core::utils::serde::comma_separated_list_to_vec;

#[derive(Clone, Debug, SimpleObject)]
#[graphql(complex)]
pub struct SeriesMetadata {
	#[graphql(flatten)]
	pub model: series_metadata::Model,
}

impl From<series_metadata::Model> for SeriesMetadata {
	fn from(model: series_metadata::Model) -> Self {
		Self { model }
	}
}

#[ComplexObject]
impl SeriesMetadata {
	async fn characters(&self) -> Vec<String> {
		self.model
			.characters
			.clone()
			.map(comma_separated_list_to_vec)
			.unwrap_or_default()
	}

	async fn genres(&self) -> Vec<String> {
		self.model
			.genres
			.clone()
			.map(comma_separated_list_to_vec)
			.unwrap_or_default()
	}

	async fn links(&self) -> Vec<String> {
		self.model
			.links
			.clone()
			.map(comma_separated_list_to_vec)
			.unwrap_or_default()
	}

	async fn writers(&self) -> Vec<String> {
		self.model
			.writers
			.clone()
			.map(comma_separated_list_to_vec)
			.unwrap_or_default()
	}
}

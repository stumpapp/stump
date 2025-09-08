use async_graphql::{ComplexObject, SimpleObject};
use models::entity::media_metadata;
use stump_core::utils::serde::comma_separated_list_to_vec;

#[derive(Debug, Clone, SimpleObject)]
#[graphql(complex)]
pub struct MediaMetadata {
	#[graphql(flatten)]
	pub model: media_metadata::Model,
}

impl From<media_metadata::Model> for MediaMetadata {
	fn from(model: media_metadata::Model) -> Self {
		Self { model }
	}
}

#[ComplexObject]
impl MediaMetadata {
	async fn writers(&self) -> Vec<String> {
		self.model
			.writers
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

	async fn characters(&self) -> Vec<String> {
		self.model
			.characters
			.clone()
			.map(comma_separated_list_to_vec)
			.unwrap_or_default()
	}

	async fn colorists(&self) -> Vec<String> {
		self.model
			.colorists
			.clone()
			.map(comma_separated_list_to_vec)
			.unwrap_or_default()
	}

	async fn cover_artists(&self) -> Vec<String> {
		self.model
			.cover_artists
			.clone()
			.map(comma_separated_list_to_vec)
			.unwrap_or_default()
	}

	async fn editors(&self) -> Vec<String> {
		self.model
			.editors
			.clone()
			.map(comma_separated_list_to_vec)
			.unwrap_or_default()
	}

	async fn inkers(&self) -> Vec<String> {
		self.model
			.inkers
			.clone()
			.map(comma_separated_list_to_vec)
			.unwrap_or_default()
	}

	async fn letterers(&self) -> Vec<String> {
		self.model
			.letterers
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

	async fn pencillers(&self) -> Vec<String> {
		self.model
			.pencillers
			.clone()
			.map(comma_separated_list_to_vec)
			.unwrap_or_default()
	}

	async fn teams(&self) -> Vec<String> {
		self.model
			.teams
			.clone()
			.map(comma_separated_list_to_vec)
			.unwrap_or_default()
	}
}

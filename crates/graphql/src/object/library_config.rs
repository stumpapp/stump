use async_graphql::{ComplexObject, SimpleObject};

use models::{
	entity::library_config, shared::image_processor_options::ImageProcessorOptions,
};

#[derive(Debug, SimpleObject)]
#[graphql(complex)]
pub struct LibraryConfig {
	#[graphql(flatten)]
	pub model: library_config::Model,
}

impl From<library_config::Model> for LibraryConfig {
	fn from(model: library_config::Model) -> Self {
		Self { model }
	}
}

#[ComplexObject]
impl LibraryConfig {
	// Note: We wrap in Json since the ImageProcessorOptions struct doesn't properly
	// implement GraphQL serialization yet. This should be fixed in the future.
	async fn thumbnail_config(&self) -> Option<ImageProcessorOptions> {
		self.model.thumbnail_config.clone()
	}

	async fn ignore_rules(&self) -> Option<Vec<String>> {
		self.model.ignore_rules.clone().map(|rules| rules.as_vec())
	}
}

use async_graphql::{ComplexObject, Context, Result, SimpleObject};
use models::entity::custom_emoji;

use crate::data::ServiceContext;

#[derive(Debug, SimpleObject)]
#[graphql(complex)]
pub struct CustomEmoji {
	#[graphql(flatten)]
	pub(crate) model: custom_emoji::Model,
}

impl From<custom_emoji::Model> for CustomEmoji {
	fn from(model: custom_emoji::Model) -> Self {
		Self { model }
	}
}

#[ComplexObject]
impl CustomEmoji {
	/// A reference to the URL of the custom emoji's thumbnail. This is not the full image, but a smaller thumbnail version.
	async fn url(&self, ctx: &Context<'_>) -> Result<String> {
		let service = ctx.data::<ServiceContext>()?;

		Ok(service.format_url(format!("/api/v2/emojis/{}", self.model.name)))
	}
}

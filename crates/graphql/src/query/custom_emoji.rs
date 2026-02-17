use async_graphql::{Context, Object, Result};
use models::entity::custom_emoji;
use sea_orm::EntityTrait;

use crate::data::CoreContext;

#[derive(Default)]
pub struct CustomEmojiQuery;

#[Object]
impl CustomEmojiQuery {
	/// List the custom emojis available on this server
	async fn custom_emojis(&self, ctx: &Context<'_>) -> Result<Vec<custom_emoji::Model>> {
		let core = ctx.data::<CoreContext>()?;

		let emojis = custom_emoji::Entity::find().all(core.conn.as_ref()).await?;

		Ok(emojis)
	}
}

use crate::graphql::{object::media::Media, GraphQLData};
use async_graphql::{Context, Object, Result, ID};
use models::entity::media;

#[derive(Default)]
pub struct MediaQuery;

#[Object]
impl MediaQuery {
	async fn media(&self, ctx: &Context<'_>) -> Result<Vec<Media>> {
		let conn = ctx.data::<GraphQLData>()?.ctx.conn.as_ref();

		let models = media::EntityWithMetadata::find()
			.into_model::<media::EntityWithMetadata>()
			.all(conn)
			.await?;

		Ok(models.into_iter().map(Media::from).collect())
	}

	async fn media_by_id(&self, ctx: &Context<'_>, id: ID) -> Result<Option<Media>> {
		let conn = ctx.data::<GraphQLData>()?.ctx.conn.as_ref();

		let model = media::EntityWithMetadata::find_by_id(id.to_string())
			.into_model::<media::EntityWithMetadata>()
			.one(conn)
			.await?;

		Ok(model.map(Media::from))
	}
}

use crate::graphql::{object::media::Media, GraphQLData};
use async_graphql::{Context, Object, Result, ID};
use models::entity::media;

#[derive(Default)]
pub struct MediaQuery;

#[Object]
impl MediaQuery {
	async fn media(&self, ctx: &Context<'_>) -> Result<Vec<Media>> {
		let conn = ctx.data::<GraphQLData>()?.core.conn.as_ref();

		let models = media::ModelWithMetadata::find()
			.into_model::<media::ModelWithMetadata>()
			.all(conn)
			.await?;

		Ok(models.into_iter().map(Media::from).collect())
	}

	async fn media_by_id(&self, ctx: &Context<'_>, id: ID) -> Result<Option<Media>> {
		let conn = ctx.data::<GraphQLData>()?.core.conn.as_ref();

		let model = media::ModelWithMetadata::find_by_id(id.to_string())
			.into_model::<media::ModelWithMetadata>()
			.one(conn)
			.await?;

		Ok(model.map(Media::from))
	}

	async fn recently_added_media(&self, ctx: &Context<'_>) -> Result<Vec<Media>> {
		unimplemented!()
	}

	async fn in_progress_media(&self, ctx: &Context<'_>) -> Result<Vec<Media>> {
		unimplemented!()
	}
}

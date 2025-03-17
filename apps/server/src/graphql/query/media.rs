use crate::graphql::GraphQLData;
use async_graphql::{Context, Object, Result};
use models::entity::{media, media_metadata};
use sea_orm::prelude::*;

#[derive(Default)]
pub struct MediaQuery;

#[Object]
impl MediaQuery {
	async fn get_media(&self, ctx: &Context<'_>) -> Result<Vec<media::Model>> {
		let conn = ctx.data::<GraphQLData>()?.ctx.conn.as_ref();

		let test = media::ModelWithMetadata::find()
			.filter(media_metadata::Column::Title.is_not_null())
			.into_model::<media::ModelWithMetadata>()
			.all(conn)
			.await?;
		dbg!(&test);

		Ok(media::Entity::find().all(conn).await?)
	}
}

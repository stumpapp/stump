use crate::graphql::GraphQLData;
use async_graphql::{Context, Object, Result};
use models::entity::media;
use sea_orm::prelude::*;

#[derive(Default)]
pub struct MediaQuery;

#[Object]
impl MediaQuery {
	async fn get_media(&self, ctx: &Context<'_>) -> Result<Vec<media::Model>> {
		let conn = ctx.data::<GraphQLData>()?.ctx.conn.as_ref();

		Ok(media::Entity::find().all(conn).await?)
	}
}

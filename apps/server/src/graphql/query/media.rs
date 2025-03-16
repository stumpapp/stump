use async_graphql::{Context, Object, Result};
use models::entity::{media, sea_orm::prelude::*};

use crate::graphql::GraphQLData;

#[derive(Default)]
pub struct MediaQuery;

#[Object]
impl MediaQuery {
	async fn get_media(&self, ctx: &Context<'_>) -> Result<Vec<media::Model>> {
		let conn = ctx.data::<GraphQLData>()?.ctx.conn.as_ref();

		Ok(media::Entity::find().all(conn).await?)
	}
}

use async_graphql::{ComplexObject, Context, Result, SimpleObject};

use models::entity::{media, media_metadata, series};
use sea_orm::prelude::*;

use crate::graphql::GraphQLData;

#[derive(Debug, SimpleObject)]
#[graphql(complex)]
pub struct Media {
	#[graphql(flatten)]
	pub model: media::Model,
	pub metadata: Option<media_metadata::Model>,
}

impl From<media::EntityWithMetadata> for Media {
	fn from(entity: media::EntityWithMetadata) -> Self {
		Self {
			model: entity.media,
			metadata: entity.metadata,
		}
	}
}

#[ComplexObject]
impl Media {
	async fn series(&self, ctx: &Context<'_>) -> Result<series::Model> {
		let conn = ctx.data::<GraphQLData>()?.ctx.conn.as_ref();

		let series_id = self.model.series_id.clone().ok_or("Series ID not set")?;
		series::Entity::find()
			.filter(series::Column::Id.eq(series_id))
			.one(conn)
			.await?
			.ok_or_else(|| "Series not found".into())
	}
}

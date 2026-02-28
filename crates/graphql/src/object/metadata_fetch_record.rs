use async_graphql::{ComplexObject, Context, Result, SimpleObject};
use models::entity::{media, metadata_fetch_record, series};
use sea_orm::prelude::*;

use crate::{data::CoreContext, object::{media::Media, series::Series}};

#[derive(Debug, SimpleObject)]
#[graphql(complex)]
pub struct MetadataFetchRecord {
	#[graphql(flatten)]
	pub model: metadata_fetch_record::Model,
}

#[ComplexObject]
impl MetadataFetchRecord {
	/// The media item associated with this fetch record, if any
	async fn media(&self, ctx: &Context<'_>) -> Result<Option<Media>> {
		let Some(media_id) = &self.model.media_id else {
			return Ok(None);
		};
		let conn = ctx.data::<CoreContext>()?.conn.as_ref();
		let model = media::Entity::find_by_id(media_id)
			.one(conn)
			.await?;
		Ok(model.map(|m| {
			media::ModelWithMetadata {
				media: m,
				metadata: None,
			}
			.into()
		}))
	}

	/// The series associated with this fetch record, if any
	async fn series(&self, ctx: &Context<'_>) -> Result<Option<Series>> {
		let Some(series_id) = &self.model.series_id else {
			return Ok(None);
		};
		let conn = ctx.data::<CoreContext>()?.conn.as_ref();
		let model = series::Entity::find_by_id(series_id)
			.one(conn)
			.await?;
		Ok(model.map(|s| {
			series::ModelWithMetadata {
				series: s,
				metadata: None,
			}
			.into()
		}))
	}
}

impl From<metadata_fetch_record::Model> for MetadataFetchRecord {
	fn from(model: metadata_fetch_record::Model) -> Self {
		Self { model }
	}
}

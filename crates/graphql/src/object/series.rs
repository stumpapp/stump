use async_graphql::{ComplexObject, Context, Result, SimpleObject};

use models::entity::{library, media, series, series_metadata};
use sea_orm::prelude::*;

use crate::data::CoreContext;

use super::{library::Library, media::Media};

#[derive(Debug, SimpleObject)]
#[graphql(complex)]
pub struct Series {
	#[graphql(flatten)]
	pub model: series::Model,
	pub metadata: Option<series_metadata::Model>,
}

impl From<series::ModelWithMetadata> for Series {
	fn from(entity: series::ModelWithMetadata) -> Self {
		Self {
			model: entity.series,
			metadata: entity.metadata,
		}
	}
}

#[ComplexObject]
impl Series {
	async fn library(&self, ctx: &Context<'_>) -> Result<Library> {
		let conn = ctx.data::<CoreContext>()?.conn.as_ref();

		let library_id = self.model.library_id.clone().ok_or("Library ID not set")?;
		let model = library::Entity::find()
			.filter(library::Column::Id.eq(library_id))
			.one(conn)
			.await?
			.ok_or("Library not found")?;

		Ok(Library::from(model))
	}

	async fn media(&self, ctx: &Context<'_>) -> Result<Vec<Media>> {
		let conn = ctx.data::<CoreContext>()?.conn.as_ref();

		let models = media::ModelWithMetadata::find()
			.filter(media::Column::SeriesId.eq(self.model.id.clone()))
			.into_model::<media::ModelWithMetadata>()
			.all(conn)
			.await?;

		Ok(models.into_iter().map(Media::from).collect())
	}
}

use async_graphql::{ComplexObject, Context, Result, SimpleObject};

use models::entity::{library, media, media_metadata, reading_session, series};
use sea_orm::{prelude::*, sea_query::Query};

use crate::data::CoreContext;

use super::{library::Library, series::Series};

#[derive(Debug, SimpleObject)]
#[graphql(complex)]
pub struct Media {
	#[graphql(flatten)]
	pub model: media::Model,
	pub metadata: Option<media_metadata::Model>,
}

impl From<media::ModelWithMetadata> for Media {
	fn from(entity: media::ModelWithMetadata) -> Self {
		Self {
			model: entity.media,
			metadata: entity.metadata,
		}
	}
}

#[ComplexObject]
impl Media {
	async fn series(&self, ctx: &Context<'_>) -> Result<Series> {
		let conn = ctx.data::<CoreContext>()?.conn.as_ref();

		let series_id = self.model.series_id.clone().ok_or("Series ID not set")?;
		let model = series::ModelWithMetadata::find_by_id(series_id)
			.into_model::<series::ModelWithMetadata>()
			.one(conn)
			.await?
			.ok_or("Series not found")?;

		Ok(Series::from(model))
	}

	async fn library(&self, ctx: &Context<'_>) -> Result<Library> {
		let conn = ctx.data::<CoreContext>()?.conn.as_ref();

		let series_id = self.model.series_id.clone().ok_or("Series ID not set")?;
		let model = library::Entity::find()
			.filter(
				library::Column::Id.in_subquery(
					Query::select()
						.column(series::Column::LibraryId)
						.from(series::Entity)
						.and_where(series::Column::Id.eq(series_id))
						.to_owned(),
				),
			)
			.one(conn)
			.await?
			.ok_or("Library not found")?;

		Ok(Library::from(model))
	}

	async fn progress(
		&self,
		ctx: &Context<'_>,
	) -> Result<Option<reading_session::Model>> {
		let conn = ctx.data::<CoreContext>()?.conn.as_ref();

		// TODO(sea-orm): user ID
		let progress = reading_session::Entity::find()
			.filter(reading_session::Column::MediaId.eq(&self.model.id))
			.into_model::<reading_session::Model>()
			.one(conn)
			.await?;

		Ok(progress)
	}
}

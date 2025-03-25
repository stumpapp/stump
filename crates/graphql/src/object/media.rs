use async_graphql::{ComplexObject, Context, Result, SimpleObject};

use models::entity::{
	finished_reading_session, library, media, media_metadata, reading_session, series,
};
use sea_orm::{prelude::*, sea_query::Query};

use crate::data::{CoreContext, RequestContext};

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

		// TODO: hidden from user? Access to this node _implies_ access to the library,
		// so perhaps not
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

	// TODO(graphql): Create object to query for device
	async fn read_progress(
		&self,
		ctx: &Context<'_>,
	) -> Result<Option<reading_session::Model>> {
		let RequestContext { user, .. } = ctx.data::<RequestContext>()?;
		let conn = ctx.data::<CoreContext>()?.conn.as_ref();

		let progress = reading_session::Entity::find()
			.filter(
				reading_session::Column::MediaId
					.eq(&self.model.id)
					.and(reading_session::Column::UserId.eq(&user.id)),
			)
			.into_model::<reading_session::Model>()
			.one(conn)
			.await?;

		Ok(progress)
	}

	// TODO(graphql): Create object to query for device
	async fn read_history(
		&self,
		ctx: &Context<'_>,
	) -> Result<Vec<finished_reading_session::Model>> {
		let RequestContext { user, .. } = ctx.data::<RequestContext>()?;
		let conn = ctx.data::<CoreContext>()?.conn.as_ref();

		let history = finished_reading_session::Entity::find()
			.filter(
				finished_reading_session::Column::MediaId
					.eq(&self.model.id)
					.and(finished_reading_session::Column::UserId.eq(&user.id)),
			)
			.into_model::<finished_reading_session::Model>()
			.all(conn)
			.await?;

		Ok(history)
	}

	async fn next_in_series(
		&self,
		ctx: &Context<'_>,
		#[graphql(default = 1, validator(minimum = 1))] take: u64,
	) -> Result<Vec<Media>> {
		let RequestContext { user, .. } = ctx.data::<RequestContext>()?;
		let conn = ctx.data::<CoreContext>()?.conn.as_ref();

		let series_id = self.model.series_id.clone().ok_or("Series ID not set")?;
		let mut cursor = media::ModelWithMetadata::find_for_user(user)
			.filter(media::Column::SeriesId.eq(series_id))
			.cursor_by(media::Column::Name);
		cursor.after(&self.model.name).first(take);

		let next = cursor
			.into_model::<media::ModelWithMetadata>()
			.all(conn)
			.await?;

		Ok(next.into_iter().map(Media::from).collect())
	}
}

use async_graphql::{
	dataloader::DataLoader, ComplexObject, Context, Result, SimpleObject,
};

use models::{
	entity::{library, media, series},
	shared::image::ImageRef,
};
use sea_orm::{prelude::*, sea_query::Query, QuerySelect};

use crate::{
	data::{CoreContext, RequestContext, ServiceContext},
	loader::{
		reading_session::{
			ActiveReadingSessionLoaderKey, FinishedReadingSessionLoaderKey,
			ReadingSessionLoader,
		},
		series::SeriesLoader,
	},
	pagination::{CursorPagination, CursorPaginationInfo, PaginatedResponse},
};

use super::{
	library::Library,
	media_metadata::MediaMetadata,
	reading_session::{ActiveReadingSession, FinishedReadingSession},
	series::Series,
};

#[derive(Debug, SimpleObject)]
#[graphql(complex)]
pub struct Media {
	#[graphql(flatten)]
	pub model: media::Model,
	pub metadata: Option<MediaMetadata>,
}

impl From<media::ModelWithMetadata> for Media {
	fn from(entity: media::ModelWithMetadata) -> Self {
		Self {
			model: entity.media,
			metadata: entity.metadata.map(MediaMetadata::from),
		}
	}
}

impl Media {
	pub fn self_cursor_params(&self) -> CursorPagination {
		CursorPagination {
			after: Some(self.model.name.clone()),
			limit: 1,
		}
	}
}

#[ComplexObject]
impl Media {
	async fn series(&self, ctx: &Context<'_>) -> Result<Series> {
		let loader = ctx.data::<DataLoader<SeriesLoader>>()?;

		let series_id = self.model.series_id.clone().ok_or("Series ID not set")?;

		let series = loader
			.load_one(series_id)
			.await?
			.ok_or("Series not found")?;

		Ok(series)
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

	/// A reference to the thumbnail image for the media. This will be a fully
	/// qualified URL to the image.
	async fn thumbnail(&self, ctx: &Context<'_>) -> Result<ImageRef> {
		let service = ctx.data::<ServiceContext>()?;

		let page_dimension = self
			.metadata
			.as_ref()
			.and_then(|meta| meta.model.page_analysis.as_ref())
			.and_then(|page_analysis| page_analysis.dimensions.first().cloned());

		Ok(ImageRef {
			url: service.format_url(format!("/api/v2/media/{}/thumbnail", self.model.id)),
			height: page_dimension.as_ref().map(|dim| dim.height),
			width: page_dimension.as_ref().map(|dim| dim.width),
		})
	}

	/// The resolved name of the media, which will prioritize the title pulled from
	/// metatadata, if available, and fallback to the name derived from the file name
	async fn resolved_name(&self) -> String {
		self.metadata
			.as_ref()
			.and_then(|meta| meta.model.title.as_ref())
			.unwrap_or(&self.model.name)
			.to_string()
	}

	// TODO(graphql): Create object to query for device
	async fn read_progress(
		&self,
		ctx: &Context<'_>,
	) -> Result<Option<ActiveReadingSession>> {
		let RequestContext { user, .. } = ctx.data::<RequestContext>()?;
		let loader = ctx.data::<DataLoader<ReadingSessionLoader>>()?;

		let progress = loader
			.load_one(ActiveReadingSessionLoaderKey {
				user_id: user.id.clone(),
				media_id: self.model.id.clone(),
			})
			.await?;

		Ok(progress)
	}

	// TODO(graphql): Create object to query for device
	async fn read_history(
		&self,
		ctx: &Context<'_>,
	) -> Result<Vec<FinishedReadingSession>> {
		let RequestContext { user, .. } = ctx.data::<RequestContext>()?;
		let loader = ctx.data::<DataLoader<ReadingSessionLoader>>()?;

		let history = loader
			.load_one(FinishedReadingSessionLoaderKey {
				user_id: user.id.clone(),
				media_id: self.model.id.clone(),
			})
			.await?
			.unwrap_or_default();

		Ok(history)
	}

	async fn next_in_series(
		&self,
		ctx: &Context<'_>,
		#[graphql(default)] pagination: CursorPagination,
	) -> Result<PaginatedResponse<Media>> {
		let RequestContext { user, .. } = ctx.data::<RequestContext>()?;
		let conn = ctx.data::<CoreContext>()?.conn.as_ref();

		let mut cursor = media::ModelWithMetadata::find_for_user(user)
			.filter(media::Column::SeriesId.eq(self.model.series_id.clone()))
			.cursor_by(media::Column::Name);

		let after = match pagination.after.clone() {
			Some(after) if after != self.model.id => {
				let media =
					media::Entity::find_for_user(user)
						.select_only()
						.column(media::Column::Name)
						.filter(media::Column::Id.eq(after).and(
							media::Column::SeriesId.eq(self.model.series_id.clone()),
						))
						.into_model::<media::MediaNameCmpSelect>()
						.one(conn)
						.await?
						.ok_or("Cursor not found")?;
				media.name
			},
			_ => self.model.name.clone(),
		};

		cursor.after(after).first(pagination.limit);

		let next = cursor
			.into_model::<media::ModelWithMetadata>()
			.all(conn)
			.await?;
		let current_cursor = pagination
			.after
			.or_else(|| next.first().map(|m| m.media.id.clone()));
		let next_cursor = match next.last().map(|m| m.media.id.clone()) {
			Some(id) if next.len() == pagination.limit as usize => Some(id),
			_ => None,
		};

		Ok(PaginatedResponse {
			nodes: next.into_iter().map(Media::from).collect(),
			page_info: CursorPaginationInfo {
				current_cursor,
				next_cursor,
				limit: pagination.limit,
			}
			.into(),
		})
	}
}

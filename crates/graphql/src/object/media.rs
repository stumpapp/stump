use async_graphql::{
	dataloader::DataLoader, ComplexObject, Context, Result, SimpleObject,
};

use models::{
	entity::{library, library_config, media, series, tag},
	shared::image::ImageRef,
};
use num_traits::cast::ToPrimitive;
use sea_orm::{
	prelude::*, sea_query::Query, DatabaseBackend, FromQueryResult, QuerySelect,
	Statement,
};

use crate::{
	data::{AuthContext, CoreContext, ServiceContext},
	loader::{
		favorite::{FavoriteMediaLoaderKey, FavoritesLoader},
		reading_session::{
			ActiveReadingSessionLoaderKey, FinishedReadingSessionLoaderKey,
			ReadingSessionLoader,
		},
		series::SeriesLoader,
	},
	pagination::{CursorPagination, CursorPaginationInfo, PaginatedResponse, Pagination},
};

use super::{
	library::Library,
	library_config::LibraryConfig,
	media_metadata::MediaMetadata,
	reading_session::{ActiveReadingSession, FinishedReadingSession},
	series::Series,
	tag::Tag,
};

#[derive(Debug, Clone, SimpleObject)]
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
	async fn is_favorite(&self, ctx: &Context<'_>) -> Result<bool> {
		let AuthContext { user, .. } = ctx.data::<AuthContext>()?;
		let loader = ctx.data::<DataLoader<FavoritesLoader>>()?;

		let is_favorite = loader
			.load_one(FavoriteMediaLoaderKey {
				user_id: user.id.clone(),
				media_id: self.model.id.clone(),
			})
			.await?;

		Ok(is_favorite.unwrap_or(false))
	}

	async fn tags(&self, ctx: &Context<'_>) -> Result<Vec<Tag>> {
		let conn = ctx.data::<CoreContext>()?.conn.as_ref();
		let model = tag::Entity::find_for_media_id(&self.model.id.clone())
			.all(conn)
			.await?;
		Ok(model.into_iter().map(Tag::from).collect())
	}

	async fn series(&self, ctx: &Context<'_>) -> Result<Series> {
		let loader = ctx.data::<DataLoader<SeriesLoader>>()?;

		let series_id = self.model.series_id.clone().ok_or("Series ID not set")?;

		let series = loader
			.load_one(series_id)
			.await?
			.ok_or("Series not found")?;

		Ok(series)
	}

	async fn library_id(&self, ctx: &Context<'_>) -> Result<String> {
		let conn = ctx.data::<CoreContext>()?.conn.as_ref();

		let series_id = self.model.series_id.clone().ok_or("Series ID not set")?;
		let id: String = library::Entity::find()
			.select_only()
			.column(library::Column::Id)
			.filter(
				library::Column::Id.in_subquery(
					Query::select()
						.column(series::Column::LibraryId)
						.from(series::Entity)
						.and_where(series::Column::Id.eq(series_id))
						.to_owned(),
				),
			)
			.into_tuple()
			.one(conn)
			.await?
			.ok_or("Library not found")?;

		Ok(id)
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

	async fn library_config(&self, ctx: &Context<'_>) -> Result<LibraryConfig> {
		let conn = ctx.data::<CoreContext>()?.conn.as_ref();

		let series_id = self.model.series_id.clone().ok_or("Series ID not set")?;
		let model = library_config::Entity::find()
			.filter(
				library_config::Column::LibraryId.in_subquery(
					Query::select()
						.column(series::Column::LibraryId)
						.from(series::Entity)
						.and_where(series::Column::Id.eq(series_id))
						.to_owned(),
				),
			)
			.one(conn)
			.await?
			.ok_or("Library config not found")?;

		Ok(LibraryConfig::from(model))
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
		let AuthContext { user, .. } = ctx.data::<AuthContext>()?;
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
		let AuthContext { user, .. } = ctx.data::<AuthContext>()?;
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

	async fn series_position(&self, ctx: &Context<'_>) -> Result<Option<i32>> {
		let conn = ctx.data::<CoreContext>()?.conn.as_ref();

		if let Some(position) = self.metadata.as_ref().and_then(|m| m.model.number) {
			if position.fract().is_zero() {
				return Ok(Some(position.to_i32().unwrap_or(0)));
			}
		}

		#[derive(Debug, FromQueryResult)]
		struct PositionResult {
			position: i32,
		}

		let series_id = self.model.series_id.clone().ok_or("Series ID not set")?;

		let position = PositionResult::find_by_statement(Statement::from_sql_and_values(
			DatabaseBackend::Sqlite,
			r#"
            SELECT position
            FROM (
                SELECT 
                    id,
                    ROW_NUMBER() OVER (
                        PARTITION BY series_id 
                        ORDER BY name
                    ) as position
                FROM media
                WHERE series_id = ?
                AND deleted_at IS NULL
            ) ranked
            WHERE id = ?
            "#,
			[series_id.into(), self.model.id.clone().into()],
		))
		.one(conn)
		.await?
		.map(|result| result.position);

		Ok(position)
	}

	/// The next media in the series, ordered by name
	async fn next_in_series(
		&self,
		ctx: &Context<'_>,
		#[graphql(default)] pagination: Pagination,
	) -> Result<PaginatedResponse<Media>> {
		let AuthContext { user, .. } = ctx.data::<AuthContext>()?;
		let conn = ctx.data::<CoreContext>()?.conn.as_ref();

		let pagination = match pagination {
			Pagination::Cursor(pagination) => pagination,
			_ => {
				return Err(
					"Only cursor pagination is supported for this operation".into()
				)
			},
		};

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

	/// The path to the media file **relative** to the library path. This is only useful for
	/// displaying a truncated path when in the context of a library, e.g. limited space
	/// on a mobile device.
	async fn relative_library_path(&self, ctx: &Context<'_>) -> Result<String> {
		let conn = ctx.data::<CoreContext>()?.conn.as_ref();

		let (library_path,) = library::Entity::find()
			.select_only()
			.column(library::Column::Path)
			.filter(
				library::Column::Id.in_subquery(
					Query::select()
						.column(series::Column::LibraryId)
						.from(series::Entity)
						.and_where(series::Column::Id.eq(self.model.series_id.clone()))
						.to_owned(),
				),
			)
			.into_tuple::<(String,)>()
			.one(conn)
			.await?
			.ok_or("Library not found")?;

		Ok(self.model.path.replace(&library_path, ""))
	}
}

use async_graphql::{
	dataloader::DataLoader, ComplexObject, Context, Result, SimpleObject,
};

use models::{
	entity::{library, media, media_analysis, reading_session, tag},
	services::reading_timeline::sessions_with_events,
	shared::{analysis::MediaAnalysisData, image::ImageRef, ordering::OrderDirection},
};
use num_traits::cast::ToPrimitive;
use sea_orm::{prelude::*, FromQueryResult, QueryOrder, QuerySelect};

use crate::{
	data::{AuthContext, CoreContext, ServiceContext},
	loader::{
		favorite::{FavoriteMediaLoaderKey, FavoritesLoader},
		library::LibraryLoader,
		library_config::{LibraryConfigLoader, LibraryConfigLoaderKey},
		media_analysis::{MediaAnalysisLoader, PageDimensionLoaderKey},
		reading_session::{
			ReadingSessionLoader, ReadthroughRecordLoaderKey,
			ResumeReadingCursorLoaderKey,
		},
		series::SeriesLoader,
	},
	object::{
		epub::Epub,
		reading_timeline::{BookReadingTimeline, SessionWithEvents},
	},
	pagination::{CursorPagination, CursorPaginationInfo, PaginatedResponse, Pagination},
	utils::db_statement,
};

use super::{
	library::Library, library_config::LibraryConfig, media_metadata::MediaMetadata,
	readthrough_record::ReadthroughRecord, resume_reading_cursor::ResumeReadingCursor,
	series::Series, tag::Tag,
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
	/// If the media is an epub, this will return the parsed epub data from the file
	async fn ebook(&self) -> Result<Option<Epub>> {
		if self.model.extension.to_lowercase() != "epub" {
			return Ok(None);
		}

		let model = media::MediaIdentSelect {
			id: self.model.id.clone(),
			path: self.model.path.clone(),
		};

		Epub::try_from(model).map(Some)
	}

	/// Whether the media is marked as a favorite by the current user
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

	/// The tags associated with the media
	async fn tags(&self, ctx: &Context<'_>) -> Result<Vec<Tag>> {
		let conn = ctx.data::<CoreContext>()?.conn.as_ref();
		let model = tag::Entity::find_for_media_id(&self.model.id.clone())
			.all(conn)
			.await?;
		Ok(model.into_iter().map(Tag::from).collect())
	}

	/// The series the media belongs to
	async fn series(&self, ctx: &Context<'_>) -> Result<Option<Series>> {
		let Some(series_id) = self.model.series_id.clone() else {
			return Ok(None);
		};
		let loader = ctx.data::<DataLoader<SeriesLoader>>()?;

		let series = loader
			.load_one(series_id)
			.await?
			.ok_or("Series not found")?;

		Ok(Some(series))
	}

	async fn library_id(&self) -> &str {
		&self.model.library_id
	}

	async fn library(&self, ctx: &Context<'_>) -> Result<Library> {
		ctx.data::<DataLoader<LibraryLoader>>()?
			.load_one(self.model.library_id.clone())
			.await?
			.ok_or_else(|| "Library not found".into())
	}

	async fn library_config(&self, ctx: &Context<'_>) -> Result<LibraryConfig> {
		let loader = ctx.data::<DataLoader<LibraryConfigLoader>>()?;

		loader
			.load_one(LibraryConfigLoaderKey {
				library_id: self.model.library_id.clone(),
			})
			.await?
			.map(LibraryConfig::from)
			.ok_or_else(|| "Library config not found".into())
	}

	async fn analysis_data(
		&self,
		ctx: &Context<'_>,
	) -> Result<Option<MediaAnalysisData>> {
		let conn = ctx.data::<CoreContext>()?.conn.as_ref();

		let model = media_analysis::Entity::find()
			.filter(media_analysis::Column::MediaId.eq(self.model.id.clone()))
			.one(conn)
			.await?;

		Ok(model.map(|m| m.data))
	}

	/// A reference to the thumbnail image for the media. This will be a fully
	/// qualified URL to the image.
	async fn thumbnail(&self, ctx: &Context<'_>) -> Result<ImageRef> {
		let service = ctx.data::<ServiceContext>()?;
		let loader = ctx.data::<DataLoader<MediaAnalysisLoader>>()?;
		let last_modified = self.model.updated_at;

		let dimensions = match self
			.model
			.thumbnail_meta
			.as_ref()
			.and_then(|meta| meta.dimensions.as_ref())
		{
			Some(dim) => Some((dim.width, dim.height)),
			None => {
				let page_dimension = loader
					.load_one(PageDimensionLoaderKey {
						media_id: self.model.id.clone(),
					})
					.await?;
				page_dimension.map(|dim| (dim.width, dim.height))
			},
		};

		Ok(ImageRef {
			url: service.cache_friendly_url(
				format!("/api/v2/media/{}/thumbnail", self.model.id),
				&last_modified,
			),
			height: dimensions.as_ref().map(|dim| dim.1),
			width: dimensions.as_ref().map(|dim| dim.0),
			metadata: self.model.thumbnail_meta.clone(),
			last_modified,
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

	async fn read_progress(
		&self,
		ctx: &Context<'_>,
	) -> Result<Option<ResumeReadingCursor>> {
		let AuthContext { user, .. } = ctx.data::<AuthContext>()?;
		let loader = ctx.data::<DataLoader<ReadingSessionLoader>>()?;

		let progress = loader
			.load_one(ResumeReadingCursorLoaderKey {
				user_id: user.id.clone(),
				media_id: self.model.id.clone(),
			})
			.await?;

		Ok(progress)
	}

	// TODO(graphql): Create object to query for device used (e.g., KoReader device ID)
	async fn read_history(&self, ctx: &Context<'_>) -> Result<Vec<ReadthroughRecord>> {
		let AuthContext { user, .. } = ctx.data::<AuthContext>()?;
		let loader = ctx.data::<DataLoader<ReadingSessionLoader>>()?;

		let history = loader
			.load_one(ReadthroughRecordLoaderKey {
				user_id: user.id.clone(),
				media_id: self.model.id.clone(),
			})
			.await?
			.unwrap_or_default();

		Ok(history)
	}

	/// The reading timeline for the book for the current user. Will be `None` if the user has not
	/// read the book.
	///
	/// Note: This is not paginated and loads the entire timeline at once for the user, so it will be expensive
	/// if selected in a query for N number of books
	async fn reading_timeline(
		&self,
		ctx: &Context<'_>,
		#[graphql(default_with = "OrderDirection::Desc")] order: OrderDirection,
	) -> Result<Option<BookReadingTimeline>> {
		let AuthContext { user, .. } = ctx.data::<AuthContext>()?;
		let conn = ctx.data::<CoreContext>()?.conn.as_ref();

		let sessions = reading_session::Entity::find()
			.filter(
				reading_session::Column::UserId
					.eq(user.id.clone())
					.and(reading_session::Column::MediaId.eq(self.model.id.clone())),
			)
			.order_by(reading_session::Column::ReadthroughNumber, order.into())
			.order_by(reading_session::Column::CreatedAt, order.into())
			.all(conn)
			.await?;

		// no point wasting compute/db trips
		if sessions.is_empty() {
			return Ok(None);
		}

		let sessions_with_events = sessions_with_events(sessions, order.into(), conn)
			.await?
			.into_iter()
			.map(|s| SessionWithEvents::from_service(s, order))
			.collect::<Vec<_>>();
		let book_timeline = BookReadingTimeline::new(sessions_with_events, order);

		Ok(Some(book_timeline))
	}

	async fn series_position(&self, ctx: &Context<'_>) -> Result<Option<i64>> {
		let Some(series_id) = self.model.series_id.clone() else {
			return Ok(None);
		};
		let conn = ctx.data::<CoreContext>()?.conn.as_ref();

		if let Some(position) = self.metadata.as_ref().and_then(|m| m.model.number) {
			if position.fract().is_zero() {
				return Ok(Some(position.to_i64().unwrap_or(0)));
			}
		}

		#[derive(Debug, FromQueryResult)]
		struct PositionResult {
			position: i64,
		}

		let position = PositionResult::find_by_statement(db_statement(
			conn,
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
                WHERE series_id = $1
                AND deleted_at IS NULL
            ) ranked
            WHERE id = $2
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
		let Some(series_id) = &self.model.series_id else {
			return Ok(PaginatedResponse {
				nodes: vec![],
				page_info: CursorPaginationInfo {
					current_cursor: None,
					next_cursor: None,
					limit: pagination.limit,
				}
				.into(),
			});
		};

		let mut cursor = media::ModelWithMetadata::find_for_user(user)
			.filter(media::Column::SeriesId.eq(series_id))
			.cursor_by(media::Column::Name);

		let after = match pagination.after.clone() {
			Some(after) if after != self.model.id => {
				let media = media::Entity::find_for_user(user)
					.select_only()
					.column(media::Column::Name)
					.filter(
						media::Column::Id
							.eq(after)
							.and(media::Column::SeriesId.eq(series_id)),
					)
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
			.filter(library::Column::Id.eq(&self.model.library_id))
			.into_tuple::<(String,)>()
			.one(conn)
			.await?
			.ok_or("Library not found")?;

		Ok(self.model.path.replace(&library_path, ""))
	}
}

use async_graphql::{
	dataloader::DataLoader, ComplexObject, Context, Result, SimpleObject,
};

use models::{
	entity::{
		finished_reading_session, library, media, reading_session, series,
		series_metadata, series_to_tag, tag,
	},
	shared::image::ImageRef,
};
use sea_orm::{
	prelude::*, sea_query::Query, Condition, JoinType, QueryOrder, QuerySelect,
};

use crate::{
	data::{CoreContext, RequestContext, ServiceContext},
	loader::{
		series_count::SeriesCountLoader,
		series_finished_count::{FinishedCountLoaderKey, SeriesFinishedCountLoader},
	},
};

use super::{library::Library, media::Media, tag::Tag};

#[derive(Clone, Debug, SimpleObject)]
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
	async fn resolved_name(&self) -> String {
		self.metadata
			.as_ref()
			.and_then(|m| m.title.clone())
			.unwrap_or_else(|| self.model.name.clone())
	}

	async fn resolved_description(&self) -> Option<String> {
		self.metadata
			.as_ref()
			.and_then(|m| m.summary.clone())
			.or_else(|| self.model.description.clone())
	}

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
		let RequestContext { user, .. } = ctx.data::<RequestContext>()?;
		let conn = ctx.data::<CoreContext>()?.conn.as_ref();

		let models = media::ModelWithMetadata::find_for_user(user)
			.filter(media::Column::SeriesId.eq(self.model.id.clone()))
			.into_model::<media::ModelWithMetadata>()
			.all(conn)
			.await?;

		Ok(models.into_iter().map(Media::from).collect())
	}

	async fn media_count(&self, ctx: &Context<'_>) -> Result<i64> {
		let loader = ctx.data::<DataLoader<SeriesCountLoader>>()?;
		let series_id = self.model.id.clone();
		let media_count = loader.load_one(series_id).await?.unwrap_or(0i64);

		Ok(media_count)
	}

	async fn up_next(
		&self,
		ctx: &Context<'_>,
		#[graphql(default = 1, validator(minimum = 1))] take: u64,
		cursor: Option<String>,
	) -> Result<Vec<Media>> {
		let RequestContext { user, .. } = ctx.data::<RequestContext>()?;
		let conn = ctx.data::<CoreContext>()?.conn.as_ref();

		let user_id = user.id.clone();

		let name_cmp = if let Some(id) = cursor {
			let media = media::Entity::find_for_user(user)
				.select_only()
				.column(media::Column::Name)
				.filter(media::Column::Id.eq(id.clone()))
				.into_model::<media::MediaNameCmpSelect>()
				.one(conn)
				.await?
				.ok_or("Cursor not found")?;
			Some(media.name)
		} else {
			None
		};

		let query = media::ModelWithMetadata::find_for_user(user)
			.left_join(reading_session::Entity)
			.join_rev(
				JoinType::LeftJoin,
				finished_reading_session::Entity::belongs_to(media::Entity)
					.from(finished_reading_session::Column::MediaId)
					.to(media::Column::Id)
					.on_condition(move |_left, _right| {
						Condition::all().add(
							finished_reading_session::Column::UserId.eq(user_id.clone()),
						)
					})
					.into(),
			)
			.filter(media::Column::SeriesId.eq(self.model.id.clone()))
			// We only want to consider media that the user hasn't started or is in progress
			.filter(
				Condition::any()
					.add(reading_session::Column::Id.is_null())
					.add(
						Condition::all()
							.add(reading_session::Column::UserId.eq(&user.id))
							.add(
								Condition::any()
									.add(reading_session::Column::Epubcfi.is_not_null())
									.add(
										reading_session::Column::PercentageCompleted
											.lt(1.0),
									)
									.add(
										Condition::all()
											.add(
												reading_session::Column::Page
													.is_not_null(),
											)
											.add(reading_session::Column::Page.gt(0)),
									),
							),
					),
			)
			// If the book is finshed, we don't even want to consider it
			.filter(finished_reading_session::Column::Id.is_null());

		let books = if let Some(name) = name_cmp {
			let mut cursor = query.cursor_by(media::Column::Name);
			cursor.after(name).first(take);
			cursor
				.into_model::<media::ModelWithMetadata>()
				.all(conn)
				.await?
		} else {
			query
				.order_by_asc(media::Column::Name)
				.limit(take)
				.into_model::<media::ModelWithMetadata>()
				.all(conn)
				.await?
		};

		Ok(books.into_iter().map(Media::from).collect())
	}

	async fn is_complete(&self, ctx: &Context<'_>) -> Result<bool> {
		let (media_count, finished_count) =
			get_series_progress(ctx, self.model.id.clone()).await?;

		Ok(finished_count >= media_count)
	}

	async fn percentage_completed(&self, ctx: &Context<'_>) -> Result<f32> {
		let (media_count, finished_count) =
			get_series_progress(ctx, self.model.id.clone()).await?;

		if media_count == 0 {
			return Ok(0.0);
		}

		let percentage = (finished_count as f32 / media_count as f32) * 100.0;

		Ok(percentage)
	}

	async fn read_count(&self, ctx: &Context<'_>) -> Result<i64> {
		let RequestContext { user, .. } = ctx.data::<RequestContext>()?;
		let finished_loader = ctx.data::<DataLoader<SeriesFinishedCountLoader>>()?;
		let finished_count = finished_loader
			.load_one(FinishedCountLoaderKey {
				user_id: user.id.clone(),
				series_id: self.model.id.clone(),
			})
			.await?
			.unwrap_or(0i64);

		Ok(finished_count)
	}

	async fn unread_count(&self, ctx: &Context<'_>) -> Result<i64> {
		let (media_count, finished_count) =
			get_series_progress(ctx, self.model.id.clone()).await?;

		Ok(std::cmp::max(0, media_count - finished_count))
	}

	async fn tags(&self, ctx: &Context<'_>) -> Result<Vec<Tag>> {
		let conn = ctx.data::<CoreContext>()?.conn.as_ref();

		let models = tag::Entity::find()
			.filter(
				tag::Column::Id.in_subquery(
					Query::select()
						.column(series_to_tag::Column::TagId)
						.from(series_to_tag::Entity)
						.and_where(
							series_to_tag::Column::SeriesId.eq(self.model.id.clone()),
						)
						.to_owned(),
				),
			)
			.all(conn)
			.await?;

		Ok(models.into_iter().map(Tag::from).collect())
	}

	/// A reference to the thumbnail image for the thumbnail. This will be a fully
	/// qualified URL to the image.
	async fn thumbnail(&self, ctx: &Context<'_>) -> Result<ImageRef> {
		let service = ctx.data::<ServiceContext>()?;

		// TODO: Spawn a blocking task to get the image dimensions
		// Use a cache as to not read the file system every time

		Ok(ImageRef {
			url: service
				.format_url(format!("/api/v2/series/{}/thumbnail", self.model.id)),
			// height: page_dimension.as_ref().map(|dim| dim.height),
			// width: page_dimension.as_ref().map(|dim| dim.width),
			..Default::default()
		})
	}
}

async fn get_series_progress(ctx: &Context<'_>, series_id: String) -> Result<(i64, i64)> {
	let RequestContext { user, .. } = ctx.data::<RequestContext>()?;

	let loader = ctx.data::<DataLoader<SeriesCountLoader>>()?;
	let media_count = loader.load_one(series_id.clone()).await?.unwrap_or(0i64);

	let finished_loader = ctx.data::<DataLoader<SeriesFinishedCountLoader>>()?;
	let finished_count = finished_loader
		.load_one(FinishedCountLoaderKey {
			user_id: user.id.clone(),
			series_id,
		})
		.await?
		.unwrap_or(0i64);

	Ok((media_count, finished_count))
}

#[cfg(test)]
mod tests {}

use async_graphql::{ComplexObject, Context, Result, SimpleObject};

use models::entity::{
	finished_reading_session, library, media, reading_session, series, series_metadata,
	user::AuthUser,
};
use sea_orm::{prelude::*, Condition, JoinType, QueryOrder, QuerySelect};

use crate::data::{CoreContext, RequestContext};

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
		let RequestContext { user, .. } = ctx.data::<RequestContext>()?;
		let conn = ctx.data::<CoreContext>()?.conn.as_ref();

		let models = media::ModelWithMetadata::find_for_user(user)
			.filter(media::Column::SeriesId.eq(self.model.id.clone()))
			.into_model::<media::ModelWithMetadata>()
			.all(conn)
			.await?;

		Ok(models.into_iter().map(Media::from).collect())
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
		let RequestContext { user, .. } = ctx.data::<RequestContext>()?;
		let conn = ctx.data::<CoreContext>()?.conn.as_ref();

		let (media_count, finished_count) =
			get_series_progress(user, self.model.id.clone(), conn).await?;

		Ok(finished_count >= media_count)
	}

	async fn unread_count(&self, ctx: &Context<'_>) -> Result<u64> {
		let RequestContext { user, .. } = ctx.data::<RequestContext>()?;
		let conn = ctx.data::<CoreContext>()?.conn.as_ref();

		let (media_count, finished_count) =
			get_series_progress(user, self.model.id.clone(), conn).await?;

		Ok(std::cmp::max(0, media_count - finished_count))
	}
}

async fn get_series_progress(
	user: &AuthUser,
	series_id: String,
	conn: &DatabaseConnection,
) -> Result<(u64, u64)> {
	let media_count = media::Entity::find_for_series_id(user, series_id.clone())
		.count(conn)
		.await?;

	let finished_count = finished_reading_session::Entity::find_finished_in_series(
		user,
		series_id.clone(),
	)
	.count(conn)
	.await?;

	Ok((media_count, finished_count))
}

#[cfg(test)]
mod tests {}

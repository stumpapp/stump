use async_graphql::{Context, Object, Result, ID};
use chrono::Utc;
use models::{
	entity::{favorite_series, library, library_config, media, series},
	shared::enums::UserPermission,
};
use sea_orm::{
	prelude::*,
	sea_query::{OnConflict, Query},
	ActiveValue::Set,
};
use stump_core::filesystem::{
	image::{generate_book_thumbnail, GenerateThumbnailOptions},
	media::analyze_media_job::AnalyzeMediaJob,
	scanner::SeriesScanJob,
};

use crate::{
	data::{AuthContext, CoreContext},
	guard::PermissionGuard,
	input::thumbnail::UpdateThumbnailInput,
	object::series::Series,
};

#[derive(Default)]
pub struct SeriesMutation;

#[Object]
impl SeriesMutation {
	#[graphql(guard = "PermissionGuard::one(UserPermission::ManageLibrary)")]
	async fn analyze_series(&self, ctx: &Context<'_>, id: ID) -> Result<bool> {
		let AuthContext { user, .. } = ctx.data::<AuthContext>()?;
		let core = ctx.data::<CoreContext>()?;
		let conn = core.conn.as_ref();

		let model =
			series::Entity::find_series_ident_for_user_and_id(user, id.to_string())
				.into_model::<series::SeriesIdentSelect>()
				.one(conn)
				.await?
				.ok_or("Series not found")?;

		core.enqueue_job(AnalyzeMediaJob::analyze_series(model.id))?;

		Ok(true)
	}

	async fn favorite_series(
		&self,
		ctx: &Context<'_>,
		id: ID,
		is_favorite: bool,
	) -> Result<Series> {
		let AuthContext { user, .. } = ctx.data::<AuthContext>()?;
		let core = ctx.data::<CoreContext>()?;
		let conn = core.conn.as_ref();

		let model = series::ModelWithMetadata::find_for_user(user)
			.filter(
				series::Column::Id
					.eq(id.to_string())
					.and(series::Column::DeletedAt.is_null()),
			)
			.into_model::<series::ModelWithMetadata>()
			.one(conn)
			.await?
			.ok_or("Series not found")?;

		if is_favorite {
			let last_insert_id =
				favorite_series::Entity::insert(favorite_series::ActiveModel {
					user_id: Set(user.id.clone()),
					series_id: Set(model.series.id.clone()),
					favorited_at: Set(DateTimeWithTimeZone::from(Utc::now())),
				})
				.on_conflict(OnConflict::new().do_nothing().to_owned())
				.exec(core.conn.as_ref())
				.await?
				.last_insert_id;
			tracing::debug!(?last_insert_id, "Added favorite series");
		} else {
			let affected_rows =
				favorite_series::Entity::delete_many()
					.filter(favorite_series::Column::UserId.eq(user.id.clone()).and(
						favorite_series::Column::SeriesId.eq(model.series.id.clone()),
					))
					.exec(core.conn.as_ref())
					.await?
					.rows_affected;
			tracing::debug!(?affected_rows, "Removed favorite series");
		}

		Ok(model.into())
	}

	/// Update the thumbnail for a series. This will replace the existing thumbnail with the the one
	/// associated with the provided input (book). If the book does not have a thumbnail, one
	/// will be generated based on the library's thumbnail configuration.
	#[graphql(guard = "PermissionGuard::one(UserPermission::EditLibrary)")]
	async fn update_series_thumbnail(
		&self,
		ctx: &Context<'_>,
		id: ID,
		input: UpdateThumbnailInput,
	) -> Result<Series> {
		let core = ctx.data::<CoreContext>()?;
		let AuthContext { user, .. } = ctx.data::<AuthContext>()?;

		let series = series::ModelWithMetadata::find_for_user(user)
			.filter(series::Column::Id.eq(id.to_string()))
			.into_model::<series::ModelWithMetadata>()
			.one(core.conn.as_ref())
			.await?
			.ok_or("Series not found")?;
		let series_id = series.series.id.clone();

		let (_library, config) = library::Entity::find_for_user(user)
			.filter(
				library::Column::Id.in_subquery(
					Query::select()
						.column(series::Column::LibraryId)
						.from(series::Entity)
						.and_where(series::Column::Id.eq(series_id))
						.to_owned(),
				),
			)
			.find_also_related(library_config::Entity)
			.one(core.conn.as_ref())
			.await?
			.ok_or("Associated library for series not found")?;

		let book = media::Entity::find_for_user(user)
			.filter(media::Column::Id.eq(input.media_id.to_string()))
			.one(core.conn.as_ref())
			.await?
			.ok_or("Media not found")?;

		let page = input.params.page();

		if book.extension == "epub" && page > 1 {
			return Err("Cannot set thumbnail from EPUB chapter".into());
		}

		let image_options = config
			.ok_or("Library config not found")?
			.thumbnail_config
			.unwrap_or_default()
			.with_page(page);

		let (_, path_buf, _) = generate_book_thumbnail(
			&book.clone().into(),
			GenerateThumbnailOptions {
				image_options,
				core_config: core.config.as_ref().clone(),
				force_regen: true,
				filename: Some(id.to_string()),
			},
		)
		.await?;
		tracing::debug!(path = ?path_buf, "Generated series thumbnail");

		Ok(series.into())
	}

	// TODO(graphql): Implement mark_series_as_complete
	async fn mark_series_as_complete(&self, ctx: &Context<'_>, id: ID) -> Result<Series> {
		unimplemented!()
	}

	#[graphql(guard = "PermissionGuard::one(UserPermission::ScanLibrary)")]
	async fn scan_series(&self, ctx: &Context<'_>, id: ID) -> Result<bool> {
		let AuthContext { user, .. } = ctx.data::<AuthContext>()?;
		let core = ctx.data::<CoreContext>()?;
		let conn = core.conn.as_ref();

		let model =
			series::Entity::find_series_ident_for_user_and_id(user, id.to_string())
				.into_model::<series::SeriesIdentSelect>()
				.one(conn)
				.await?
				.ok_or("Series not found")?;

		core.enqueue_job(SeriesScanJob::new(model.id, model.path, None))?;

		Ok(true)
	}
}

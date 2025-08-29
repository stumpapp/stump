use async_graphql::{Context, Object, Result, ID};
use chrono::Utc;
use models::{
	entity::{favorite_series, library, library_config, media, media_metadata, series},
	shared::enums::{MetadataResetImpact, UserPermission},
};
use sea_orm::{
	prelude::*,
	sea_query::{OnConflict, Query},
	ActiveValue::Set,
	IntoActiveModel, TransactionTrait,
};
use stump_core::filesystem::{
	image::{generate_book_thumbnail, GenerateThumbnailOptions},
	media::analyze_media_job::AnalyzeMediaJob,
	scanner::SeriesScanJob,
};

use crate::{
	data::{AuthContext, CoreContext},
	guard::PermissionGuard,
	input::{series::SeriesMetadataInput, thumbnail::UpdateThumbnailInput},
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

	#[graphql(guard = "PermissionGuard::one(UserPermission::EditMetadata)")]
	async fn update_series_metadata(
		&self,
		ctx: &Context<'_>,
		id: ID,
		input: SeriesMetadataInput,
	) -> Result<Series> {
		let AuthContext { user, .. } = ctx.data::<AuthContext>()?;
		let conn = ctx.data::<CoreContext>()?.conn.as_ref();

		let model = series::ModelWithMetadata::find_for_user(user)
			.filter(series::Column::Id.eq(id.to_string()))
			.into_model::<series::ModelWithMetadata>()
			.one(conn)
			.await?
			.ok_or("Series not found")?;

		let mut active_model = input.into_active_model();
		active_model.series_id = Set(model.series.id.clone());

		let updated_metadata = if model.metadata.is_some() {
			active_model.update(conn).await?
		} else {
			active_model.insert(conn).await?
		};

		let model = series::ModelWithMetadata {
			series: model.series,
			metadata: Some(updated_metadata),
		};

		Ok(model.into())
	}

	#[graphql(guard = "PermissionGuard::one(UserPermission::EditMetadata)")]
	async fn reset_series_metadata(
		&self,
		ctx: &Context<'_>,
		id: ID,
		impact: MetadataResetImpact,
	) -> Result<Series> {
		let AuthContext { user, .. } = ctx.data::<AuthContext>()?;
		let core = ctx.data::<CoreContext>()?;
		let conn = core.conn.as_ref();

		let mut model = series::ModelWithMetadata::find_for_user(user)
			.filter(series::Column::Id.eq(id.to_string()))
			.into_model::<series::ModelWithMetadata>()
			.one(conn)
			.await?
			.ok_or("Series not found")?;

		let tx = conn.begin().await?;

		if matches!(
			impact,
			MetadataResetImpact::Series | MetadataResetImpact::Everything
		) {
			if let Some(metadata) = model.metadata.take() {
				metadata.delete(&tx).await?;
			} else {
				tracing::debug!(series_id = ?model.series.id, "No metadata to reset");
			}
		}

		if matches!(
			impact,
			MetadataResetImpact::Books | MetadataResetImpact::Everything
		) {
			let media_metadata_models = media_metadata::Entity::find()
				.filter(
					media_metadata::Column::MediaId.in_subquery(
						Query::select()
							.column(media::Column::Id)
							.from(media::Entity)
							.and_where(
								media::Column::SeriesId.eq(model.series.id.clone()),
							)
							.to_owned(),
					),
				)
				.all(&tx)
				.await?;
			tracing::trace!(
				count = media_metadata_models.len(),
				"Found media metadata to delete"
			);

			for media_metadata in media_metadata_models {
				media_metadata.delete(&tx).await?;
			}
		}

		tx.commit().await?;

		tracing::debug!(?impact, series_id = ?model.series.id, "Reset metadata for series");

		Ok(model.into())
	}

	// TODO(graphql): Implement mark_series_as_complete
	async fn mark_series_as_complete(
		&self,
		_ctx: &Context<'_>,
		_id: ID,
	) -> Result<Series> {
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

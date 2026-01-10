use async_graphql::{Context, Object, Result, ID};
use chrono::Utc;
use models::{
	entity::{
		favorite_series, finished_reading_session, library, library_config, media,
		media_metadata, reading_session, series, user::AuthUser,
	},
	shared::enums::{MetadataResetImpact, UserPermission},
};
use sea_orm::{
	prelude::*,
	sea_query::{OnConflict, Query},
	ActiveValue::Set,
	IntoActiveModel, QuerySelect, TransactionTrait,
};
use stump_core::filesystem::{
	image::{generate_book_thumbnail, GenerateThumbnailOptions},
	media::analysis::{AnalysisJobConfig, AnalyzeMediaJob, MediaAnalysisJobScope},
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
	async fn analyze_series(
		&self,
		ctx: &Context<'_>,
		id: ID,
		#[graphql(default = false)] force_reanalysis: bool,
	) -> Result<bool> {
		let AuthContext { user, .. } = ctx.data::<AuthContext>()?;
		let core = ctx.data::<CoreContext>()?;
		let conn = core.conn.as_ref();

		let model =
			series::Entity::find_series_ident_for_user_and_id(user, id.to_string())
				.into_model::<series::SeriesIdentSelect>()
				.one(conn)
				.await?
				.ok_or("Series not found")?;

		core.enqueue_job(
			AnalyzeMediaJob::new(AnalysisJobConfig {
				force_reanalysis,
				scope: MediaAnalysisJobScope::Series(model.id),
			})
			.wrapped(),
		)?;

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
			core.conn.as_ref(),
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

	/// Toggle the completion status of a series. If the series is marked as completed, all books
	/// in the series will also be marked as completed, and vice versa for marking as not completed.
	/// This is considered a dangerous operation since it can modify all your read progression related
	/// to a single series all at once. Please use with caution.
	async fn toggle_series_completion(
		&self,
		ctx: &Context<'_>,
		id: ID,
		is_completed: bool,
	) -> Result<Series> {
		let AuthContext { user, .. } = ctx.data::<AuthContext>()?;
		let core = ctx.data::<CoreContext>()?;

		let series = series::ModelWithMetadata::find_for_user(user)
			.filter(series::Column::Id.eq(id.to_string()))
			.into_model::<series::ModelWithMetadata>()
			.one(core.conn.as_ref())
			.await?
			.ok_or("Series not found")?;

		if is_completed {
			set_series_completed(core, user, &series).await?;
		} else {
			unset_series_completed(core, user, &series).await?;
		}

		Ok(series.into())
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

async fn set_series_completed(
	core: &CoreContext,
	user: &AuthUser,
	series: &series::ModelWithMetadata,
) -> Result<()> {
	let tx = core.conn.begin().await?;

	let book_ids_without_completion = media::Entity::find_for_user(user)
		.select_only()
		.column(media::Column::Id)
		.filter(
			media::Column::SeriesId.eq(series.series.id.clone()).and(
				media::Column::Id.in_subquery(
					Query::select()
						.column(finished_reading_session::Column::MediaId)
						.from(finished_reading_session::Entity)
						.and_where(
							finished_reading_session::Column::UserId.eq(user.id.clone()),
						)
						.to_owned(),
				),
			),
		)
		.all(&tx)
		.await?
		.into_iter()
		.map(|m| m.id)
		.collect::<Vec<String>>();
	tracing::debug!(
		count = book_ids_without_completion.len(),
		"Fetched unread/incomplete books for series"
	);

	// Delete any active sessions for books in this series
	let affected_rows = reading_session::Entity::delete_many()
		.filter(
			reading_session::Column::UserId.eq(user.id.clone()).and(
				reading_session::Column::MediaId.in_subquery(
					Query::select()
						.column(media::Column::Id)
						.from(media::Entity)
						.and_where(media::Column::SeriesId.eq(series.series.id.clone()))
						.to_owned(),
				),
			),
		)
		.exec(&tx)
		.await?
		.rows_affected;
	tracing::debug!(?affected_rows, "Deleted active reading sessions for series");

	let finished_sessions = book_ids_without_completion
		.into_iter()
		.map(|media_id| finished_reading_session::ActiveModel {
			user_id: Set(user.id.clone()),
			media_id: Set(media_id),
			completed_at: Set(DateTimeWithTimeZone::from(Utc::now())),
			..Default::default()
		})
		.collect::<Vec<finished_reading_session::ActiveModel>>();

	// Create finished reading sessions for all books in the series that are not yet completed
	if !finished_sessions.is_empty() {
		let count = finished_sessions.len();
		let _ = finished_reading_session::Entity::insert_many(finished_sessions)
			.exec(&tx)
			.await?;
		tracing::debug!(count, "Inserted finished reading sessions for series");
	} else {
		tracing::debug!("No books to mark as finished in series");
	}

	tx.commit().await?;

	Ok(())
}

async fn unset_series_completed(
	core: &CoreContext,
	user: &AuthUser,
	series: &series::ModelWithMetadata,
) -> Result<()> {
	let tx = core.conn.begin().await?;

	let affected_rows = finished_reading_session::Entity::delete_many()
		.filter(
			finished_reading_session::Column::UserId
				.eq(user.id.clone())
				.and(
					finished_reading_session::Column::MediaId.in_subquery(
						Query::select()
							.column(media::Column::Id)
							.from(media::Entity)
							.and_where(
								media::Column::SeriesId.eq(series.series.id.clone()),
							)
							.to_owned(),
					),
				),
		)
		.exec(&tx)
		.await?
		.rows_affected;

	tracing::debug!(
		?affected_rows,
		"Removed finished reading sessions for series"
	);

	tx.commit().await?;

	Ok(())
}

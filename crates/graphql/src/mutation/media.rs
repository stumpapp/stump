use async_graphql::{Context, Object, Result, ID};
use chrono::Utc;
use models::{
	entity::{favorite_media, library, library_config, media, series},
	shared::enums::UserPermission,
};
use sea_orm::{
	prelude::*,
	sea_query::{OnConflict, Query},
	IntoActiveModel, QuerySelect, Set,
};
use stump_core::{
	filesystem::{
		image::{generate_book_thumbnail, GenerateThumbnailOptions},
		media::analysis::{AnalysisJobConfig, MediaAnalysisJobScope},
	},
	job::stump_job::StumpJob,
};

use crate::{
	data::{AuthContext, CoreContext},
	guard::PermissionGuard,
	input::thumbnail::PageBasedThumbnailInput,
	object::media::Media,
};

#[derive(Default)]
pub struct MediaMutation;

#[Object]
impl MediaMutation {
	#[graphql(guard = "PermissionGuard::one(UserPermission::ManageLibrary)")]
	async fn analyze_media(
		&self,
		ctx: &Context<'_>,
		id: ID,
		#[graphql(default = false)] force_reanalysis: bool,
	) -> Result<bool> {
		let AuthContext { user, .. } = ctx.data::<AuthContext>()?;
		let core = ctx.data::<CoreContext>()?;
		let conn = core.conn.as_ref();

		let model = media::Entity::find_for_user(user)
			.select_only()
			.columns(vec![media::Column::Id, media::Column::Path])
			.filter(media::Column::Id.eq(id.to_string()))
			.into_model::<media::MediaIdentSelect>()
			.one(conn)
			.await?
			.ok_or("Media not found")?;

		core.enqueue(StumpJob::analyze_media(AnalysisJobConfig {
			force_reanalysis,
			scope: MediaAnalysisJobScope::Book(model.id),
		}))
		.await?;

		Ok(true)
	}

	// TODO: Support converting other formats in the future
	#[graphql(guard = "PermissionGuard::one(UserPermission::ManageLibrary)")]
	async fn convert_media(&self, ctx: &Context<'_>, id: ID) -> Result<bool> {
		let AuthContext { user, .. } = ctx.data::<AuthContext>()?;
		let core = ctx.data::<CoreContext>()?;
		let conn = core.conn.as_ref();

		let _model = media::Entity::find_for_user(user)
			.select_only()
			.columns(vec![media::Column::Id, media::Column::Path])
			.filter(media::Column::Id.eq(id.to_string()))
			.into_model::<media::MediaIdentSelect>()
			.one(conn)
			.await?
			.ok_or("Media not found")?;

		// if media.extension != "cbr" || media.extension != "rar" {
		//     return Err(APIError::BadRequest(String::from(
		//         "Stump only supports RAR to ZIP conversions at this time",
		//     )));
		// }

		Err("Not implemented".into())
	}

	#[graphql(guard = "PermissionGuard::one(UserPermission::ManageLibrary)")]
	async fn delete_media(&self, ctx: &Context<'_>, id: ID) -> Result<Media> {
		let AuthContext { user, .. } = ctx.data::<AuthContext>()?;
		let core = ctx.data::<CoreContext>()?;
		let conn = core.conn.as_ref();

		let model = media::ModelWithMetadata::find_for_user(user)
			.filter(media::Column::Id.eq(id.to_string()))
			.into_model::<media::ModelWithMetadata>()
			.one(conn)
			.await?
			.ok_or("Media not found")?;
		let mut active_model = model.media.clone().into_active_model();
		active_model.deleted_at = Set(Some(Utc::now().into()));
		let deleted_book = active_model.update(conn).await?;

		Ok(Media::from(media::ModelWithMetadata {
			media: deleted_book,
			..model
		}))
	}

	async fn favorite_media(
		&self,
		ctx: &Context<'_>,
		id: ID,
		is_favorite: bool,
	) -> Result<Media> {
		let AuthContext { user, .. } = ctx.data::<AuthContext>()?;
		let core = ctx.data::<CoreContext>()?;
		let conn = core.conn.as_ref();

		let model = media::ModelWithMetadata::find_for_user(user)
			.filter(
				media::Column::Id
					.eq(id.to_string())
					.and(media::Column::DeletedAt.is_null()),
			)
			.into_model::<media::ModelWithMetadata>()
			.one(conn)
			.await?
			.ok_or("Media not found")?;

		if is_favorite {
			let last_insert_id =
				favorite_media::Entity::insert(favorite_media::ActiveModel {
					user_id: Set(user.id.clone()),
					media_id: Set(model.media.id.clone()),
					favorited_at: Set(DateTimeWithTimeZone::from(Utc::now())),
				})
				.on_conflict(OnConflict::new().do_nothing().to_owned())
				.exec(core.conn.as_ref())
				.await?
				.last_insert_id;
			tracing::debug!(?last_insert_id, "Added favorite media");
		} else {
			let affected_rows = favorite_media::Entity::delete_many()
				.filter(
					favorite_media::Column::UserId
						.eq(user.id.clone())
						.and(favorite_media::Column::MediaId.eq(model.media.id.clone())),
				)
				.exec(core.conn.as_ref())
				.await?
				.rows_affected;
			tracing::debug!(?affected_rows, "Removed favorite media");
		}

		Ok(model.into())
	}

	/// Update the thumbnail for a book. This will replace the existing thumbnail with the the one
	/// associated with the provided input (book). If the book does not have a thumbnail, one
	/// will be generated based on the library's thumbnail configuration.
	#[graphql(guard = "PermissionGuard::one(UserPermission::EditThumbnails)")]
	async fn update_media_thumbnail(
		&self,
		ctx: &Context<'_>,
		id: ID,
		input: PageBasedThumbnailInput,
	) -> Result<Media> {
		let core = ctx.data::<CoreContext>()?;
		let AuthContext { user, .. } = ctx.data::<AuthContext>()?;

		let book = media::ModelWithMetadata::find_for_user(user)
			.filter(media::Column::Id.eq(id.to_string()))
			.into_model::<media::ModelWithMetadata>()
			.one(core.conn.as_ref())
			.await?
			.ok_or("Book not found")?;

		let series_id = book
			.media
			.series_id
			.clone()
			.ok_or("Series ID not set on book")?;

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
			.ok_or("Associated library for book not found")?;

		let page = input.page();

		if book.media.extension == "epub" && page > 1 {
			return Err("Cannot set thumbnail from EPUB chapter".into());
		}

		let image_options = config
			.ok_or("Library config not found")?
			.thumbnail_config
			.unwrap_or_default()
			.with_page(page);

		let (_, path_buf, _) = generate_book_thumbnail(
			&book.media.clone().into(),
			core.conn.as_ref(),
			GenerateThumbnailOptions {
				image_options,
				core_config: core.config.as_ref().clone(),
				force_regen: true,
				filename: Some(id.to_string()),
			},
		)
		.await?;
		tracing::debug!(path = ?path_buf, "Generated book thumbnail");

		Ok(book.into())
	}
}

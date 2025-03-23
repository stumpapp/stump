use axum::{
	extract::{Path, State},
	routing::get,
	Extension, Router,
};
use graphql::data::RequestContext;
use models::{entity::media, shared::enums::UserPermission};
use sea_orm::{prelude::*, QuerySelect};

use crate::{
	config::state::AppState,
	errors::{APIError, APIResult},
	utils::http::NamedFile,
};

pub(crate) fn mount(app_state: AppState) -> Router<AppState> {
	// let mut thumbnail_method_router =
	// 	get(get_media_thumbnail_handler).patch(patch_media_thumbnail);

	// if app_state.config.enable_upload {
	// 	thumbnail_method_router =
	// 		thumbnail_method_router.post(replace_media_thumbnail).layer(
	// 			DefaultBodyLimit::max(app_state.config.max_image_upload_size),
	// 		);
	// }

	Router::new().nest(
		"/media/{id}",
		Router::new().route("/file", get(get_media_file)),
	)
}

/// Download the file associated with the media.
pub(crate) async fn get_media_file(
	Path(id): Path<String>,
	State(ctx): State<AppState>,
	// Extension(req): Extension<RequestContext>,
) -> APIResult<NamedFile> {
	// let user = req
	// 	.user_and_enforce_permissions(&[UserPermission::DownloadFile])
	// 	.map_err(|e| APIError::Forbidden(e.message))?;

	// let book = media::Entity::find_for_user(&user)
	// 	.select_only()
	// 	.columns(vec![media::Column::Id, media::Column::Path])
	// 	.filter(media::Column::Id.eq(id))
	// 	.into_model::<media::MediaIdentSelect>()
	// 	.one(ctx.conn.as_ref())
	// 	.await?
	// 	.ok_or_else(|| APIError::NotFound("Book not found".to_string()))?;
	// tracing::trace!(?book, "Downloading media file");

	// Ok(NamedFile::open(book.path.clone()).await?)
	unimplemented!()
}

// pub(crate) async fn get_media_thumbnail(
// 	id: &str,
// 	path: &str,
// 	image_format: Option<SupportedImageFormat>,
// 	config: &StumpConfig,
// ) -> APIResult<(ContentType, Vec<u8>)> {
// 	let generated_thumb =
// 		get_thumbnail(config.get_thumbnails_dir(), id, image_format).await?;

// 	if let Some((content_type, bytes)) = generated_thumb {
// 		Ok((content_type, bytes))
// 	} else {
// 		Ok(get_page_async(path, 1, config).await?)
// 	}
// }

// pub(crate) async fn get_media_thumbnail_by_id(
// 	id: String,
// 	db: &PrismaClient,
// 	user: &User,
// 	config: &StumpConfig,
// ) -> APIResult<(ContentType, Vec<u8>)> {
// 	let age_restrictions = user
// 		.age_restriction
// 		.as_ref()
// 		.map(|ar| apply_media_age_restriction(ar.age, ar.restrict_on_unset));
// 	let where_params = chain_optional_iter(
// 		[media::id::equals(id.clone())]
// 			.into_iter()
// 			.chain(apply_media_library_not_hidden_for_user_filter(user))
// 			.collect::<Vec<WhereParam>>(),
// 		[age_restrictions],
// 	);

// 	let book = db
// 		.media()
// 		.find_first(where_params)
// 		.select(media_thumbnail::select())
// 		.exec()
// 		.await?
// 		.ok_or_else(|| APIError::NotFound("Book not found".to_string()))?;

// 	let library_config = book
// 		.series
// 		.and_then(|s| s.library.map(|l| l.config))
// 		.map(LibraryConfig::from);
// 	// let image_format = library_config.and_then(|o| o.thumbnail_config.map(|c| c.format));
// 	// TODO(sea-orm):Fix
// 	let image_format: Option<SupportedImageFormat> = None;

// 	get_media_thumbnail(&book.id, &book.path, image_format, config).await
// }

// pub(crate) async fn get_media_thumbnail_handler(
// 	Path(id): Path<String>,
// 	State(ctx): State<AppState>,
// 	Extension(req): Extension<RequestContext>,
// ) -> APIResult<ImageResponse> {
// 	let db = &ctx.db;
// 	get_media_thumbnail_by_id(id, db, req.user(), &ctx.config)
// 		.await
// 		.map(ImageResponse::from)
// }

// pub(crate) async fn patch_media_thumbnail(
// 	Path(id): Path<String>,
// 	State(ctx): State<AppState>,
// 	Extension(req): Extension<RequestContext>,
// 	Json(body): Json<PatchMediaThumbnail>,
// ) -> APIResult<ImageResponse> {
// 	let user = req.user_and_enforce_permissions(&[UserPermission::ManageLibrary])?;
// 	let age_restrictions = user
// 		.age_restriction
// 		.as_ref()
// 		.map(|ar| apply_media_age_restriction(ar.age, ar.restrict_on_unset));
// 	let where_params = chain_optional_iter(
// 		[media::id::equals(id.clone())]
// 			.into_iter()
// 			.chain(apply_media_library_not_hidden_for_user_filter(&user))
// 			.collect::<Vec<WhereParam>>(),
// 		[age_restrictions],
// 	);

// 	let client = &ctx.db;

// 	let target_page = body.is_zero_based.map_or(body.page, |is_zero_based| {
// 		if is_zero_based {
// 			body.page + 1
// 		} else {
// 			body.page
// 		}
// 	});

// 	let media = client
// 		.media()
// 		.find_first(where_params)
// 		.with(
// 			media::series::fetch()
// 				.with(series::library::fetch().with(library::config::fetch())),
// 		)
// 		.exec()
// 		.await?
// 		.ok_or(APIError::NotFound(String::from("Media not found")))?;

// 	if media.extension == "epub" {
// 		return Err(APIError::NotSupported);
// 	}

// 	let library = media
// 		.series()?
// 		.ok_or(APIError::NotFound(String::from("Series relation missing")))?
// 		.library()?
// 		.ok_or(APIError::NotFound(String::from("Library relation missing")))?;

// 	// TODO(sea-orm): Fix
// 	unimplemented!("SeaORM migration")

// 	// let image_options = library
// 	// 	.config()?
// 	// 	.thumbnail_config
// 	// 	.clone()
// 	// 	.map(ImageProcessorOptions::try_from)
// 	// 	.transpose()?
// 	// 	.unwrap_or_else(|| {
// 	// 		tracing::warn!(
// 	// 			"Failed to parse existing thumbnail config! Using a default config"
// 	// 		);
// 	// 		ImageProcessorOptions::default()
// 	// 	})
// 	// 	.with_page(target_page);

// 	// let format = image_options.format.clone();
// 	// let (_, path_buf, _) = generate_book_thumbnail(
// 	// 	&media,
// 	// 	GenerateThumbnailOptions {
// 	// 		image_options,
// 	// 		core_config: ctx.config.as_ref().clone(),
// 	// 		force_regen: true,
// 	// 		filename: Some(media.id.clone()),
// 	// 	},
// 	// )
// 	// .await?;

// 	// Ok(ImageResponse::from((
// 	// 	ContentType::from(format),
// 	// 	fs::read(path_buf).await?,
// 	// )))
// }

// pub(crate) async fn replace_media_thumbnail(
// 	Path(id): Path<String>,
// 	State(ctx): State<AppState>,
// 	Extension(req): Extension<RequestContext>,
// 	mut upload: Multipart,
// ) -> APIResult<ImageResponse> {
// 	let user = req.user_and_enforce_permissions(&[
// 		UserPermission::UploadFile,
// 		UserPermission::ManageLibrary,
// 	])?;
// 	let age_restrictions = user
// 		.age_restriction
// 		.as_ref()
// 		.map(|ar| apply_media_age_restriction(ar.age, ar.restrict_on_unset));
// 	let where_params = chain_optional_iter(
// 		[media::id::equals(id.clone())]
// 			.into_iter()
// 			.chain(apply_media_library_not_hidden_for_user_filter(&user))
// 			.collect::<Vec<WhereParam>>(),
// 		[age_restrictions],
// 	);
// 	let client = &ctx.db;

// 	let media = client
// 		.media()
// 		.find_first(where_params)
// 		.exec()
// 		.await?
// 		.ok_or(APIError::NotFound(String::from("Media not found")))?;

// 	let upload_data =
// 		validate_and_load_image(&mut upload, Some(ctx.config.max_image_upload_size))
// 			.await?;
// 	let ext = upload_data.content_type.extension();
// 	let book_id = media.id;

// 	// Note: I chose to *safely* attempt the removal as to not block the upload, however after some
// 	// user testing I'd like to see if this becomes a problem. We'll see!
// 	if let Err(e) =
// 		remove_thumbnails(&[book_id.clone()], &ctx.config.get_thumbnails_dir()).await
// 	{
// 		tracing::error!(
// 			?e,
// 			"Failed to remove existing media thumbnail before replacing!"
// 		);
// 	}

// 	let path_buf =
// 		place_thumbnail(&book_id, ext, &upload_data.bytes, &ctx.config).await?;

// 	Ok(ImageResponse::from((
// 		upload_data.content_type,
// 		fs::read(path_buf).await?,
// 	)))
// }

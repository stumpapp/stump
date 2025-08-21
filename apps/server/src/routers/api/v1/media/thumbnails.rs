use axum::{
	extract::{Multipart, Path, State},
	Extension, Json,
};
use models::shared::image_processor_options::SupportedImageFormat;
use serde::Deserialize;
use stump_core::{
	config::StumpConfig,
	db::entity::{macros::media_thumbnail, LibraryConfig, User, UserPermission},
	filesystem::{
		get_thumbnail,
		image::{
			generate_book_thumbnail, place_thumbnail, remove_thumbnails,
			GenerateThumbnailOptions,
		},
		media::get_page_async,
		ContentType,
	},
	prisma::{
		library,
		media::{self, WhereParam},
		series, PrismaClient,
	},
};
use tokio::fs;
use utoipa::ToSchema;

use crate::{
	config::state::AppState,
	errors::{APIError, APIResult},
	filter::chain_optional_iter,
	middleware::auth::AuthContext,
	routers::api::filters::{
		apply_media_age_restriction, apply_media_library_not_hidden_for_user_filter,
	},
	utils::{http::ImageResponse, validate_and_load_image},
};

/// Request body for updating a media's thumbnail using a specific page from the media.
///
/// The `page` field specifies the page to be used to generate a thumbnail. The
/// `is_zero_based` field  can be set to `true` if the page numbering starts from
/// `0`. This will add 1 to the indicated `page`. A `None` value is the same
/// as passing `Some(false)`.
#[derive(Deserialize, ToSchema, specta::Type)]
pub struct PatchMediaThumbnail {
	page: i32,
	#[specta(optional)]
	is_zero_based: Option<bool>,
}

pub(crate) async fn get_media_thumbnail_by_id(
	id: String,
	db: &PrismaClient,
	user: &User,
	config: &StumpConfig,
) -> APIResult<(ContentType, Vec<u8>)> {
	let age_restrictions = user
		.age_restriction
		.as_ref()
		.map(|ar| apply_media_age_restriction(ar.age, ar.restrict_on_unset));
	let where_params = chain_optional_iter(
		[media::id::equals(id.clone())]
			.into_iter()
			.chain(apply_media_library_not_hidden_for_user_filter(user))
			.collect::<Vec<WhereParam>>(),
		[age_restrictions],
	);

	let book = db
		.media()
		.find_first(where_params)
		.select(media_thumbnail::select())
		.exec()
		.await?
		.ok_or_else(|| APIError::NotFound("Book not found".to_string()))?;

	let library_config = book
		.series
		.and_then(|s| s.library.map(|l| l.config))
		.map(LibraryConfig::from);
	// let image_format = library_config.and_then(|o| o.thumbnail_config.map(|c| c.format));
	// TODO(sea-orm):Fix
	let image_format: Option<SupportedImageFormat> = None;

	get_media_thumbnail(&book.id, &book.path, image_format, config).await
}

pub(crate) async fn get_media_thumbnail(
	id: &str,
	path: &str,
	image_format: Option<SupportedImageFormat>,
	config: &StumpConfig,
) -> APIResult<(ContentType, Vec<u8>)> {
	let generated_thumb =
		get_thumbnail(config.get_thumbnails_dir(), id, image_format).await?;

	if let Some((content_type, bytes)) = generated_thumb {
		Ok((content_type, bytes))
	} else {
		Ok(get_page_async(path, 1, config).await?)
	}
}

// TODO: ImageResponse as body type
#[utoipa::path(
	get,
	path = "/api/v1/media/{id}/thumbnail",
	tag = "media",
	params(
		("id" = String, Path, description = "The ID of the media")
	),
	responses(
		(status = 200, description = "Successfully fetched media thumbnail"),
		(status = 401, description = "Unauthorized"),
		(status = 403, description = "Forbidden"),
		(status = 404, description = "Media not found"),
		(status = 500, description = "Internal server error"),
	)
)]
/// Get the thumbnail image of a media
pub(crate) async fn get_media_thumbnail_handler(
	Path(id): Path<String>,
	State(ctx): State<AppState>,
	Extension(req): Extension<AuthContext>,
) -> APIResult<ImageResponse> {
	let db = &ctx.db;
	get_media_thumbnail_by_id(id, db, req.user(), &ctx.config)
		.await
		.map(ImageResponse::from)
}

#[utoipa::path(
    patch,
    path = "/api/v1/media/{id}/thumbnail",
    tag = "media",
    params(
        ("id" = String, Path, description = "The ID of the media")
    ),
    responses(
        (status = 200, description = "Successfully updated media thumbnail"),
        (status = 401, description = "Unauthorized"),
        (status = 403, description = "Forbidden"),
        (status = 404, description = "Media not found"),
        (status = 500, description = "Internal server error"),
    )
)]
pub(crate) async fn patch_media_thumbnail(
	Path(id): Path<String>,
	State(ctx): State<AppState>,
	Extension(req): Extension<AuthContext>,
	Json(body): Json<PatchMediaThumbnail>,
) -> APIResult<ImageResponse> {
	let user = req.user_and_enforce_permissions(&[UserPermission::ManageLibrary])?;
	let age_restrictions = user
		.age_restriction
		.as_ref()
		.map(|ar| apply_media_age_restriction(ar.age, ar.restrict_on_unset));
	let where_params = chain_optional_iter(
		[media::id::equals(id.clone())]
			.into_iter()
			.chain(apply_media_library_not_hidden_for_user_filter(&user))
			.collect::<Vec<WhereParam>>(),
		[age_restrictions],
	);

	let client = &ctx.db;

	let target_page = body.is_zero_based.map_or(body.page, |is_zero_based| {
		if is_zero_based {
			body.page + 1
		} else {
			body.page
		}
	});

	let media = client
		.media()
		.find_first(where_params)
		.with(
			media::series::fetch()
				.with(series::library::fetch().with(library::config::fetch())),
		)
		.exec()
		.await?
		.ok_or(APIError::NotFound(String::from("Media not found")))?;

	if media.extension == "epub" {
		return Err(APIError::NotSupported);
	}

	let library = media
		.series()?
		.ok_or(APIError::NotFound(String::from("Series relation missing")))?
		.library()?
		.ok_or(APIError::NotFound(String::from("Library relation missing")))?;

	// TODO(sea-orm): Fix
	unimplemented!("SeaORM migration")

	// let image_options = library
	// 	.config()?
	// 	.thumbnail_config
	// 	.clone()
	// 	.map(ImageProcessorOptions::try_from)
	// 	.transpose()?
	// 	.unwrap_or_else(|| {
	// 		tracing::warn!(
	// 			"Failed to parse existing thumbnail config! Using a default config"
	// 		);
	// 		ImageProcessorOptions::default()
	// 	})
	// 	.with_page(target_page);

	// let format = image_options.format.clone();
	// let (_, path_buf, _) = generate_book_thumbnail(
	// 	&media,
	// 	GenerateThumbnailOptions {
	// 		image_options,
	// 		core_config: ctx.config.as_ref().clone(),
	// 		force_regen: true,
	// 		filename: Some(media.id.clone()),
	// 	},
	// )
	// .await?;

	// Ok(ImageResponse::from((
	// 	ContentType::from(format),
	// 	fs::read(path_buf).await?,
	// )))
}

#[utoipa::path(
	post,
	path = "/api/v1/media/{id}/thumbnail",
	tag = "media",
	params(
		("id" = String, Path, description = "The ID of the media")
	),
	responses(
		(status = 200, description = "Successfully replaced media thumbnail"),
		(status = 401, description = "Unauthorized"),
		(status = 403, description = "Forbidden"),
		(status = 404, description = "Media not found"),
		(status = 500, description = "Internal server error"),
	)
)]
pub(crate) async fn replace_media_thumbnail(
	Path(id): Path<String>,
	State(ctx): State<AppState>,
	Extension(req): Extension<AuthContext>,
	mut upload: Multipart,
) -> APIResult<ImageResponse> {
	let user = req.user_and_enforce_permissions(&[
		UserPermission::UploadFile,
		UserPermission::ManageLibrary,
	])?;
	let age_restrictions = user
		.age_restriction
		.as_ref()
		.map(|ar| apply_media_age_restriction(ar.age, ar.restrict_on_unset));
	let where_params = chain_optional_iter(
		[media::id::equals(id.clone())]
			.into_iter()
			.chain(apply_media_library_not_hidden_for_user_filter(&user))
			.collect::<Vec<WhereParam>>(),
		[age_restrictions],
	);
	let client = &ctx.db;

	let media = client
		.media()
		.find_first(where_params)
		.exec()
		.await?
		.ok_or(APIError::NotFound(String::from("Media not found")))?;

	let upload_data =
		validate_and_load_image(&mut upload, Some(ctx.config.max_image_upload_size))
			.await?;
	let ext = upload_data.content_type.extension();
	let book_id = media.id;

	// Note: I chose to *safely* attempt the removal as to not block the upload, however after some
	// user testing I'd like to see if this becomes a problem. We'll see!
	if let Err(e) =
		remove_thumbnails(&[book_id.clone()], &ctx.config.get_thumbnails_dir()).await
	{
		tracing::error!(
			?e,
			"Failed to remove existing media thumbnail before replacing!"
		);
	}

	let path_buf =
		place_thumbnail(&book_id, ext, &upload_data.bytes, &ctx.config).await?;

	Ok(ImageResponse::from((
		upload_data.content_type,
		fs::read(path_buf).await?,
	)))
}

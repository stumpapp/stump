use axum::{
	body::Body,
	extract::{Path, State},
	http::{header, HeaderMap, Request},
	middleware,
	response::IntoResponse,
	routing::get,
	Extension, Router,
};
use graphql::data::AuthContext;
use models::{
	entity::{library, library_config, media, series, user::AuthUser},
	shared::{enums::UserPermission, image_processor_options::SupportedImageFormat},
};
use sea_orm::{prelude::*, sea_query::Query, QuerySelect};
use stump_core::{
	config::StumpConfig,
	filesystem::{
		get_saved_thumbnail, get_thumbnail, media::get_page_async, ContentType, FileError,
	},
	Ctx,
};
use tower_http::services::ServeFile;

use crate::{
	config::state::AppState,
	errors::{APIError, APIResult},
	middleware::auth::auth_middleware,
	utils::http::ImageResponse,
};

pub(crate) fn mount(app_state: AppState) -> Router<AppState> {
	Router::new()
		.nest(
			"/media/{id}",
			Router::new()
				.route("/thumbnail", get(get_media_thumbnail_handler))
				.route("/page/{page}", get(get_media_page))
				.route("/file", get(get_media_file)),
		)
		.layer(middleware::from_fn_with_state(app_state, auth_middleware))
}

/// Download the file associated with the media.
pub(crate) async fn get_media_file(
	Path(id): Path<String>,
	State(ctx): State<AppState>,
	Extension(req): Extension<AuthContext>,
	headers: HeaderMap,
) -> APIResult<impl IntoResponse> {
	let user = req
		.user_and_enforce_permissions(&[UserPermission::DownloadFile])
		.map_err(|_| {
			tracing::error!("User does not have permission to download file");
			APIError::forbidden_discreet()
		})?;

	let book = media::Entity::find_for_user(&user)
		.filter(media::Column::Id.eq(id.clone()))
		.into_model::<media::MediaIdentSelect>()
		.one(ctx.conn.as_ref())
		.await?
		.ok_or(APIError::NotFound("Book not found".to_string()))?;

	// Note: I am reusing the original headers to support range requests
	let mut serve_req = Request::new(Body::empty());
	*serve_req.headers_mut() = headers;

	match ServeFile::new(&book.path).try_call(serve_req).await {
		Ok(mut response) => {
			if let Some(filename) = std::path::Path::new(&book.path)
				.file_name()
				.and_then(|os_str| os_str.to_str())
			{
				response.headers_mut().insert(
					header::CONTENT_DISPOSITION,
					format!("attachment; filename=\"{}\"", filename)
						.parse()
						.unwrap_or_else(|_| "attachment".parse().unwrap()),
				);
			}
			Ok(response)
		},
		Err(e) => {
			tracing::error!(error = ?e, path = %book.path, "Error serving media file");
			Err(APIError::InternalServerError(format!(
				"Failed to serve file: {}",
				e
			)))
		},
	}
}

pub(crate) async fn get_media_thumbnail(
	id: &str,
	path: &str,
	image_format: Option<SupportedImageFormat>,
	config: &StumpConfig,
) -> APIResult<(ContentType, Vec<u8>)> {
	let generated_thumb =
		get_thumbnail(config.get_thumbnails_dir(), id, image_format).await?;

	let adjusted_config = StumpConfig {
		pdf_prerender_range: 0, // Disable PDF prerendering for thumbnails since we only need the first page
		..config.clone()
	};

	if let Some((content_type, bytes)) = generated_thumb {
		Ok((content_type, bytes))
	} else {
		Ok(get_page_async(path, 1, &adjusted_config).await?)
	}
}

pub(crate) async fn get_media_thumbnail_by_id(
	ctx: &Ctx,
	user: &AuthUser,
	book_id: String,
) -> APIResult<(ContentType, Vec<u8>)> {
	let book = media::Entity::find_for_user(user)
		.columns(media::MediaThumbSelect::columns())
		.filter(media::Column::Id.eq(book_id))
		.into_model::<media::MediaThumbSelect>()
		.one(ctx.conn.as_ref())
		.await?
		.ok_or(APIError::NotFound("Book not found".to_string()))?;

	// TODO: Remove the safeguard once refactored thumbnailing system is more tested
	if let Some(path) = &book.thumbnail_path {
		// Note: I figure it might be OK to not hard-fail here until the updated thumbnailing system
		// is in place, and the "fallback" basically just tries to find it if not set.
		match get_saved_thumbnail(std::path::Path::new(path)).await {
			Ok(result) => return Ok(result),
			Err(_) => {
				tracing::warn!(path = ?path, "Failed to get saved thumbnail");
			},
		}
	}

	let library_config = library_config::Entity::find()
		.filter(
			library_config::Column::LibraryId.in_subquery(
				Query::select()
					.column(library::Column::Id)
					.from(library::Entity)
					.and_where(
						library::Column::Id.in_subquery(
							Query::select()
								.column(series::Column::LibraryId)
								.from(series::Entity)
								.and_where(series::Column::Id.eq(book.series_id))
								.to_owned(),
						),
					)
					.to_owned(),
			),
		)
		.one(ctx.conn.as_ref())
		.await?;
	let image_format = library_config.and_then(|o| o.thumbnail_config.map(|c| c.format));

	get_media_thumbnail(&book.id, &book.path, image_format, ctx.config.as_ref()).await
}

pub(crate) async fn get_media_thumbnail_handler(
	Path(id): Path<String>,
	State(ctx): State<AppState>,
	Extension(req): Extension<AuthContext>,
) -> APIResult<ImageResponse> {
	get_media_thumbnail_by_id(&ctx, &req.user(), id)
		.await
		.map(ImageResponse::from)
}

async fn get_media_page(
	Path((id, page)): Path<(String, u32)>,
	State(ctx): State<AppState>,
	Extension(req): Extension<AuthContext>,
) -> APIResult<ImageResponse> {
	let book = media::Entity::find_for_user(&req.user())
		.filter(media::Column::Id.eq(id.clone()))
		.into_model::<media::MediaIdentSelect>()
		.one(ctx.conn.as_ref())
		.await?
		.ok_or(APIError::NotFound("Book not found".to_string()))?;

	let content =
		match get_page_async(&book.path, page.try_into()?, ctx.config.as_ref()).await {
			Ok(result) => result,
			Err(e) => {
				if matches!(e, FileError::NoImageError) {
					return Err(APIError::NotFound("Page not found".to_string()));
				}
				return Err(APIError::InternalServerError(e.to_string()));
			},
		};

	Ok(ImageResponse::from(content))
}

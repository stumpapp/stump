use crate::{
	config::state::AppState,
	errors::{APIError, APIResult},
	middleware::auth::auth_middleware,
	utils::http::ImageResponse,
};
use axum::{
	extract::{Path, State},
	middleware,
	routing::get,
	Extension, Router,
};
use graphql::data::AuthContext;
use models::{
	entity::{library, library_config, media, series},
	shared::image_processor_options::SupportedImageFormat,
};
use sea_orm::{prelude::*, QueryOrder};
use stump_core::{
	config::StumpConfig,
	filesystem::{get_saved_thumbnail, get_thumbnail, ContentType},
};

use super::series::get_series_thumbnail;

pub(crate) fn mount(app_state: AppState) -> Router<AppState> {
	Router::new()
		.nest(
			"/library/{id}",
			Router::new().route("/thumbnail", get(get_library_thumbnail_handler)),
		)
		.layer(middleware::from_fn_with_state(app_state, auth_middleware))
}

pub(crate) async fn get_library_thumbnail(
	library: &library::LibraryThumbSelect,
	first_series: Option<series::SeriesThumbSelect>,
	first_book: Option<media::MediaThumbSelect>,
	image_format: Option<SupportedImageFormat>,
	config: &StumpConfig,
) -> APIResult<(ContentType, Vec<u8>)> {
	// Note: This doesn't hard-fail because if the saved thumbnail is missing or corrupt, we want
	// to just pull something else instead of erroring out entirely.
	if let Some(path) = &library.thumbnail_path {
		match get_saved_thumbnail(std::path::Path::new(path)).await {
			Ok(result) => return Ok(result),
			Err(_) => {
				tracing::warn!(path = ?path, "Failed to get saved thumbnail");
			},
		}
	}

	let generated_thumb =
		get_thumbnail(config.get_thumbnails_dir(), &library.id, image_format).await?;

	match (generated_thumb, first_series) {
		(Some(result), _) => Ok(result),
		(None, Some(series)) => {
			get_series_thumbnail(&series, first_book, image_format, config).await
		},
		(None, None) => Err(APIError::NotFound(
			"Library does not have a thumbnail".to_string(),
		)),
	}
}

async fn get_library_thumbnail_handler(
	Path(id): Path<String>,
	State(ctx): State<AppState>,
	Extension(req): Extension<AuthContext>,
) -> APIResult<ImageResponse> {
	let user = req.user();
	let (library, library_config) = library::Entity::find_for_user(&user)
		.filter(library::Column::Id.eq(id.clone()))
        .find_also_related(library_config::Entity)
		.into_model::<library::LibraryThumbSelect, library_config::LibraryConfigThumbnailConfig>()
		.one(ctx.conn.as_ref())
		.await?
		.ok_or(APIError::NotFound("Library not found".to_string()))?;

	// Note: This doesn't hard-fail because if the saved thumbnail is missing or corrupt, we want
	// to just pull something else instead of erroring out entirely.
	if let Some(path) = &library.thumbnail_path {
		match get_saved_thumbnail(std::path::Path::new(path)).await {
			Ok(result) => return Ok(result.into()),
			Err(_) => {
				tracing::warn!(path = ?path, "Failed to get saved thumbnail");
			},
		}
	}

	let first_series = series::Entity::find_for_user(&user)
		.filter(series::Column::LibraryId.eq(library.id.clone()))
		.order_by_asc(series::Column::Name)
		.into_model::<series::SeriesThumbSelect>()
		.one(ctx.conn.as_ref())
		.await?;

	let first_book = if let Some(ref series) = first_series {
		media::Entity::find_for_user(&user)
			.filter(media::Column::SeriesId.eq(series.id.clone()))
			.order_by_asc(media::Column::Name)
			.into_model::<media::MediaThumbSelect>()
			.one(ctx.conn.as_ref())
			.await?
	} else {
		None
	};

	let image_format = library_config.and_then(|o| o.thumbnail_config.map(|c| c.format));

	let (content_type, bytes) = get_library_thumbnail(
		&library,
		first_series,
		first_book,
		image_format,
		ctx.config.as_ref(),
	)
	.await?;

	Ok(ImageResponse::new(content_type, bytes))
}

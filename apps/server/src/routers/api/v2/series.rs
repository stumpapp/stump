use axum::{
	extract::{Path, State},
	middleware,
	routing::get,
	Extension, Router,
};
use graphql::data::AuthContext;
use models::{
	entity::{library_config, media, series},
	shared::image_processor_options::SupportedImageFormat,
};
use sea_orm::{prelude::*, sea_query::Query, QueryOrder};
use stump_core::{
	config::StumpConfig,
	filesystem::{get_thumbnail, ContentType},
};

use crate::{
	config::state::AppState,
	errors::{APIError, APIResult},
	middleware::auth::auth_middleware,
	utils::http::ImageResponse,
};

use super::media::get_media_thumbnail;

pub(crate) fn mount(app_state: AppState) -> Router<AppState> {
	Router::new()
		.nest(
			"/series/{id}",
			Router::new().route("/thumbnail", get(get_series_thumbnail_handler)),
		)
		.layer(middleware::from_fn_with_state(app_state, auth_middleware))
}

pub(crate) async fn get_series_thumbnail(
	id: &str,
	first_book: Option<media::MediaThumbSelect>,
	image_format: Option<SupportedImageFormat>,
	config: &StumpConfig,
) -> APIResult<(ContentType, Vec<u8>)> {
	let generated_thumb =
		get_thumbnail(config.get_thumbnails_dir(), id, image_format).await?;

	match (generated_thumb, first_book) {
		(Some(result), _) => Ok(result),
		(None, Some(book)) => {
			get_media_thumbnail(&book.id, &book.path, image_format, config).await
		},
		(None, None) => Err(APIError::NotFound(
			"Series does not have a thumbnail".to_string(),
		)),
	}
}

async fn get_series_thumbnail_handler(
	Path(id): Path<String>,
	State(ctx): State<AppState>,
	Extension(req): Extension<AuthContext>,
) -> APIResult<ImageResponse> {
	let user = req.user();
	let series = series::Entity::find_for_user(&user)
		.filter(series::Column::Id.eq(id.clone()))
		.into_model::<series::SeriesIdentSelect>()
		.one(ctx.conn.as_ref())
		.await?
		.ok_or(APIError::NotFound("Book not found".to_string()))?;
	let first_book = media::Entity::find_for_user(&user)
		.filter(media::Column::SeriesId.eq(series.id.clone()))
		.order_by_asc(media::Column::Name)
		.into_model::<media::MediaThumbSelect>()
		.one(ctx.conn.as_ref())
		.await?;
	let library_config = library_config::Entity::find()
		.filter(
			library_config::Column::LibraryId.in_subquery(
				Query::select()
					.column(series::Column::LibraryId)
					.from(series::Entity)
					.and_where(series::Column::Id.eq(series.id.clone()))
					.to_owned(),
			),
		)
		.one(ctx.conn.as_ref())
		.await?;
	let image_format = library_config.and_then(|o| o.thumbnail_config.map(|c| c.format));

	let (content_type, bytes) =
		get_series_thumbnail(id.as_str(), first_book, image_format, ctx.config.as_ref())
			.await?;
	Ok(ImageResponse::new(content_type, bytes))
}

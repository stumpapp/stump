use prisma_client_rust::Direction;
use rocket::serde::json::Json;
use rocket_okapi::openapi;

use crate::{
	fs,
	guards::auth::Auth,
	prisma::{media, read_progress, series},
	types::{
		alias::{ApiResult, Context},
		errors::ApiError,
		http::ImageResponse,
		models::{media::Media, series::Series},
		pageable::{Pageable, PagedRequestParams},
	},
};

#[openapi(tag = "Series")]
#[get("/series?<unpaged>&<page_params..>")]
pub async fn get_series(
	unpaged: Option<bool>,
	page_params: Option<PagedRequestParams>,
	ctx: &Context,
	auth: Auth,
) -> ApiResult<Json<Pageable<Vec<Series>>>> {
	let db = ctx.get_db();

	let series = db
		.series()
		.find_many(vec![])
		.with(
			series::media::fetch(vec![])
				.with(media::read_progresses::fetch(vec![
					read_progress::user_id::equals(auth.0.id),
				]))
				.order_by(media::name::order(Direction::Asc)),
		)
		.exec()
		.await?
		.into_iter()
		.map(|s| s.into())
		.collect::<Vec<Series>>();

	let unpaged = match unpaged {
		Some(val) => val,
		None => page_params.is_none(),
	};

	if unpaged {
		return Ok(Json(series.into()));
	}

	Ok(Json((series, page_params).into()))
}

#[openapi(tag = "Series")]
#[get("/series/<id>")]
pub async fn get_series_by_id(
	id: String,
	ctx: &Context,
	auth: Auth,
) -> ApiResult<Json<Series>> {
	let db = ctx.get_db();

	let series = db
		.series()
		.find_unique(series::id::equals(id.clone()))
		.with(
			series::media::fetch(vec![])
				.with(media::read_progresses::fetch(vec![
					read_progress::user_id::equals(auth.0.id),
				]))
				.order_by(media::name::order(Direction::Asc)),
		)
		.exec()
		.await?;

	if series.is_none() {
		return Err(ApiError::NotFound(format!(
			"Series with id {} not found",
			id
		)));
	}

	Ok(Json(series.unwrap().into()))
}

/// Returns the thumbnail image for a series
#[openapi(tag = "Series")]
#[get("/series/<id>/thumbnail")]
pub async fn get_series_thumbnail(
	id: String,
	ctx: &Context,
	_auth: Auth,
) -> ApiResult<ImageResponse> {
	let db = ctx.get_db();

	let media = db
		.media()
		.find_first(vec![media::series_id::equals(Some(id.clone()))])
		.order_by(media::name::order(Direction::Asc))
		.exec()
		.await?;

	if media.is_none() {
		return Err(ApiError::NotFound(format!(
			"Series with id {} not found",
			id
		)));
	}

	let media = media.unwrap();

	Ok(fs::media_file::get_page(media.path.as_str(), 1)?)
}

/// Returns the media in a given series.
#[openapi(tag = "Series")]
#[get("/series/<id>/media?<unpaged>&<page_params..>")]
pub async fn get_series_media(
	id: String,
	unpaged: Option<bool>,
	page_params: Option<PagedRequestParams>,
	ctx: &Context,
	auth: Auth,
) -> ApiResult<Json<Pageable<Vec<Media>>>> {
	let db = ctx.get_db();

	let media = db
		.media()
		.find_many(vec![media::series_id::equals(Some(id))])
		.with(media::read_progresses::fetch(vec![
			read_progress::user_id::equals(auth.0.id),
		]))
		.order_by(media::name::order(Direction::Asc))
		.exec()
		.await?
		.into_iter()
		.map(|m| m.into())
		.collect::<Vec<Media>>();

	let unpaged = match unpaged {
		Some(val) => val,
		None => page_params.is_none(),
	};

	if unpaged {
		return Ok(Json(media.into()));
	}

	Ok(Json((media, page_params).into()))
}

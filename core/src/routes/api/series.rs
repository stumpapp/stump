use prisma_client_rust::{raw, Direction, PrismaValue};
use rocket::serde::json::Json;
use rocket_okapi::openapi;

use crate::{
	db::migration::CountQueryReturn,
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
#[get("/series?<load_media>&<unpaged>&<page_params..>")]
pub async fn get_series(
	load_media: Option<bool>,
	unpaged: Option<bool>,
	page_params: Option<PagedRequestParams>,
	ctx: &Context,
	auth: Auth,
) -> ApiResult<Json<Pageable<Vec<Series>>>> {
	let db = ctx.get_db();

	let load_media = load_media.unwrap_or(false);

	let action = db.series();
	let action = action.find_many(vec![]);

	let query = match load_media {
		true => action.with(
			series::media::fetch(vec![])
				.with(media::read_progresses::fetch(vec![
					read_progress::user_id::equals(auth.0.id),
				]))
				.order_by(media::name::order(Direction::Asc)),
		),
		false => action,
	};

	let series = query
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
#[get("/series/<id>?<load_media>")]
pub async fn get_series_by_id(
	id: String,
	load_media: Option<bool>,
	ctx: &Context,
	auth: Auth,
) -> ApiResult<Json<Series>> {
	let db = ctx.get_db();

	let load_media = load_media.unwrap_or(false);

	let action = db.series().find_unique(series::id::equals(id.clone()));

	let query = match load_media {
		true => action.with(
			series::media::fetch(vec![])
				.with(media::read_progresses::fetch(vec![
					read_progress::user_id::equals(auth.0.id),
				]))
				.order_by(media::name::order(Direction::Asc)),
		),
		false => action,
	};

	let series = query.exec().await?;

	if series.is_none() {
		return Err(ApiError::NotFound(format!(
			"Series with id {} not found",
			id
		)));
	}

	if !load_media {
		let count_res: Vec<CountQueryReturn> = db
			._query_raw(raw!(
				"SELECT COUNT(*) as count FROM media WHERE seriesId={}",
				PrismaValue::String(id.clone())
			))
			.await?;

		// TODO: dangerous cast
		let media_count = match count_res.get(0) {
			Some(val) => val.count,
			None => 0,
		} as i32;

		return Ok(Json((series.unwrap(), media_count).into()));
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

// TODO: I might just have this endpoint return a string (id) of the media
// instead. I could try and write a raw SQL query that would probably perform
// better than this manual sorting.
#[openapi(tag = "Series")]
#[get("/series/<id>/next")]
pub async fn series_next_media(
	id: String,
	ctx: &Context,
	auth: Auth,
) -> ApiResult<Json<Option<Media>>> {
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
			"Series with id {} no found.",
			id
		)));
	}

	let series = series.unwrap();

	let media = series.media();

	if media.is_err() {
		return Ok(Json(None));
	}

	let media = media
		.unwrap()
		.into_iter()
		.map(|m| m.to_owned().into())
		.filter(|m: &Media| {
			if let Some(progresses) = &m.read_progresses {
				let progress = progresses.get(0).unwrap();

				return progress.page < m.pages && progress.page > 0;
			}

			false
		})
		.collect::<Vec<Media>>();

	if media.len() == 0 {
		return Ok(Json(None));
	}

	// TODO: test that this is really what I want. I am on a plane and don't
	// have the mental capacity to think of this now lol but if I sort initially
	// by name in the query and then filter out media that either has no progress
	// or has 'completed' progress, then the 'next' book should be the first in that
	// list
	Ok(Json(media.get(0).map(|n| n.to_owned())))
}

// pub async fn download_series()

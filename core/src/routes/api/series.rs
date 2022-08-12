use prisma_client_rust::{raw, Direction, PrismaValue};
use rocket::serde::json::Json;
use rocket_okapi::openapi;

use crate::{
	db::migration::CountQueryReturn,
	fs,
	guards::auth::Auth,
	prisma::{media, read_progress, series},
	types::{
		alias::{ApiResult, Ctx},
		errors::ApiError,
		http::ImageResponse,
		models::{media::Media, series::Series},
		pageable::{Pageable, PagedRequestParams},
	},
};

/// Get all series accessible by user. This is a paginated respone, and
/// accepts various paginated request params.
#[openapi(tag = "Series")]
#[get("/series?<load_media>&<unpaged>&<page_params..>")]
pub async fn get_series(
	load_media: Option<bool>,
	unpaged: Option<bool>,
	page_params: Option<PagedRequestParams>,
	ctx: &Ctx,
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

	let unpaged = unpaged.unwrap_or(page_params.is_none());

	if unpaged {
		return Ok(Json(series.into()));
	}

	Ok(Json((series, page_params).into()))
}

/// Get a series by ID. Optional query param `load_media` that will load the media
/// relation (i.e. the media entities will be loaded and sent with the response)
#[openapi(tag = "Series")]
#[get("/series/<id>?<load_media>")]
pub async fn get_series_by_id(
	id: String,
	load_media: Option<bool>,
	ctx: &Ctx,
	auth: Auth,
) -> ApiResult<Json<Series>> {
	let db = ctx.get_db();

	let load_media = load_media.unwrap_or(false);

	let mut query = db.series().find_unique(series::id::equals(id.clone()));

	if load_media {
		query = query.with(
			series::media::fetch(vec![])
				.with(media::read_progresses::fetch(vec![
					read_progress::user_id::equals(auth.0.id),
				]))
				.order_by(media::name::order(Direction::Asc)),
		);
	}

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

		let media_count = count_res.get(0).map(|res| res.count).unwrap_or(0);

		// TODO: dangerous cast
		return Ok(Json((series.unwrap(), media_count as i32).into()));
	}

	Ok(Json(series.unwrap().into()))
}

/// Returns the thumbnail image for a series
#[openapi(tag = "Series")]
#[get("/series/<id>/thumbnail")]
pub async fn get_series_thumbnail(
	id: String,
	ctx: &Ctx,
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

/// Returns the media in a given series. This is a paginated respone, and
/// accepts various paginated request params.
#[openapi(tag = "Series")]
#[get("/series/<id>/media?<unpaged>&<page_params..>")]
pub async fn get_series_media(
	id: String,
	unpaged: Option<bool>,
	page_params: Option<PagedRequestParams>,
	ctx: &Ctx,
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

	let unpaged = unpaged.unwrap_or(page_params.is_none());

	if unpaged {
		return Ok(Json(media.into()));
	}

	Ok(Json((media, page_params).into()))
}

// TODO: Should I support epub here too?? Not sure, I have separate routes for epub,
// but until I actually implement progress tracking for epub I think think I can really
// give a hard answer on what is best...
/// Get the next media in a series, based on the read progress for the requesting user.
/// Stump will return the first book in the series without progress, or return the first
/// with partial progress. E.g. if a user has read pages 32/32 of book 3, then book 4 is
/// next. If a user has read pages 31/32 of book 4, then book 4 is still next.
#[openapi(tag = "Series")]
#[get("/series/<id>/media/next")]
pub async fn series_next_media(
	id: String,
	ctx: &Ctx,
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

	let media = media.unwrap();

	Ok(Json(
		media
			.into_iter()
			.find(|m| {
				// I don't really know that this is valid... When I load in the
				// relation, this will NEVER be None. It will default to an empty
				// vector. But, for safety I guess I will leave this for now.
				if m.read_progresses.is_none() {
					return true;
				}

				let progresses = m.read_progresses.as_ref().unwrap();

				// No progress means it is up next (for this user)!
				if progresses.len() == 0 {
					return true;
				} else {
					// Note: this should never really exceed len == 1, but :shrug:
					let progress = progresses.get(0).unwrap();

					return progress.page < m.pages && progress.page > 0;
				}
			})
			.or(media.get(0))
			.map(|data| data.to_owned().into()),
	))
}

// pub async fn download_series()

use axum::{
	extract::{Path, State},
	middleware::from_extractor,
	routing::get,
	Json, Router,
};
use axum_extra::extract::Query;
use axum_sessions::extractors::ReadableSession;
use prisma_client_rust::Direction;
use stump_core::{
	db::{
		models::{Media, Series},
		utils::PrismaCountTrait,
		Dao, SeriesDao, SeriesDaoImpl,
	},
	fs::{image, media_file},
	prelude::{ContentType, Pageable, PagedRequestParams, QueryOrder},
	prisma::{
		media::{self, OrderByParam as MediaOrderByParam},
		read_progress, series,
	},
};
use tracing::trace;

use crate::{
	config::state::AppState,
	errors::{ApiError, ApiResult},
	middleware::auth::Auth,
	utils::{
		get_session_user,
		http::{ImageResponse, PageableTrait},
		FilterableQuery, SeriesFilter, SeriesRelation,
	},
};

pub(crate) fn mount() -> Router<AppState> {
	Router::new()
		.route("/series", get(get_series))
		.route("/series/recently-added", get(get_recently_added_series))
		.nest(
			"/series/:id",
			Router::new()
				.route("/", get(get_series_by_id))
				.route("/media", get(get_series_media))
				.route("/media/next", get(get_next_in_series))
				.route("/thumbnail", get(get_series_thumbnail)),
		)
		.layer(from_extractor::<Auth>())
}

/// Get all series accessible by user. This is a paginated respone, and
/// accepts various paginated request params.
async fn get_series(
	query: Query<FilterableQuery<SeriesFilter>>,
	State(ctx): State<AppState>,
	session: ReadableSession,
) -> ApiResult<Json<Pageable<Vec<Series>>>> {
	let FilterableQuery {
		filters,
		ordering,
		pagination,
	} = query.0.get();

	let db = ctx.get_db();
	let user_id = get_session_user(&session)?.id;
	let load_media = filters.load_relation.load_media.unwrap_or(false);
	let order_by = ordering.try_into()?;

	let action = db.series();
	let action = action.find_many(vec![]);
	let query = if load_media {
		action.with(
			series::media::fetch(vec![])
				.with(media::read_progresses::fetch(vec![
					read_progress::user_id::equals(user_id),
				]))
				.order_by(order_by),
		)
	} else {
		action
	};

	let series = query
		.exec()
		.await?
		.into_iter()
		.map(|s| s.into())
		.collect::<Vec<Series>>();

	if pagination.page.is_none() {
		return Ok(Json(series.into()));
	}

	Ok(Json((series, pagination.page_params()).into()))
}

/// Get a series by ID. Optional query param `load_media` that will load the media
/// relation (i.e. the media entities will be loaded and sent with the response)
async fn get_series_by_id(
	query: Query<SeriesRelation>,
	Path(id): Path<String>,
	State(ctx): State<AppState>,
	session: ReadableSession,
) -> ApiResult<Json<Series>> {
	let db = ctx.get_db();
	let user_id = get_session_user(&session)?.id;

	let load_media = query.load_media.unwrap_or(false);
	let mut query = db.series().find_unique(series::id::equals(id.clone()));

	if load_media {
		query = query.with(
			series::media::fetch(vec![])
				.with(media::read_progresses::fetch(vec![
					read_progress::user_id::equals(user_id),
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
		// FIXME: PCR doesn't support relation counts yet!
		// let media_count = db
		// 	.media()
		// 	.count(vec![media::series_id::equals(Some(id.clone()))])
		// 	.exec()
		// 	.await?;
		let series_media_count = db.media_in_series_count(id).await?;

		return Ok(Json((series.unwrap(), series_media_count).into()));
	}

	Ok(Json(series.unwrap().into()))
}

async fn get_recently_added_series(
	State(ctx): State<AppState>,
	pagination: Query<PagedRequestParams>,
	session: ReadableSession,
) -> ApiResult<Json<Pageable<Vec<Series>>>> {
	if pagination.page.is_none() {
		return Err(ApiError::BadRequest(
			"Unpaged request not supported for this endpoint".to_string(),
		));
	}

	let viewer_id = get_session_user(&session)?.id;
	let page_params = pagination.0.page_params();
	let series_dao = SeriesDaoImpl::new(ctx.db.clone());

	let recently_added_series = series_dao
		.get_recently_added_series_page(&viewer_id, page_params)
		.await?;

	Ok(Json(recently_added_series))
}

/// Returns the thumbnail image for a series
// #[get("/series/<id>/thumbnail")]
async fn get_series_thumbnail(
	Path(id): Path<String>,
	State(ctx): State<AppState>,
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

	if let Some(webp_path) = image::get_thumbnail_path(&media.id) {
		trace!("Found webp thumbnail for series {}", &id);
		return Ok((ContentType::WEBP, image::get_bytes(webp_path)?).into());
	}

	Ok(media_file::get_page(media.path.as_str(), 1)?.into())
}

/// Returns the media in a given series. This is a paginated respone, and
/// accepts various paginated request params.
// #[get("/series/<id>/media?<unpaged>&<req_params..>")]
async fn get_series_media(
	pagination: Query<PagedRequestParams>,
	ordering: Query<Option<QueryOrder>>,
	session: ReadableSession,
	Path(id): Path<String>,
	State(ctx): State<AppState>,
) -> ApiResult<Json<Pageable<Vec<Media>>>> {
	let db = ctx.get_db();
	let user_id = get_session_user(&session)?.id;

	let unpaged = pagination.page.is_none();
	let page_params = pagination.0.page_params();
	let order_by_param: MediaOrderByParam = ordering.0.unwrap_or_default().try_into()?;

	let mut query = db
		.media()
		.find_many(vec![media::series_id::equals(Some(id.clone()))])
		.with(media::read_progresses::fetch(vec![
			read_progress::user_id::equals(user_id),
		]))
		.order_by(order_by_param);

	if !unpaged {
		let (skip, take) = page_params.get_skip_take();
		query = query.skip(skip).take(take);
	}

	let media = query
		.exec()
		.await?
		.into_iter()
		.map(Media::from)
		.collect::<Vec<Media>>();

	if unpaged {
		return Ok(Json(Pageable::from(media)));
	}

	// TODO: investigate this, I am getting incorrect counts here...
	// FIXME: AHAHAHAHAHAHA, PCR doesn't support relation counts! I legit thought I was
	// going OUTSIDE my fuckin mind
	// FIXME: PCR doesn't support relation counts yet!
	// let series_media_count = db
	// 	.media()
	// 	.count(vec![media::series_id::equals(Some(id))])
	// 	.exec()
	// 	.await?;
	let series_media_count = db.media_in_series_count(id).await?;

	Ok(Json((media, series_media_count, page_params).into()))
}

// TODO: Should I support ehere too?? Not sure, I have separate routes for epub,
// but until I actually implement progress tracking for eI think think I can really
// give a hard answer on what is best...
/// Get the next media in a series, based on the read progress for the requesting user.
/// Stump will return the first book in the series without progress, or return the first
/// with partial progress. E.g. if a user has read pages 32/32 of book 3, then book 4 is
/// next. If a user has read pages 31/32 of book 4, then book 4 is still next.
// #[get("/series/<id>/media/next")]
async fn get_next_in_series(
	Path(id): Path<String>,
	State(ctx): State<AppState>,
	session: ReadableSession,
) -> ApiResult<Json<Option<Media>>> {
	let db = ctx.get_db();
	let user_id = get_session_user(&session)?.id;

	let series = db
		.series()
		.find_unique(series::id::equals(id.clone()))
		.with(
			series::media::fetch(vec![])
				.with(media::read_progresses::fetch(vec![
					read_progress::user_id::equals(user_id),
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
			.iter()
			.find(|m| {
				// I don't really know that this is valid... When I load in the
				// relation, this will NEVER be None. It will default to an empty
				// vector. But, for safety I guess I will leave this for now.
				if m.read_progresses.is_none() {
					return true;
				}

				let progresses = m.read_progresses.as_ref().unwrap();

				// No progress means it is up next (for this user)!
				if progresses.is_empty() {
					true
				} else {
					// Note: this should never really exceed len == 1, but :shrug:
					let progress = progresses.get(0).unwrap();

					progress.page < m.pages && progress.page > 0
				}
			})
			.or_else(|| media.get(0))
			.map(|data| data.to_owned().into()),
	))
}

// async fn download_series()

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
	prelude::{
		ContentType, PageQuery, Pageable, Pagination, PaginationQuery, QueryOrder,
	},
	prisma::{
		media::{self, OrderByParam as MediaOrderByParam},
		read_progress,
		series::{self, WhereParam},
	},
};
use tracing::trace;

use crate::{
	config::state::AppState,
	errors::{ApiError, ApiResult},
	middleware::auth::Auth,
	utils::{
		get_session_user, http::ImageResponse, FilterableQuery, SeriesFilter,
		SeriesRelation,
	},
};

use super::library::apply_library_filters;

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

pub(crate) fn apply_series_filters(filters: SeriesFilter) -> Vec<WhereParam> {
	let mut _where: Vec<WhereParam> = vec![];

	if !filters.id.is_empty() {
		_where.push(series::id::in_vec(filters.id))
	}
	if !filters.name.is_empty() {
		_where.push(series::name::in_vec(filters.name));
	}

	if let Some(library_filters) = filters.library {
		_where.push(series::library::is(apply_library_filters(library_filters)));
	}

	_where
}

/// Get all series accessible by user. This is a paginated respone, and
/// accepts various paginated request params.
async fn get_series(
	filter_query: Query<FilterableQuery<SeriesFilter>>,
	pagination_query: Query<PaginationQuery>,
	relation_query: Query<SeriesRelation>,
	State(ctx): State<AppState>,
	session: ReadableSession,
) -> ApiResult<Json<Pageable<Vec<Series>>>> {
	let FilterableQuery { ordering, filters } = filter_query.0.get();
	let pagination = pagination_query.0.get();

	let db = ctx.get_db();
	let user_id = get_session_user(&session)?.id;

	let is_unpaged = pagination.is_unpaged();
	let load_media = relation_query.load_media.unwrap_or(false);
	let order_by = ordering.try_into()?;

	let where_conditions = apply_series_filters(filters);
	let action = db.series();
	let action = action.find_many(where_conditions.clone());
	let mut query = if load_media {
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

	if !is_unpaged {
		match pagination.clone() {
			Pagination::Page(page_query) => {
				let (skip, take) = page_query.get_skip_take();
				query = query.skip(skip).take(take);
			},
			Pagination::Cursor(cursor_query) => {
				if let Some(cursor) = cursor_query.cursor {
					query = query.cursor(series::id::equals(cursor)).skip(1)
				}
				if let Some(limit) = cursor_query.limit {
					query = query.take(limit)
				}
			},
			_ => unreachable!(),
		}
	}

	let series = query
		.exec()
		.await?
		.into_iter()
		.map(|s| s.into())
		.collect::<Vec<Series>>();

	if is_unpaged {
		return Ok(Json(series.into()));
	}

	let series_count = db.series().count(where_conditions).exec().await?;

	Ok(Json((series, series_count, pagination).into()))
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
	pagination: Query<PageQuery>,
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
async fn get_series_media(
	pagination_query: Query<PaginationQuery>,
	ordering: Query<QueryOrder>,
	session: ReadableSession,
	Path(id): Path<String>,
	State(ctx): State<AppState>,
) -> ApiResult<Json<Pageable<Vec<Media>>>> {
	let db = ctx.get_db();
	let user_id = get_session_user(&session)?.id;

	let pagination = pagination_query.0.get();
	let is_unpaged = pagination.is_unpaged();
	let order_by_param: MediaOrderByParam = ordering.0.try_into()?;

	let pagination_cloned = pagination.clone();
	let (media, count) = db
		._transaction()
		.run(|client| async move {
			let mut query = client
				.media()
				.find_many(vec![media::series_id::equals(Some(id.clone()))])
				.with(media::read_progresses::fetch(vec![
					read_progress::user_id::equals(user_id),
				]))
				.order_by(order_by_param);

			if !is_unpaged {
				match pagination_cloned {
					Pagination::Page(page_query) => {
						let (skip, take) = page_query.get_skip_take();
						query = query.skip(skip).take(take);
					},
					Pagination::Cursor(cursor_query) => {
						if let Some(cursor) = cursor_query.cursor {
							query = query.cursor(media::id::equals(cursor)).skip(1)
						}
						if let Some(limit) = cursor_query.limit {
							query = query.take(limit)
						}
					},
					_ => unreachable!(),
				}
			}

			let media = query
				.exec()
				.await?
				.into_iter()
				.map(|m| m.into())
				.collect::<Vec<Media>>();

			if is_unpaged {
				return Ok((media, None));
			}

			// FIXME: PCR doesn't support relation counts yet!
			// client
			// 	.media()
			// 	.count(where_conditions)
			// 	.exec()
			// 	.await
			// 	.map(|count| (media, Some(count)))
			client
				.media_in_series_count(id)
				.await
				.map(|count| (media, Some(count)))
		})
		.await?;

	if let Some(count) = count {
		return Ok(Json(Pageable::from((media, count, pagination))));
	}

	Ok(Json(Pageable::from(media)))
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

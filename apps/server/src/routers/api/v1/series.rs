use axum::{
	extract::{Path, State},
	middleware::from_extractor_with_state,
	routing::get,
	Json, Router,
};
use axum_extra::extract::Query;
use axum_sessions::extractors::ReadableSession;
use prisma_client_rust::{or, Direction};
use serde_qs::axum::QsQuery;
use stump_core::{
	db::{
		entity::{Media, Series},
		query::{
			ordering::QueryOrder,
			pagination::{PageQuery, Pageable, Pagination, PaginationQuery},
		},
		PrismaCountTrait, SeriesDAO, DAO,
	},
	prisma::{
		media::{self, OrderByParam as MediaOrderByParam},
		media_metadata, read_progress,
		series::{self, OrderByParam, WhereParam},
		series_metadata,
	},
};
use tracing::{error, trace};

use crate::{
	config::state::AppState,
	errors::{ApiError, ApiResult},
	middleware::auth::Auth,
	utils::{
		chain_optional_iter, decode_path_filter, get_session_user, http::ImageResponse,
		FilterableQuery, SeriesBaseFilter, SeriesFilter, SeriesQueryRelation,
		SeriesRelationFilter,
	},
};

use super::{
	library::apply_library_base_filters,
	media::{apply_media_age_restriction, apply_media_base_filters},
	metadata::apply_series_metadata_filters,
};

pub(crate) fn mount(app_state: AppState) -> Router<AppState> {
	Router::new()
		.route("/series", get(get_series))
		.route(
			"/series/recently-added",
			get(get_recently_added_series_handler),
		)
		.nest(
			"/series/:id",
			Router::new()
				.route("/", get(get_series_by_id))
				.route("/media", get(get_series_media))
				.route("/media/next", get(get_next_in_series))
				.route("/thumbnail", get(get_series_thumbnail)),
		)
		.layer(from_extractor_with_state::<Auth, AppState>(app_state))
}

pub(crate) fn apply_series_base_filters(filters: SeriesBaseFilter) -> Vec<WhereParam> {
	chain_optional_iter(
		[],
		[
			(!filters.id.is_empty()).then(|| series::id::in_vec(filters.id)),
			(!filters.name.is_empty()).then(|| series::name::in_vec(filters.name)),
			(!filters.path.is_empty()).then(|| {
				let decoded_paths = decode_path_filter(filters.path);
				series::path::in_vec(decoded_paths)
			}),
			filters.search.map(|s| {
				or![
					series::name::contains(s.clone()),
					series::description::contains(s.clone()),
					series::metadata::is(vec![or![
						series_metadata::title::contains(s.clone()),
						series_metadata::summary::contains(s),
					]])
				]
			}),
			filters
				.metadata
				.map(apply_series_metadata_filters)
				.map(series::metadata::is),
		],
	)
}

pub(crate) fn apply_series_relation_filters(
	filters: SeriesRelationFilter,
) -> Vec<WhereParam> {
	chain_optional_iter(
		[],
		[
			filters
				.library
				.map(apply_library_base_filters)
				.map(series::library::is),
			filters
				.media
				.map(apply_media_base_filters)
				.map(series::media::some),
		],
	)
}

pub(crate) fn apply_series_filters(filters: SeriesFilter) -> Vec<WhereParam> {
	apply_series_base_filters(filters.base_filter)
		.into_iter()
		.chain(apply_series_relation_filters(filters.relation_filter))
		.collect()
}

// TODO: this is wrong
pub(crate) fn apply_series_age_restriction(
	min_age: i32,
	restrict_on_unset: bool,
) -> WhereParam {
	let direct_restriction = series::metadata::is(if restrict_on_unset {
		vec![
			series_metadata::age_rating::not(None),
			series_metadata::age_rating::lte(min_age),
		]
	} else {
		vec![or![
			series_metadata::age_rating::equals(None),
			series_metadata::age_rating::lte(min_age)
		]]
	});

	let media_restriction =
		series::media::some(vec![media::metadata::is(if restrict_on_unset {
			vec![
				media_metadata::age_rating::not(None),
				media_metadata::age_rating::lte(min_age),
			]
		} else {
			vec![or![
				media_metadata::age_rating::equals(None),
				media_metadata::age_rating::lte(min_age)
			]]
		})]);

	or![direct_restriction, media_restriction]
}

// TODO: use age restrictions!

#[utoipa::path(
	get,
	path = "/api/v1/series",
	tag = "series",
	params(
		("filter_query" = Option<FilterableSeriesQuery>, Query, description = "The filter options"),
		("pagination_query" = Option<PaginationQuery>, Query, description = "The pagination options"),
		("relation_query" = Option<SeriesQueryRelation>, Query, description = "The relations to include"),
	),
	responses(
		(status = 200, description = "Successfully fetched series.", body = PageableSeries),
		(status = 401, description = "Unauthorized."),
		(status = 500, description = "Internal server error."),
	)
)]
/// Get all series accessible by user.
async fn get_series(
	filter_query: QsQuery<FilterableQuery<SeriesFilter>>,
	pagination_query: Query<PaginationQuery>,
	relation_query: Query<SeriesQueryRelation>,
	State(ctx): State<AppState>,
	session: ReadableSession,
) -> ApiResult<Json<Pageable<Vec<Series>>>> {
	let FilterableQuery { ordering, filters } = filter_query.0.get();
	let pagination = pagination_query.0.get();
	let pagination_cloned = pagination.clone();

	trace!(?filters, ?ordering, ?pagination, "get_series");

	let db = ctx.get_db();
	let user = get_session_user(&session)?;
	let user_id = user.id;
	let age_restrictions = user
		.age_restriction
		.as_ref()
		.map(|ar| apply_series_age_restriction(ar.age, ar.restrict_on_unset));

	let is_unpaged = pagination.is_unpaged();
	let order_by: OrderByParam = ordering.try_into()?;

	let load_media = relation_query.load_media.unwrap_or(false);
	let count_media = relation_query.count_media.unwrap_or(false);

	let where_conditions = apply_series_filters(filters)
		.into_iter()
		.chain(age_restrictions.map(|ar| vec![ar]).unwrap_or_else(Vec::new))
		.collect::<Vec<WhereParam>>();

	// series, total series count
	let (series, series_count) = db
		._transaction()
		.run(|client| async move {
			let mut query = db.series().find_many(where_conditions.clone());
			if load_media {
				query = query.with(series::media::fetch(vec![]).with(
					media::read_progresses::fetch(vec![read_progress::user_id::equals(
						user_id,
					)]),
				));
			}

			if !is_unpaged {
				match pagination_cloned {
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

			let series = query.order_by(order_by).exec().await?;
			// If we don't load the media relations, then the media_count field of Series
			// will not be automatically populated. So, if the request has the count_media
			// flag set, an additional query is needed to get the media counts.
			let series: Vec<Series> = if count_media && !load_media {
				let series_ids = series.iter().map(|s| s.id.clone()).collect::<Vec<_>>();
				let media_counts = client.series_media_count(series_ids).await?;
				series
					.into_iter()
					.map(|s| {
						let series_media_count = media_counts.get(&s.id).copied();
						if let Some(count) = series_media_count {
							Series::from((s, count))
						} else {
							Series::from(s)
						}
					})
					.collect()
			} else {
				series.into_iter().map(Series::from).collect()
			};

			if is_unpaged {
				return Ok((series, None));
			}

			client
				.series()
				.count(where_conditions.clone())
				.exec()
				.await
				.map(|count| (series, Some(count)))
		})
		.await?;

	if let Some(count) = series_count {
		return Ok(Json(Pageable::from((series, count, pagination))));
	}

	Ok(Json(Pageable::from(series)))
}

#[utoipa::path(
	get,
	path = "/api/v1/series/:id",
	tag = "series",
	params(
		("id" = String, Path, description = "The ID of the series to fetch"),
		("relation_query" = Option<SeriesQueryRelation>, Query, description = "The relations to include"),
	),
	responses(
		(status = 200, description = "Successfully fetched series.", body = Series),
		(status = 401, description = "Unauthorized."),
		(status = 404, description = "Series not found."),
		(status = 500, description = "Internal server error."),
	)
)]
/// Get a series by ID. Optional query param `load_media` that will load the media
/// relation (i.e. the media entities will be loaded and sent with the response)
async fn get_series_by_id(
	query: Query<SeriesQueryRelation>,
	Path(id): Path<String>,
	State(ctx): State<AppState>,
	session: ReadableSession,
) -> ApiResult<Json<Series>> {
	let db = ctx.get_db();

	let user = get_session_user(&session)?;
	let user_id = user.id;
	let age_restrictions = user
		.age_restriction
		.as_ref()
		.map(|ar| apply_series_age_restriction(ar.age, ar.restrict_on_unset));

	let load_media = query.load_media.unwrap_or(false);
	let mut query = db.series().find_first(chain_optional_iter(
		[series::id::equals(id.clone())],
		[age_restrictions],
	));

	if load_media {
		query = query.with(
			series::media::fetch(vec![])
				.with(media::read_progresses::fetch(vec![
					read_progress::user_id::equals(user_id),
				]))
				.order_by(media::name::order(Direction::Asc)),
		);
	}

	let series = query
		.exec()
		.await?
		.ok_or(ApiError::NotFound(String::from("Series not found")))?;

	if !load_media {
		// FIXME: PCR doesn't support relation counts yet!
		// let media_count = db
		// 	.media()
		// 	.count(vec![media::series_id::equals(Some(id.clone()))])
		// 	.exec()
		// 	.await?;
		let series_media_count = db.media_in_series_count(id).await?;

		return Ok(Json((series, series_media_count).into()));
	}

	Ok(Json(series.into()))
}

// FIXME: This hand written SQL needs to factor in age restrictions!
#[utoipa::path(
	get,
	path = "/api/v1/series/recently-added",
	tag = "series",
	params(
		("pagination" = PageQuery, Query, description = "The pagination params"),
	),
	responses(
		(status = 200, description = "Successfully fetched recently added series.", body = PageableSeries),
		(status = 400, description = "Bad request. Unpaged request not supported for this endpoint."),
		(status = 401, description = "Unauthorized."),
		(status = 500, description = "Internal server error."),
	)
)]
async fn get_recently_added_series_handler(
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
	let series_dao = SeriesDAO::new(ctx.db.clone());

	let recently_added_series = series_dao
		.get_recently_added_series(&viewer_id, page_params)
		.await?;

	Ok(Json(recently_added_series))
}

// TODO: ImageResponse type for body
#[utoipa::path(
	get,
	path = "/api/v1/series/:id/thumbnail",
	tag = "series",
	params(
		("id" = String, Path, description = "The ID of the series to fetch the thumbnail for"),
	),
	responses(
		(status = 200, description = "Successfully fetched series thumbnail."),
		(status = 401, description = "Unauthorized."),
		(status = 404, description = "Series not found."),
		(status = 500, description = "Internal server error."),
	)
)]
/// Returns the thumbnail image for a series
async fn get_series_thumbnail(
	Path(id): Path<String>,
	State(ctx): State<AppState>,
	session: ReadableSession,
) -> ApiResult<ImageResponse> {
	let db = ctx.get_db();

	let user = get_session_user(&session)?;
	let age_restrictions = user
		.age_restriction
		.as_ref()
		.map(|ar| apply_media_age_restriction(ar.age, ar.restrict_on_unset));

	let media = db
		.media()
		.find_first(chain_optional_iter(
			[media::series_id::equals(Some(id.clone()))],
			[age_restrictions],
		))
		.order_by(media::name::order(Direction::Asc))
		.exec()
		.await?
		.ok_or(ApiError::NotFound(String::from("Series not found")))?;

	super::media::get_media_thumbnail(media.id.clone(), db, &session)
		.await
		.map(ImageResponse::from)
}

// FIXME: age restrictions mess up the counts since PCR doesn't support relation counts yet!
// TODO: media filtering...
#[utoipa::path(
	get,
	path = "/api/v1/series/:id/media",
	tag = "series",
	params(
		("id" = String, Path, description = "The ID of the series to fetch the media for"),
		("pagination" = Option<PaginationQuery>, Query, description = "The pagination params"),
		("ordering" = Option<QueryOrder>, Query, description = "The ordering params"),
	),
	responses(
		(status = 200, description = "Successfully fetched series media.", body = PageableMedia),
		(status = 401, description = "Unauthorized."),
		(status = 404, description = "Series not found."),
		(status = 500, description = "Internal server error."),
	)
)]
/// Returns the media in a given series.
async fn get_series_media(
	pagination_query: Query<PaginationQuery>,
	ordering: Query<QueryOrder>,
	session: ReadableSession,
	Path(id): Path<String>,
	State(ctx): State<AppState>,
) -> ApiResult<Json<Pageable<Vec<Media>>>> {
	let db = ctx.get_db();

	let user = get_session_user(&session)?;
	let user_id = user.id;
	let age_restrictions = user.age_restriction.as_ref().map(|ar| {
		(
			apply_series_age_restriction(ar.age, ar.restrict_on_unset),
			apply_media_age_restriction(ar.age, ar.restrict_on_unset),
		)
	});

	let pagination = pagination_query.0.get();
	let pagination_cloned = pagination.clone();
	let is_unpaged = pagination.is_unpaged();

	trace!(?ordering, ?pagination, "get_series_media");

	let order_by_param: MediaOrderByParam = ordering.0.try_into()?;

	db.series()
		.find_first(chain_optional_iter(
			[series::id::equals(id.clone())],
			[age_restrictions.as_ref().map(|(sr, _)| sr.clone())],
		))
		.exec()
		.await?
		.ok_or(ApiError::NotFound(String::from("Series not found")))?;

	let (media, count) = db
		._transaction()
		.run(|client| async move {
			let mut query = client
				.media()
				.find_many(chain_optional_iter(
					[media::series_id::equals(Some(id.clone()))],
					[age_restrictions.as_ref().map(|(_, mr)| mr.clone())],
				))
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

	// trace!(?media, "got media");

	if let Some(count) = count {
		return Ok(Json(Pageable::from((media, count, pagination))));
	}

	Ok(Json(Pageable::from(media)))
}

#[utoipa::path(
	get,
	path = "/api/v1/series/:id/media/next",
	tag = "series",
	params(
		("id" = String, Path, description = "The ID of the series to fetch the up-next media for"),
	),
	responses(
		(status = 200, description = "Successfully fetched media up-next in series", body = Option<Media>),
		(status = 401, description = "Unauthorized."),
		(status = 404, description = "Series not found."),
		(status = 500, description = "Internal server error."),
	)
)]
/// Get the next media in a series, based on the read progress for the requesting user.
/// Stump will return the first book in the series without progress, or return the first
/// with partial progress. E.g. if a user has read pages 32/32 of book 3, then book 4 is
/// next. If a user has read pages 31/32 of book 4, then book 4 is still next.
async fn get_next_in_series(
	Path(id): Path<String>,
	State(ctx): State<AppState>,
	session: ReadableSession,
) -> ApiResult<Json<Option<Media>>> {
	let db = ctx.get_db();
	let user_id = get_session_user(&session)?.id;

	let result = db
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

	if let Some(series) = result {
		let media = series.media().map_err(|e| {
			error!(error = ?e, "Failed to load media for series");
			e
		})?;

		let next_book = media
			.iter()
			.find(|m| {
				if let Some(progress_list) = m.read_progresses.as_ref() {
					// No progress means it is up next (for this user)!
					if progress_list.is_empty() {
						true
					} else {
						// Note: this should never really exceed len == 1, but :shrug:
						progress_list
							.get(0)
							.map(|rp| {
								!rp.is_completed
									|| rp
										.percentage_completed
										.map(|pc| pc <= 1.0)
										.unwrap_or(false) || (rp.page < m.pages && rp.page > 0)
							})
							.unwrap_or(true)
					}
				} else {
					// case unread should be first in queue
					true
				}
			})
			.or_else(|| media.get(0));

		Ok(Json(next_book.map(|data| Media::from(data.to_owned()))))
	} else {
		Err(ApiError::NotFound(format!(
			"Series with id {} no found.",
			id
		)))
	}
}

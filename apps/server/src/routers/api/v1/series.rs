use std::collections::HashSet;

use axum::{
	extract::{DefaultBodyLimit, Multipart, Path, State},
	middleware,
	routing::{get, post},
	Extension, Json, Router,
};
use axum_extra::extract::Query;
use prisma_client_rust::{and, operator, or, Direction};
use serde::{Deserialize, Serialize};
use serde_qs::axum::QsQuery;
use stump_core::{
	config::StumpConfig,
	db::{
		entity::{
			macros::finished_reading_session_series_complete, LibraryOptions, Media,
			Series, User, UserPermission,
		},
		query::{
			ordering::QueryOrder,
			pagination::{PageQuery, Pageable, Pagination, PaginationQuery},
		},
		PrismaCountTrait, SeriesDAO, DAO,
	},
	filesystem::{
		analyze_media_job::AnalyzeMediaJob,
		get_unknown_thumnail,
		image::{
			generate_thumbnail, place_thumbnail, remove_thumbnails, ImageFormat,
			ImageProcessorOptions,
		},
		read_entire_file,
		scanner::SeriesScanJob,
		ContentType, FileParts, PathUtils,
	},
	prisma::{
		active_reading_session, finished_reading_session, library,
		media::{self, OrderByParam as MediaOrderByParam},
		media_metadata,
		series::{self, OrderByParam, WhereParam},
		series_metadata,
	},
};
use tracing::{error, trace};
use utoipa::ToSchema;

use crate::{
	config::state::AppState,
	errors::{APIError, APIResult},
	filter::{
		chain_optional_iter, decode_path_filter, FilterableQuery, SeriesBaseFilter,
		SeriesFilter, SeriesQueryRelation, SeriesRelationFilter,
	},
	middleware::auth::{auth_middleware, RequestContext},
	routers::api::v1::library::library_not_hidden_from_user_filter,
	utils::{http::ImageResponse, validate_image_upload},
};

use super::{
	library::apply_library_base_filters,
	media::{apply_media_age_restriction, apply_media_base_filters, get_media_thumbnail},
	metadata::apply_series_metadata_filters,
};

// TODO: support downloading entire series as a zip file

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
				.route("/scan", post(scan_series))
				.route("/media", get(get_series_media))
				.route("/analyze", post(start_media_analysis))
				.route("/media/next", get(get_next_in_series))
				.route(
					"/thumbnail",
					get(get_series_thumbnail_handler)
						.patch(patch_series_thumbnail)
						.post(replace_series_thumbnail)
						// TODO: configurable max file size
						.layer(DefaultBodyLimit::max(20 * 1024 * 1024)), // 20MB
				)
				.route(
					"/complete",
					get(get_series_is_complete).put(put_series_is_complete),
				),
		)
		.layer(middleware::from_fn_with_state(app_state, auth_middleware))
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

pub(crate) fn apply_series_library_not_hidden_for_user_filter(
	user: &User,
) -> Vec<WhereParam> {
	vec![series::library::is(vec![
		library_not_hidden_from_user_filter(user),
	])]
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

// FIXME: hidden libraries introduced a bug here, need to fix!

// fn apply_series_filters_for_user(filters: SeriesFilter, user: &User) -> Vec<WhereParam> {
// 	apply_series_filters(filters)
// 		.into_iter()
// 		.chain(apply_series_library_not_hidden_for_user_filter(user))
// 		.collect()
// }

pub fn apply_series_restrictions_for_user(user: &User) -> Vec<WhereParam> {
	let age_restrictions = user
		.age_restriction
		.as_ref()
		.map(|ar| apply_series_age_restriction(ar.age, ar.restrict_on_unset));

	chain_optional_iter(
		[series::library::is(vec![
			library_not_hidden_from_user_filter(user),
		])],
		[age_restrictions],
	)
}

pub(crate) fn apply_series_filters_for_user(
	filters: SeriesFilter,
	user: &User,
) -> Vec<WhereParam> {
	let age_restrictions = user
		.age_restriction
		.as_ref()
		.map(|ar| apply_series_age_restriction(ar.age, ar.restrict_on_unset));

	let base_filters = operator::and(
		apply_series_filters(filters)
			.into_iter()
			.chain(age_restrictions.map(|ar| vec![ar]).unwrap_or_default())
			.collect::<Vec<WhereParam>>(),
	);

	// TODO: This is not ideal, I am adding an _additional_ relation filter for
	// the library exclusion, when I need to merge any requested filters with this one,
	// instead. This was a regression from the exclusion feature I need to tackle
	vec![and![
		base_filters,
		series::library::is(vec![library_not_hidden_from_user_filter(user)])
	]]
}

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
	Extension(req): Extension<RequestContext>,
) -> APIResult<Json<Pageable<Vec<Series>>>> {
	let FilterableQuery { ordering, filters } = filter_query.0.get();
	let pagination = pagination_query.0.get();
	let pagination_cloned = pagination.clone();

	trace!(?filters, ?ordering, ?pagination, "get_series");

	let db = &ctx.db;
	let user = req.user();
	let user_id = user.id.clone();

	let is_unpaged = pagination.is_unpaged();
	let order_by: OrderByParam = ordering.try_into()?;

	let load_media = relation_query.load_media.unwrap_or(false);
	let count_media = relation_query.count_media.unwrap_or(false);

	let where_conditions = apply_series_filters_for_user(filters, user);

	// series, total series count
	let (series, series_count) = db
		._transaction()
		.run(|client| async move {
			let mut query = db.series().find_many(where_conditions.clone());
			if load_media {
				query = query.with(
					series::media::fetch(vec![])
						.with(media::active_user_reading_sessions::fetch(vec![
							active_reading_session::user_id::equals(user_id.clone()),
						]))
						.with(media::finished_user_reading_sessions::fetch(vec![
							finished_reading_session::user_id::equals(user_id),
						])),
				);
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
	Extension(req): Extension<RequestContext>,
) -> APIResult<Json<Series>> {
	let db = &ctx.db;

	let user = req.user();
	let user_id = user.id.clone();
	let age_restrictions = user
		.age_restriction
		.as_ref()
		.map(|ar| apply_series_age_restriction(ar.age, ar.restrict_on_unset));
	let where_params = [series::id::equals(id.clone())]
		.into_iter()
		.chain(apply_series_library_not_hidden_for_user_filter(user))
		.chain(age_restrictions.map(|ar| vec![ar]).unwrap_or_default())
		.collect::<Vec<WhereParam>>();

	let load_media = query.load_media.unwrap_or(false);
	let load_library = query.load_library.unwrap_or(false);
	let mut query = db.series().find_first(where_params);

	if load_media {
		query = query.with(
			series::media::fetch(vec![])
				.with(media::active_user_reading_sessions::fetch(vec![
					active_reading_session::user_id::equals(user_id.clone()),
				]))
				.with(media::finished_user_reading_sessions::fetch(vec![
					finished_reading_session::user_id::equals(user_id),
				]))
				.order_by(media::name::order(Direction::Asc)),
		);
	}

	if load_library {
		query = query.with(series::library::fetch());
	}

	let series = query
		.exec()
		.await?
		.ok_or(APIError::NotFound(String::from("Series not found")))?;

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

#[utoipa::path(
	post,
	path = "/api/v1/series/:id/scan",
	tag = "series",
	responses(
		(status = 200, description = "Successfully queued series scan"),
		(status = 401, description = "Unauthorized"),
		(status = 404, description = "Series not found"),
		(status = 500, description = "Internal server error")
	)
)]
/// Queue a job to scan the series by ID
async fn scan_series(
	Path(id): Path<String>,
	State(ctx): State<AppState>,
	Extension(req): Extension<RequestContext>,
) -> Result<(), APIError> {
	let db = &ctx.db;
	req.enforce_permissions(&[UserPermission::ScanLibrary])?;

	let series = db
		.series()
		.find_unique(series::id::equals(id.clone()))
		.exec()
		.await?
		.ok_or(APIError::NotFound("Series not found".to_string()))?;

	ctx.enqueue_job(SeriesScanJob::new(series.id, series.path))
		.map_err(|e| {
			error!(?e, "Failed to enqueue series scan job");
			APIError::InternalServerError("Failed to enqueue series scan job".to_string())
		})?;

	Ok(())
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
	Extension(req): Extension<RequestContext>,
) -> APIResult<Json<Pageable<Vec<Series>>>> {
	if pagination.page.is_none() {
		return Err(APIError::BadRequest(
			"Unpaged request not supported for this endpoint".to_string(),
		));
	}

	let user = req.user();
	let user_id = user.id.clone();
	// let age_restrictions = user
	// 	.age_restriction
	// 	.as_ref()
	// 	.map(|ar| apply_series_age_restriction(ar.age, ar.restrict_on_unset));

	let page_params = pagination.0.page_params();
	let series_dao = SeriesDAO::new(ctx.db.clone());

	let recently_added_series = series_dao
		.get_recently_added_series(&user_id, page_params)
		.await?;

	Ok(Json(recently_added_series))
}

pub(crate) fn get_series_thumbnail(
	series: &series::Data,
	first_book: &media::Data,
	image_format: Option<ImageFormat>,
	config: &StumpConfig,
) -> APIResult<(ContentType, Vec<u8>)> {
	let thumbnails_dir = config.get_thumbnails_dir();
	let series_id = series.id.clone();

	if let Some(format) = image_format.clone() {
		let extension = format.extension();
		let path = thumbnails_dir.join(format!("{}.{}", series_id, extension));

		if path.exists() {
			tracing::trace!(?path, series_id, "Found generated series thumbnail");
			return Ok((ContentType::from(format), read_entire_file(path)?));
		}
	} else if let Some(path) = get_unknown_thumnail(&series_id, thumbnails_dir) {
		tracing::debug!(path = ?path, series_id, "Found series thumbnail that does not align with config");
		let FileParts { extension, .. } = path.file_parts();
		return Ok((
			ContentType::from_extension(extension.as_str()),
			read_entire_file(path)?,
		));
	}

	get_media_thumbnail(first_book, image_format, config)
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
async fn get_series_thumbnail_handler(
	Path(id): Path<String>,
	State(ctx): State<AppState>,
	Extension(req): Extension<RequestContext>,
) -> APIResult<ImageResponse> {
	let db = &ctx.db;

	let user = req.user();
	let age_restriction = user.age_restriction.as_ref();
	let series_age_restriction = age_restriction
		.map(|ar| apply_series_age_restriction(ar.age, ar.restrict_on_unset));
	let where_params = chain_optional_iter(
		[series::id::equals(id.clone())]
			.into_iter()
			.chain(apply_series_library_not_hidden_for_user_filter(user))
			.collect::<Vec<WhereParam>>(),
		[series_age_restriction],
	);

	let series = db
		.series()
		// Find the first series in the library which satisfies the age restriction
		.find_first(where_params)
		.with(
			// Then load the first media in that series which satisfies the age restriction
			series::media::fetch(chain_optional_iter(
				[],
				[age_restriction
					.map(|ar| apply_media_age_restriction(ar.age, ar.restrict_on_unset))],
			))
			.take(1)
			.order_by(media::name::order(Direction::Asc)),
		)
		.with(series::library::fetch().with(library::library_options::fetch()))
		.order_by(series::name::order(Direction::Asc))
		.exec()
		.await?
		.ok_or(APIError::NotFound("Series not found".to_string()))?;

	let library = series
		.library()?
		.ok_or(APIError::NotFound(String::from("Library relation missing")))?;

	let first_book = series
		.media()?
		.first()
		.ok_or(APIError::NotFound(String::from(
			"Series does not have any media",
		)))?;

	let image_format = library
		.library_options()
		.map(LibraryOptions::from)?
		.thumbnail_config
		.map(|config| config.format);

	get_series_thumbnail(&series, first_book, image_format, &ctx.config)
		.map(ImageResponse::from)
}

#[derive(Deserialize, ToSchema, specta::Type)]
pub struct PatchSeriesThumbnail {
	/// The ID of the media inside the series to fetch
	media_id: String,
	/// The page of the media to use for the thumbnail
	page: i32,
	#[specta(optional)]
	/// A flag indicating whether the page is zero based
	is_zero_based: Option<bool>,
}

#[utoipa::path(
    patch,
    path = "/api/v1/series/:id/thumbnail",
    tag = "series",
    params(
        ("id" = String, Path, description = "The ID of the series")
    ),
    responses(
        (status = 200, description = "Successfully updated series thumbnail"),
        (status = 401, description = "Unauthorized"),
        (status = 403, description = "Forbidden"),
        (status = 404, description = "Series not found"),
        (status = 500, description = "Internal server error"),
    )
)]
async fn patch_series_thumbnail(
	Path(id): Path<String>,
	State(ctx): State<AppState>,
	Extension(req): Extension<RequestContext>,
	Json(body): Json<PatchSeriesThumbnail>,
) -> APIResult<ImageResponse> {
	let user = req.user_and_enforce_permissions(&[UserPermission::ManageLibrary])?;
	let series_age_restrictions = user
		.age_restriction
		.as_ref()
		.map(|ar| apply_series_age_restriction(ar.age, ar.restrict_on_unset));
	let media_age_restrictions = user
		.age_restriction
		.as_ref()
		.map(|ar| apply_media_age_restriction(ar.age, ar.restrict_on_unset));
	let series_where_params = chain_optional_iter(
		[series::id::equals(id.clone())]
			.into_iter()
			.chain(apply_series_library_not_hidden_for_user_filter(&user))
			.collect::<Vec<WhereParam>>(),
		[series_age_restrictions],
	);
	let media_where_params = chain_optional_iter(
		[
			media::id::equals(body.media_id),
			media::series_id::equals(Some(id.clone())),
			media::series::is(series_where_params),
		],
		[media_age_restrictions],
	);

	let client = &ctx.db;

	let target_page = body
		.is_zero_based
		.map(|is_zero_based| {
			if is_zero_based {
				body.page + 1
			} else {
				body.page
			}
		})
		.unwrap_or(body.page);

	let media = client
		.media()
		.find_first(media_where_params)
		.with(
			media::series::fetch()
				.with(series::library::fetch().with(library::library_options::fetch())),
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
	let thumbnail_options = library
		.library_options()?
		.thumbnail_config
		.to_owned()
		.map(ImageProcessorOptions::try_from)
		.transpose()?
		.unwrap_or_else(|| {
			tracing::warn!(
				"Failed to parse existing thumbnail config! Using a default config"
			);
			ImageProcessorOptions::default()
		})
		.with_page(target_page);

	let format = thumbnail_options.format.clone();
	let path_buf = generate_thumbnail(&id, &media.path, thumbnail_options, &ctx.config)?;
	Ok(ImageResponse::from((
		ContentType::from(format),
		read_entire_file(path_buf)?,
	)))
}

#[utoipa::path(
	post,
	path = "/api/v1/series/:id/thumbnail",
	tag = "series",
	params(
		("id" = String, Path, description = "The ID of the series")
	),
	responses(
		(status = 200, description = "Successfully updated series thumbnail"),
		(status = 401, description = "Unauthorized"),
		(status = 403, description = "Forbidden"),
		(status = 404, description = "Series not found"),
		(status = 500, description = "Internal server error"),
	)
)]
async fn replace_series_thumbnail(
	Path(id): Path<String>,
	State(ctx): State<AppState>,
	Extension(req): Extension<RequestContext>,
	mut upload: Multipart,
) -> APIResult<ImageResponse> {
	let user = req.user_and_enforce_permissions(&[
		UserPermission::UploadFile,
		UserPermission::ManageLibrary,
	])?;
	let age_restrictions = user
		.age_restriction
		.as_ref()
		.map(|ar| apply_series_age_restriction(ar.age, ar.restrict_on_unset));
	let where_params = chain_optional_iter(
		[series::id::equals(id.clone())]
			.into_iter()
			.chain(apply_series_library_not_hidden_for_user_filter(&user))
			.collect::<Vec<WhereParam>>(),
		[age_restrictions],
	);
	let client = &ctx.db;

	let series = client
		.series()
		.find_first(where_params)
		.exec()
		.await?
		.ok_or(APIError::NotFound(String::from("Series not found")))?;

	let (content_type, bytes) = validate_image_upload(&mut upload).await?;
	let ext = content_type.extension();
	let series_id = series.id;

	// Note: I chose to *safely* attempt the removal as to not block the upload, however after some
	// user testing I'd like to see if this becomes a problem. We'll see!
	match remove_thumbnails(&[series_id.clone()], ctx.config.get_thumbnails_dir()) {
		Ok(count) => tracing::info!("Removed {} thumbnails!", count),
		Err(e) => tracing::error!(
			?e,
			"Failed to remove existing series thumbnail before replacing!"
		),
	}

	let path_buf = place_thumbnail(&series_id, ext, &bytes, &ctx.config)?;

	Ok(ImageResponse::from((
		content_type,
		read_entire_file(path_buf)?,
	)))
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
	Extension(req): Extension<RequestContext>,
	Path(id): Path<String>,
	State(ctx): State<AppState>,
) -> APIResult<Json<Pageable<Vec<Media>>>> {
	let db = &ctx.db;

	let user = req.user();
	let user_id = user.id.clone();
	let age_restrictions = user.age_restriction.as_ref().map(|ar| {
		(
			apply_series_age_restriction(ar.age, ar.restrict_on_unset),
			apply_media_age_restriction(ar.age, ar.restrict_on_unset),
		)
	});

	let series_where_params = chain_optional_iter(
		[series::id::equals(id.clone())]
			.into_iter()
			.chain(apply_series_library_not_hidden_for_user_filter(user))
			.collect::<Vec<WhereParam>>(),
		[age_restrictions.as_ref().map(|(sr, _)| sr.clone())],
	);
	let media_where_params = chain_optional_iter(
		[media::series_id::equals(Some(id.clone()))],
		[age_restrictions.as_ref().map(|(_, mr)| mr.clone())],
	);

	let pagination = pagination_query.0.get();
	let pagination_cloned = pagination.clone();
	let is_unpaged = pagination.is_unpaged();

	trace!(?ordering, ?pagination, "get_series_media");

	let order_by_param: MediaOrderByParam = ordering.0.try_into()?;

	let _can_access_series = db
		.series()
		.find_first(series_where_params)
		.exec()
		.await?
		.ok_or(APIError::NotFound(String::from("Series not found")))?;

	let (media, count) = db
		._transaction()
		.run(|client| async move {
			let mut query = client
				.media()
				.find_many(media_where_params.clone())
				.with(media::active_user_reading_sessions::fetch(vec![
					active_reading_session::user_id::equals(user_id.clone()),
				]))
				.with(media::finished_user_reading_sessions::fetch(vec![
					finished_reading_session::user_id::equals(user_id),
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
			let test_support_for_count =
				client.media().count(media_where_params).exec().await?;
			dbg!(test_support_for_count);

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
	Extension(req): Extension<RequestContext>,
) -> APIResult<Json<Option<Media>>> {
	let db = &ctx.db;
	let user = req.user();
	let user_id = user.id.clone();
	let series_age_restrictions = user
		.age_restriction
		.as_ref()
		.map(|ar| apply_series_age_restriction(ar.age, ar.restrict_on_unset));
	let media_age_restrictions = user
		.age_restriction
		.as_ref()
		.map(|ar| apply_media_age_restriction(ar.age, ar.restrict_on_unset));
	let where_params = chain_optional_iter(
		[series::id::equals(id.clone())]
			.into_iter()
			.chain(apply_series_library_not_hidden_for_user_filter(user))
			.collect::<Vec<WhereParam>>(),
		[series_age_restrictions],
	);
	let media_where_params = chain_optional_iter([], [media_age_restrictions]);

	let result = db
		.series()
		.find_first(where_params)
		.with(
			series::media::fetch(media_where_params)
				.with(media::active_user_reading_sessions::fetch(vec![
					active_reading_session::user_id::equals(user_id.clone()),
				]))
				.with(media::finished_user_reading_sessions::fetch(vec![
					finished_reading_session::user_id::equals(user_id),
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
				match m
					.active_user_reading_sessions()
					.ok()
					.and_then(|sessions| sessions.first())
				{
					// If there is a percentage, and it is less than 1.0, then it is next!
					Some(session) if session.epubcfi.is_some() => session
						.percentage_completed
						.map(|value| value < 1.0)
						.unwrap_or(false),
					// If there is a page, and it is less than the total pages, then it is next!
					Some(session) if session.page.is_some() => {
						session.page.unwrap_or(1) < m.pages
					},
					// No session means it is up next!
					_ => true,
				}
			})
			.or_else(|| media.first());

		Ok(Json(next_book.map(|data| Media::from(data.to_owned()))))
	} else {
		Err(APIError::NotFound(format!(
			"Series with id {} no found.",
			id
		)))
	}
}

#[derive(Deserialize, Serialize, ToSchema, specta::Type)]
pub struct SeriesIsComplete {
	is_complete: bool,
	completed_at: Option<String>,
}

#[utoipa::path(
	get,
	path = "/api/v1/series/:id/complete",
	tag = "series",
	params(
		("id" = String, Path, description = "The ID of the series to check"),
	),
	responses(
		(status = 200, description = "Successfully fetched series completion status.", body = SeriesIsComplete),
		(status = 401, description = "Unauthorized"),
		(status = 500, description = "Internal server error"),
	)
)]
async fn get_series_is_complete(
	Path(id): Path<String>,
	State(ctx): State<AppState>,
	Extension(req): Extension<RequestContext>,
) -> APIResult<Json<SeriesIsComplete>> {
	let client = &ctx.db;

	let user = req.user();
	let user_id = user.id.clone();
	let age_restrictions = user.age_restriction.as_ref().map(|ar| {
		(
			apply_series_age_restriction(ar.age, ar.restrict_on_unset),
			apply_media_age_restriction(ar.age, ar.restrict_on_unset),
		)
	});

	let series_where_params = chain_optional_iter(
		[series::id::equals(id.clone())]
			.into_iter()
			.chain(apply_series_library_not_hidden_for_user_filter(user))
			.collect::<Vec<WhereParam>>(),
		[age_restrictions.as_ref().map(|(sr, _)| sr.clone())],
	);
	let media_where_params = chain_optional_iter(
		[media::series::is(series_where_params)],
		[age_restrictions.as_ref().map(|(_, mr)| mr.clone())],
	);

	let media_count = client.media().count(media_where_params).exec().await?;

	let finished_sessions = client
		.finished_reading_session()
		.find_many(vec![
			finished_reading_session::user_id::equals(user_id),
			finished_reading_session::media::is(vec![media::series_id::equals(Some(id))]),
		])
		.order_by(finished_reading_session::completed_at::order(
			Direction::Desc,
		))
		.select(finished_reading_session_series_complete::select())
		.exec()
		.await?;

	let completed_at = finished_sessions
		.first()
		.map(|s| s.completed_at.to_rfc3339());
	// TODO(prisma): grouping/distinct not supported
	let unique_sessions = finished_sessions
		.into_iter()
		.map(|s| s.media_id)
		.collect::<HashSet<_>>();
	// Note: I am performing >= in the event that a user lost access to book(s) in the series
	// and the count is less than the total media count.
	let is_complete = unique_sessions.len() >= media_count as usize;

	Ok(Json(SeriesIsComplete {
		is_complete,
		completed_at,
	}))
}

// TODO: implement
async fn put_series_is_complete() -> APIResult<Json<SeriesIsComplete>> {
	Err(APIError::NotImplemented)
}

#[utoipa::path(
	post,
	path = "/api/v1/series/:id/analyze",
	tag = "series",
	params(
		("id" = String, Path, description = "The ID of the series to analyze")
	),
	responses(
		(status = 200, description = "Successfully started series media analysis"),
		(status = 401, description = "Unauthorized"),
		(status = 403, description = "Forbidden"),
		(status = 404, description = "Series not found"),
		(status = 500, description = "Internal server error"),
	)
)]
async fn start_media_analysis(
	Path(id): Path<String>,
	State(ctx): State<AppState>,
	Extension(req): Extension<RequestContext>,
) -> APIResult<()> {
	req.enforce_permissions(&[UserPermission::ManageLibrary])?;

	// Start analysis job
	ctx.enqueue_job(AnalyzeMediaJob::analyze_series(id))
		.map_err(|e| {
			let err = "Failed to enqueue analyze series media job";
			error!(?e, err);
			APIError::InternalServerError(err.to_string())
		})?;

	APIResult::Ok(())
}

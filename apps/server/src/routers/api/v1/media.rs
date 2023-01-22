use axum::{
	extract::{Path, State},
	middleware::from_extractor_with_state,
	routing::{get, put},
	Json, Router,
};
use axum_extra::extract::Query;
use axum_sessions::extractors::ReadableSession;
use prisma_client_rust::Direction;
use serde::Deserialize;
use stump_core::{
	config::get_config_dir,
	db::{
		models::{Media, ReadProgress},
		utils::PrismaCountTrait,
		Dao, MediaDao, MediaDaoImpl,
	},
	fs::{image, media_file},
	prelude::{ContentType, PageQuery, Pageable, Pagination, PaginationQuery},
	prisma::{
		media::{self, OrderByParam as MediaOrderByParam, WhereParam},
		read_progress, user,
	},
};
use tracing::{debug, trace};

use crate::{
	config::state::AppState,
	errors::{ApiError, ApiResult},
	middleware::auth::Auth,
	utils::{
		get_session_user,
		http::{ImageResponse, NamedFile},
		FilterableQuery, MediaFilter,
	},
};

use super::series::apply_series_filters;

pub(crate) fn mount(app_state: AppState) -> Router<AppState> {
	Router::new()
		.route("/media", get(get_media))
		.route("/media/duplicates", get(get_duplicate_media))
		.route("/media/keep-reading", get(get_in_progress_media))
		.route("/media/recently-added", get(get_recently_added_media))
		.nest(
			"/media/:id",
			Router::new()
				.route("/", get(get_media_by_id))
				.route("/file", get(get_media_file))
				.route("/convert", get(convert_media))
				.route("/thumbnail", get(get_media_thumbnail))
				.route("/page/:page", get(get_media_page))
				.route("/progress/:page", put(update_media_progress)),
		)
		.layer(from_extractor_with_state::<Auth, AppState>(app_state))
}

pub(crate) fn apply_media_filters(filters: MediaFilter) -> Vec<WhereParam> {
	let mut _where: Vec<WhereParam> = vec![];

	if !filters.id.is_empty() {
		_where.push(media::id::in_vec(filters.id));
	}
	if !filters.name.is_empty() {
		_where.push(media::name::in_vec(filters.name));
	}
	if !filters.extension.is_empty() {
		_where.push(media::extension::in_vec(filters.extension));
	}

	if let Some(series_filters) = filters.series {
		_where.push(media::series::is(apply_series_filters(series_filters)));
	}

	_where
}

/// Get all media accessible to the requester. This is a paginated request, and
/// has various pagination params available.
#[tracing::instrument(skip(ctx, session))]
async fn get_media(
	filter_query: Query<FilterableQuery<MediaFilter>>,
	pagination_query: Query<PaginationQuery>,
	State(ctx): State<AppState>,
	session: ReadableSession,
) -> ApiResult<Json<Pageable<Vec<Media>>>> {
	let FilterableQuery { filters, ordering } = filter_query.0.get();
	let pagination = pagination_query.0.get();

	trace!(?filters, ?ordering, ?pagination, "get_media");

	let db = ctx.get_db();
	let user_id = get_session_user(&session)?.id;

	let is_unpaged = pagination.is_unpaged();
	let order_by_param: MediaOrderByParam = ordering.try_into()?;

	let pagination_cloned = pagination.clone();
	let where_conditions = apply_media_filters(filters);

	let (media, count) = db
		._transaction()
		.run(|client| async move {
			let mut query = client
				.media()
				.find_many(where_conditions.clone())
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

			client
				.media()
				.count(where_conditions)
				.exec()
				.await
				.map(|count| (media, Some(count)))
		})
		.await?;

	if let Some(count) = count {
		return Ok(Json(Pageable::from((media, count, pagination))));
	}

	Ok(Json(Pageable::from(media)))
}

/// Get all media with identical checksums. This heavily implies duplicate files,
/// however it is not a guarantee (checksums are generated from the first chunk of
/// the file, so if a 2 comic books had say the same first 6 pages it might return a
/// false positive). This is a paginated request, and has various pagination
/// params available, but hopefully you won't have that many duplicates ;D
async fn get_duplicate_media(
	pagination: Query<PageQuery>,
	State(ctx): State<AppState>,
	_session: ReadableSession,
) -> ApiResult<Json<Pageable<Vec<Media>>>> {
	let media_dao = MediaDaoImpl::new(ctx.db.clone());

	if pagination.page.is_none() {
		return Ok(Json(Pageable::from(media_dao.get_duplicate_media().await?)));
	}

	Ok(Json(
		media_dao
			.get_duplicate_media_page(pagination.0.page_params())
			.await?,
	))
}

/// Get all media which the requester has progress for that is less than the
/// total number of pages available (i.e not completed).
async fn get_in_progress_media(
	State(ctx): State<AppState>,
	session: ReadableSession,
	pagination: Query<PageQuery>,
) -> ApiResult<Json<Pageable<Vec<Media>>>> {
	let user_id = get_session_user(&session)?.id;
	let media_dao = MediaDaoImpl::new(ctx.db.clone());
	let page_params = pagination.0.page_params();

	Ok(Json(
		media_dao
			.get_in_progress_media(&user_id, page_params)
			.await?,
	))
}

async fn get_recently_added_media(
	State(ctx): State<AppState>,
	pagination: Query<PageQuery>,
) -> ApiResult<Json<Pageable<Vec<Media>>>> {
	let db = ctx.get_db();

	let unpaged = pagination.page.is_none();
	let page_params = pagination.0.page_params();

	let mut query = db
		.media()
		.find_many(vec![])
		.order_by(media::created_at::order(Direction::Desc));

	if !unpaged {
		let (skip, take) = page_params.get_skip_take();
		query = query.skip(skip).take(take);
	}

	let media = query
		.exec()
		.await?
		.into_iter()
		.map(|m| m.into())
		.collect::<Vec<Media>>();

	if unpaged {
		return Ok(Json(Pageable::from(media)));
	}

	let count = db.media_count().await?;

	Ok(Json(Pageable::from((media, count, page_params))))
}

#[derive(Deserialize)]
struct LoadSeries {
	load_series: Option<bool>,
}

async fn get_media_by_id(
	Path(id): Path<String>,
	params: Query<LoadSeries>,
	State(ctx): State<AppState>,
	session: ReadableSession,
) -> ApiResult<Json<Media>> {
	let db = ctx.get_db();
	let user_id = get_session_user(&session)?.id;

	let mut query = db.media().find_unique(media::id::equals(id.clone())).with(
		media::read_progresses::fetch(vec![read_progress::user_id::equals(user_id)]),
	);

	if params.load_series.unwrap_or_default() {
		trace!(media_id = id, "Loading series relation for media");
		query = query.with(media::series::fetch());
	}

	let result = query.exec().await?;
	debug!(media_id = id, ?result, "Get media by id");

	if result.is_none() {
		return Err(ApiError::NotFound(format!(
			"Media with id {} not found",
			id
		)));
	}

	Ok(Json(Media::from(result.unwrap())))
}

async fn get_media_file(
	Path(id): Path<String>,
	State(ctx): State<AppState>,
) -> ApiResult<NamedFile> {
	let db = ctx.get_db();

	let media = db
		.media()
		.find_unique(media::id::equals(id.clone()))
		.exec()
		.await?;

	if media.is_none() {
		return Err(ApiError::NotFound(format!(
			"Media with id {} not found",
			id
		)));
	}

	let media = media.unwrap();

	Ok(NamedFile::open(media.path.clone()).await?)
}

// TODO: remove this, implement it? maybe?
async fn convert_media(
	Path(id): Path<String>,
	State(ctx): State<AppState>,
) -> Result<(), ApiError> {
	let db = ctx.get_db();

	let media = db
		.media()
		.find_unique(media::id::equals(id.clone()))
		.exec()
		.await?;

	if media.is_none() {
		return Err(ApiError::NotFound(format!(
			"Media with id {} not found",
			id
		)));
	}

	let media = media.unwrap();

	if media.extension != "cbr" || media.extension != "rar" {
		return Err(ApiError::BadRequest(format!(
			"Media with id {} is not a rar file. Stump only supports converting rar/cbr files to zip/cbz.",
			id
		)));
	}

	// TODO: write me...
	unimplemented!()
}

async fn get_media_page(
	Path((id, page)): Path<(String, i32)>,
	State(ctx): State<AppState>,
	session: ReadableSession,
) -> ApiResult<ImageResponse> {
	let db = ctx.get_db();
	let user_id = get_session_user(&session)?.id;

	let book = db
		.media()
		.find_unique(media::id::equals(id.clone()))
		.with(media::read_progresses::fetch(vec![
			read_progress::user_id::equals(user_id),
		]))
		.exec()
		.await?;

	match book {
		Some(book) => {
			if page > book.pages {
				// FIXME: probably won't work lol
				Err(ApiError::Redirect(format!(
					"/book/{}/read?page={}",
					id, book.pages
				)))
			} else {
				Ok(media_file::get_page(&book.path, page)?.into())
			}
		},
		None => Err(ApiError::NotFound(format!(
			"Media with id {} not found",
			id
		))),
	}
}

async fn get_media_thumbnail(
	Path(id): Path<String>,
	State(ctx): State<AppState>,
	session: ReadableSession,
) -> ApiResult<ImageResponse> {
	let db = ctx.get_db();
	let user_id = get_session_user(&session)?.id;

	let webp_path = get_config_dir()
		.join("thumbnails")
		.join(format!("{}.webp", id));

	if webp_path.exists() {
		trace!("Found webp thumbnail for media {}", id);
		return Ok((ContentType::WEBP, image::get_bytes(webp_path)?).into());
	}

	let book = db
		.media()
		.find_unique(media::id::equals(id.clone()))
		.with(media::read_progresses::fetch(vec![
			read_progress::user_id::equals(user_id),
		]))
		.exec()
		.await?;

	if book.is_none() {
		return Err(ApiError::NotFound(format!(
			"Media with id {} not found",
			id
		)));
	}

	let book = book.unwrap();

	Ok(media_file::get_page(book.path.as_str(), 1)?.into())
}

// FIXME: this doesn't really handle certain errors correctly, e.g. media/user not found
async fn update_media_progress(
	Path((id, page)): Path<(String, i32)>,
	State(ctx): State<AppState>,
	session: ReadableSession,
) -> ApiResult<Json<ReadProgress>> {
	let db = ctx.get_db();
	let user_id = get_session_user(&session)?.id;

	// update the progress, otherwise create it
	Ok(Json(
		db.read_progress()
			.upsert(
				read_progress::UniqueWhereParam::UserIdMediaIdEquals(
					user_id.clone(),
					id.clone(),
				),
				(
					page,
					media::id::equals(id.clone()),
					user::id::equals(user_id.clone()),
					vec![],
				),
				vec![read_progress::page::set(page)],
			)
			.exec()
			.await?
			.into(),
	))
}

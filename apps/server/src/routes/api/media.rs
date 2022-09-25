use prisma_client_rust::{raw, Direction};
use rocket::{fs::NamedFile, http::ContentType, serde::json::Json};
use rocket_okapi::openapi;
use stump_core::{
	config::get_config_dir,
	db::utils::PrismaCountTrait,
	fs::{image, media_file},
	prisma::{
		media::{self, OrderByParam},
		read_progress, user,
	},
	types::{
		media::Media, read_progress::ReadProgress, FindManyTrait, PageParams, Pageable,
		PagedRequestParams, QueryOrder,
	},
};

use crate::{
	guards::auth::Auth,
	types::{
		errors::ApiError,
		http::{FileResponse, ImageResponse},
		ApiResult, Ctx,
	},
};

/// Get all media accessible to the requester. This is a paginated request, and
/// has various pagination params available.
#[openapi(tag = "Media")]
#[get("/media?<unpaged>&<req_params..>")]
pub async fn get_media(
	unpaged: Option<bool>,
	req_params: Option<PagedRequestParams>,
	ctx: &Ctx,
	auth: Auth,
) -> ApiResult<Json<Pageable<Vec<Media>>>> {
	let db = ctx.get_db();

	let unpaged = unpaged.unwrap_or_else(|| req_params.is_none());
	let page_params = PageParams::from(req_params);
	let order_by_param: OrderByParam =
		QueryOrder::from(page_params.clone()).try_into()?;

	let base_query = db
		.media()
		.find_many(vec![])
		.with(media::read_progresses::fetch(vec![
			read_progress::user_id::equals(auth.0.id),
		]))
		.order_by(order_by_param);

	if unpaged {
		return Ok(Json(
			base_query
				.exec()
				.await?
				.into_iter()
				.map(|m| m.into())
				.collect::<Vec<Media>>()
				.into(),
		));
	}

	let count = db.media_count().await?;

	let media = base_query
		.paginated(page_params.clone())
		.exec()
		.await?
		.into_iter()
		.map(|m| m.into())
		.collect::<Vec<Media>>();

	Ok(Json((media, count, page_params).into()))
}

/// Get all media with identical checksums. This heavily implies duplicate files.  
/// This is a paginated request, and has various pagination params available.
#[openapi(tag = "Media")]
#[get("/media/duplicates?<unpaged>&<page_params..>")]
pub async fn get_duplicate_media(
	unpaged: Option<bool>,
	page_params: Option<PagedRequestParams>,
	ctx: &Ctx,
	_auth: Auth,
) -> ApiResult<Json<Pageable<Vec<Media>>>> {
	let db = ctx.get_db();

	let media: Vec<Media> = db
		._query_raw(raw!("SELECT * FROM media WHERE checksum IN (SELECT checksum FROM media GROUP BY checksum HAVING COUNT(*) > 1)"))
		.exec()
		.await?;

	let unpaged = unpaged.unwrap_or(page_params.is_none());

	if unpaged {
		return Ok(Json(media.into()));
	}

	Ok(Json((media, page_params).into()))
}
// TODO: I will need to add epub progress in here SOMEHOW... this will be rather
// difficult...
// TODO: paginate?
/// Get all media which the requester has progress for that is less than the
/// total number of pages available (i.e not completed).
#[openapi(tag = "Media")]
#[get("/media/keep-reading")]
pub async fn get_reading_media(ctx: &Ctx, auth: Auth) -> ApiResult<Json<Vec<Media>>> {
	let db = ctx.get_db();

	Ok(Json(
		db.media()
			.find_many(vec![media::read_progresses::some(vec![
				read_progress::user_id::equals(auth.0.id.clone()),
				read_progress::page::gt(0),
			])])
			.with(media::read_progresses::fetch(vec![
				read_progress::user_id::equals(auth.0.id),
				read_progress::page::gt(0),
			]))
			.order_by(media::updated_at::order(Direction::Desc))
			.exec()
			.await?
			.into_iter()
			.filter(|m| match m.read_progresses() {
				// Read progresses relation on media is one to many, there is a dual key
				// on read_progresses table linking a user and media. Therefore, there should
				// only be 1 item in this vec for each media resulting from the query.
				Ok(progresses) => {
					if progresses.len() != 1 {
						return false;
					}

					let progress = &progresses[0];

					if let Some(_epubcfi) = progress.epubcfi.as_ref() {
						// TODO: figure something out... might just need a `completed` field in progress TBH.
						return false;
					} else {
						return progress.page < m.pages;
					}
				},
				_ => false,
			})
			.map(|m| m.into())
			.collect(),
	))
}

#[openapi(tag = "Media")]
#[get("/media/<id>")]
pub async fn get_media_by_id(
	id: String,
	ctx: &Ctx,
	auth: Auth,
) -> ApiResult<Json<Media>> {
	let db = ctx.get_db();

	let book = db
		.media()
		.find_unique(media::id::equals(id.clone()))
		.with(media::read_progresses::fetch(vec![
			read_progress::user_id::equals(auth.0.id),
		]))
		.exec()
		.await?;

	if book.is_none() {
		return Err(ApiError::NotFound(format!(
			"Media with id {} not found",
			id
		)));
	}

	Ok(Json(book.unwrap().into()))
}

#[openapi(tag = "Media")]
#[get("/media/<id>/file")]
pub async fn get_media_file(
	id: String,
	ctx: &Ctx,
	_auth: Auth,
) -> ApiResult<FileResponse> {
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

	Ok(FileResponse(
		NamedFile::open(media.path.clone()).await?,
		media.path,
	))

	// Ok(NamedFile::open(media.path.clone()).await?)
}

// TODO: remove this, implement it? maybe?
#[allow(unused)]
#[openapi(tag = "Media")]
#[post("/media/<id>/convert")]
pub async fn convert_media_to_cbz(
	id: String,
	ctx: &Ctx,
	_auth: Auth,
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

	if media.extension != "cbr" {
		return Err(ApiError::BadRequest(format!(
			"Media with id {} is not a cbr file. Only cbr files can be converted to cbz",
			id
		)));
	}

	// TODO: write me...
	unimplemented!()
}

#[openapi(tag = "Media")]
#[get("/media/<id>/page/<page>")]
pub async fn get_media_page(
	id: String,
	page: i32,
	ctx: &Ctx,
	auth: Auth,
) -> ApiResult<ImageResponse> {
	let db = ctx.get_db();

	let book = db
		.media()
		.find_unique(media::id::equals(id.clone()))
		.with(media::read_progresses::fetch(vec![
			read_progress::user_id::equals(auth.0.id),
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
				Ok(media_file::get_page(&book.path, page)?)
			}
		},
		None => Err(ApiError::NotFound(format!(
			"Media with id {} not found",
			id
		))),
	}
}

#[openapi(tag = "Media")]
#[get("/media/<id>/thumbnail")]
pub async fn get_media_thumbnail(
	id: String,
	ctx: &Ctx,
	auth: Auth,
) -> ApiResult<ImageResponse> {
	let db = ctx.get_db();

	let webp_path = get_config_dir()
		.join("thumbnails")
		.join(format!("{}.webp", id));

	if webp_path.exists() {
		log::trace!("Found webp thumbnail for media {}", id);
		return Ok((ContentType::WEBP, image::get_image_bytes(webp_path)?));
	}

	let book = db
		.media()
		.find_unique(media::id::equals(id.clone()))
		.with(media::read_progresses::fetch(vec![
			read_progress::user_id::equals(auth.0.id),
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

	Ok(media_file::get_page(book.path.as_str(), 1)?)
}

// FIXME: this doesn't really handle certain errors correctly, e.g. media/user not found
#[openapi(tag = "Media")]
#[put("/media/<id>/progress/<page>")]
pub async fn update_media_progress(
	id: String,
	page: i32,
	ctx: &Ctx,
	auth: Auth,
) -> ApiResult<Json<ReadProgress>> {
	let db = ctx.get_db();

	// update the progress, otherwise create it
	Ok(Json(
		db.read_progress()
			.upsert(
				read_progress::UniqueWhereParam::UserIdMediaIdEquals(
					auth.0.id.clone(),
					id.clone(),
				),
				(
					page,
					media::id::equals(id.clone()),
					user::id::equals(auth.0.id.clone()),
					vec![],
				),
				vec![read_progress::page::set(page)],
			)
			.exec()
			.await?
			.into(),
	))
}

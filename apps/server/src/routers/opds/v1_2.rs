use std::path::PathBuf;

use axum::{
	extract::{Path, Query, State},
	middleware,
	routing::get,
	Extension, Router,
};
use chrono::Utc;
use graphql::{data::AuthContext, pagination::OffsetPagination};
use models::{
	entity::{
		finished_reading_session, library, media, reading_session, series,
		series_metadata, user::AuthUser,
	},
	shared::{
		enums::UserPermission,
		image_processor_options::{ImageProcessorOptions, SupportedImageFormat},
	},
};
use sea_orm::{
	prelude::*, sea_query::OnConflict, QueryOrder, QuerySelect, QueryTrait, Set,
};
use serde::{Deserialize, Serialize};
use stump_core::{
	filesystem::{
		image::{GenericImageProcessor, ImageProcessor},
		media::get_page_async,
		ContentType,
	},
	opds::{
		v1_2::{
			entry::{IntoOPDSEntry, OPDSEntryBuilder, OpdsEntry},
			feed::{
				OPDSFeedBuilder, OPDSFeedBuilderPageParams, OPDSFeedBuilderParams,
				OpdsFeed,
			},
			link::{OpdsLink, OpdsLinkRel, OpdsLinkType},
			opensearch::OpdsOpenSearch,
		},
		v2_0::entity::OPDSPublicationEntity,
	},
	Ctx,
};

use crate::{
	config::state::AppState,
	errors::{APIError, APIResult},
	middleware::auth::{api_key_middleware, auth_middleware},
	utils::http::{ImageResponse, NamedFile, Xml},
};

pub(crate) fn mount(app_state: AppState) -> Router<AppState> {
	let primary_router = Router::new() //
		.route("/catalog", get(catalog))
		.route("/search", get(search_description))
		.route("/keep-reading", get(keep_reading))
		.nest(
			"/libraries",
			Router::new()
				.route("/", get(get_libraries))
				.route("/{id}", get(get_library_by_id)),
		)
		.nest(
			"/series",
			Router::new()
				.route("/", get(get_series))
				.route("/latest", get(get_latest_series))
				.route("/{id}", get(get_series_by_id)),
		)
		.nest(
			"/books/{id}",
			Router::new()
				.route("/thumbnail", get(get_book_thumbnail))
				.route("/pages/{page}", get(get_book_page))
				.route("/file/{filename}", get(download_book)),
		);

	Router::new()
		.nest(
			"/v1.2",
			primary_router.clone().layer(middleware::from_fn_with_state(
				app_state.clone(),
				auth_middleware,
			)),
		)
		.nest(
			"/{api_key}/v1.2",
			primary_router.layer(middleware::from_fn_with_state(
				app_state,
				api_key_middleware,
			)),
		)
}

#[derive(Debug, Serialize, Deserialize)]
struct OPDSURLParams<D> {
	#[serde(flatten)]
	params: D,
	#[serde(default)]
	api_key: Option<String>,
}

#[derive(Debug, Serialize, Deserialize)]
struct OPDSIDURLParams {
	id: String,
}

fn number_or_string_deserializer<'de, D>(deserializer: D) -> Result<i32, D::Error>
where
	D: serde::Deserializer<'de>,
{
	let value = String::deserialize(deserializer)?;
	value.parse::<i32>().map_err(serde::de::Error::custom)
}

#[derive(Debug, Serialize, Deserialize)]
struct OPDSPageURLParams {
	id: String,
	#[serde(deserialize_with = "number_or_string_deserializer")]
	page: i32,
}

#[derive(Debug, Serialize, Deserialize)]
struct OPDSFilenameURLParams {
	id: String,
	filename: String,
}

#[derive(Debug, Default, Serialize, Deserialize)]
struct OPDSSearchQuery {
	#[serde(default)]
	search: Option<String>,
}

fn pagination_bounds(page: i64, page_size: i64) -> (i64, i64) {
	let skip = page * page_size;
	(skip, page_size)
}

fn catalog_url(req_ctx: &AuthContext, path: &str) -> String {
	if let Some(api_key) = req_ctx.api_key() {
		format!("/opds/{}/v1.2/{}", api_key, path)
	} else {
		format!("/opds/v1.2/{}", path)
	}
}

fn service_url(req_ctx: &AuthContext) -> String {
	if let Some(api_key) = req_ctx.api_key() {
		format!("/opds/{}/v1.2", api_key)
	} else {
		"/opds/v1.2".to_string()
	}
}

async fn catalog(Extension(req): Extension<AuthContext>) -> APIResult<Xml> {
	let entries = vec![
		OpdsEntry::new(
			"keepReading".to_string(),
			Utc::now().into(),
			"Keep reading".to_string(),
			Some(String::from("Continue reading your in progress books")),
			None,
			Some(vec![OpdsLink {
				link_type: OpdsLinkType::Navigation,
				rel: OpdsLinkRel::Subsection,
				href: catalog_url(&req, "keep-reading"),
			}]),
			None,
		),
		OpdsEntry::new(
			"allSeries".to_string(),
			Utc::now().into(),
			"All series".to_string(),
			Some(String::from("Browse by series")),
			None,
			Some(vec![OpdsLink {
				link_type: OpdsLinkType::Navigation,
				rel: OpdsLinkRel::Subsection,
				href: catalog_url(&req, "series"),
			}]),
			None,
		),
		OpdsEntry::new(
			"latestSeries".to_string(),
			Utc::now().into(),
			"Latest series".to_string(),
			Some(String::from("Browse latest series")),
			None,
			Some(vec![OpdsLink {
				link_type: OpdsLinkType::Navigation,
				rel: OpdsLinkRel::Subsection,
				href: catalog_url(&req, "series/latest"),
			}]),
			None,
		),
		OpdsEntry::new(
			"allLibraries".to_string(),
			Utc::now().into(),
			"All libraries".to_string(),
			Some(String::from("Browse by library")),
			None,
			Some(vec![OpdsLink {
				link_type: OpdsLinkType::Navigation,
				rel: OpdsLinkRel::Subsection,
				href: catalog_url(&req, "libraries"),
			}]),
			None,
		),
		// TODO: more?
		// TODO: get user stored searches, so they don't have to redo them over and over?
		// e.g. /opds/v1.2/series?search={searchTerms}, /opds/v1.2/libraries?search={searchTerms}, etc.
	];

	let links = vec![
		OpdsLink {
			link_type: OpdsLinkType::Navigation,
			rel: OpdsLinkRel::ItSelf,
			href: catalog_url(&req, "catalog"),
		},
		OpdsLink {
			link_type: OpdsLinkType::Navigation,
			rel: OpdsLinkRel::Start,
			href: catalog_url(&req, "catalog"),
		},
		OpdsLink {
			link_type: OpdsLinkType::Search,
			rel: OpdsLinkRel::Search,
			href: catalog_url(&req, "search"),
		},
	];

	let feed = OpdsFeed::new(
		"root".to_string(),
		"Stump OPDS catalog".to_string(),
		Some(links),
		entries,
	);

	Ok(Xml(feed.build()?))
}

async fn search_description(Extension(req): Extension<AuthContext>) -> APIResult<Xml> {
	Ok(OpdsOpenSearch::new(Some(service_url(&req)))
		.build()
		.map(Xml)?)
}

async fn keep_reading(
	State(ctx): State<AppState>,
	Extension(req): Extension<AuthContext>,
) -> APIResult<Xml> {
	let books = OPDSPublicationEntity::find_for_user(&req.user())
		.filter(reading_session::Column::UserId.eq(req.id()))
		.order_by_desc(reading_session::Column::UpdatedAt)
		.into_model::<OPDSPublicationEntity>()
		.all(ctx.conn.as_ref())
		.await?;

	let entries = books
		.into_iter()
		.map(|m| {
			OPDSEntryBuilder::<OPDSPublicationEntity>::new(m, req.api_key())
				.into_opds_entry()
		})
		.collect::<Vec<OpdsEntry>>();

	let feed = OpdsFeed::new(
		"keepReading".to_string(),
		"Keep Reading".to_string(),
		Some(vec![
			OpdsLink {
				link_type: OpdsLinkType::Navigation,
				rel: OpdsLinkRel::ItSelf,
				href: catalog_url(&req, "keep-reading"),
			},
			OpdsLink {
				link_type: OpdsLinkType::Navigation,
				rel: OpdsLinkRel::Start,
				href: catalog_url(&req, "catalog"),
			},
		]),
		entries,
	);

	Ok(Xml(feed.build()?))
}

/// A handler for GET /opds/v1.2/libraries, accepts a `search` URL param
async fn get_libraries(
	State(ctx): State<AppState>,
	Query(OPDSSearchQuery { search }): Query<OPDSSearchQuery>,
	Extension(req): Extension<AuthContext>,
) -> APIResult<Xml> {
	let user = req.user();

	let libraries = library::Entity::find_for_user(&user)
		.apply_if(search, |query, search| {
			query.filter(library::Column::Name.contains(search))
		})
		.order_by_asc(library::Column::Name)
		.all(ctx.conn.as_ref())
		.await?;
	let entries = libraries
		.into_iter()
		.map(|l| {
			OPDSEntryBuilder::<library::Model>::new(l, req.api_key()).into_opds_entry()
		})
		.collect::<Vec<OpdsEntry>>();

	let feed = OpdsFeed::new(
		"allLibraries".to_string(),
		"All libraries".to_string(),
		Some(vec![
			OpdsLink {
				link_type: OpdsLinkType::Navigation,
				rel: OpdsLinkRel::ItSelf,
				href: catalog_url(&req, "libraries"),
			},
			OpdsLink {
				link_type: OpdsLinkType::Navigation,
				rel: OpdsLinkRel::Start,
				href: catalog_url(&req, "catalog"),
			},
		]),
		entries,
	);

	Ok(Xml(feed.build()?))
}

async fn get_library_by_id(
	State(ctx): State<AppState>,
	Path(OPDSURLParams {
		params: OPDSIDURLParams { id },
		..
	}): Path<OPDSURLParams<OPDSIDURLParams>>,
	pagination: Query<OffsetPagination>,
	Extension(req): Extension<AuthContext>,
) -> APIResult<Xml> {
	let user = req.user();

	// Note: This is just to enforce access to the library, otherwise we would get an
	// empty result set without informing the requester that the resource they are
	// requesting "does not exist"
	let library = library::Entity::find_for_user(&user)
		.select_only()
		.columns(library::LibraryIdentSelect::columns())
		.into_model::<library::LibraryIdentSelect>()
		.one(ctx.conn.as_ref())
		.await?
		.ok_or(APIError::NotFound("Library not found".to_string()))?;

	let series = series::Entity::find_for_user(&user)
		.filter(series::Column::LibraryId.eq(library.id.clone()))
		.order_by_asc(series::Column::Name)
		.offset(pagination.offset())
		.limit(pagination.limit())
		.all(ctx.conn.as_ref())
		.await?;
	let count = series::Entity::find_for_user(&user)
		.filter(series::Column::LibraryId.eq(library.id.clone()))
		.count(ctx.conn.as_ref())
		.await?;

	let entries = series
		.into_iter()
		.map(|s| {
			OPDSEntryBuilder::<series::Model>::new(s, req.api_key()).into_opds_entry()
		})
		.collect::<Vec<OpdsEntry>>();

	let feed = OPDSFeedBuilder::new(req.api_key()).paginated(OPDSFeedBuilderParams {
		id,
		title: library.name.clone(),
		entries,
		href_postfix: format!("libraries/{}", &library.id),
		page_params: Some(OPDSFeedBuilderPageParams {
			page: pagination.page,
			count,
		}),
		search: None,
	})?;

	Ok(Xml(feed.build()?))
}

// FIXME: Based on testing with Panels, it seems like pagination isn't an expected default when
// a search is present? This feels both odd but understandable to support an "at a glance" view,
// but I feel like it should still support pagination...

/// A handler for GET /opds/v1.2/series, accepts a `page` URL param. Note: OPDS
/// pagination is zero-indexed.
async fn get_series(
	State(ctx): State<AppState>,
	Query(pagination): Query<OffsetPagination>,
	Query(OPDSSearchQuery { search }): Query<OPDSSearchQuery>,
	Extension(req): Extension<AuthContext>,
) -> APIResult<Xml> {
	let user = req.user();
	let search_cpy = search.clone();
	let series = series::Entity::find_for_user(&user)
		.apply_if(search_cpy, |query, search| {
			query.left_join(series_metadata::Entity).filter(
				series::Column::Name
					.contains(search.clone())
					.or(series_metadata::Column::Title.contains(search)),
			)
		})
		.order_by_asc(series::Column::Name)
		.offset(pagination.offset())
		.limit(pagination.limit())
		.all(ctx.conn.as_ref())
		.await?;
	let search_cpy = search.clone();
	let count = series::Entity::find_for_user(&user)
		.apply_if(search_cpy, |query, search| {
			query.left_join(series_metadata::Entity).filter(
				series::Column::Name
					.contains(search.clone())
					.or(series_metadata::Column::Title.contains(search)),
			)
		})
		.count(ctx.conn.as_ref())
		.await?;

	let entries = series
		.into_iter()
		.map(|s| {
			OPDSEntryBuilder::<series::Model>::new(s, req.api_key()).into_opds_entry()
		})
		.collect::<Vec<OpdsEntry>>();

	let feed = OPDSFeedBuilder::new(req.api_key()).paginated(OPDSFeedBuilderParams {
		id: "allSeries".to_string(),
		title: "All Series".to_string(),
		entries,
		href_postfix: "series".to_string(),
		page_params: Some(OPDSFeedBuilderPageParams {
			page: pagination.page,
			count,
		}),
		search,
	})?;

	Ok(Xml(feed.build()?))
}

async fn get_latest_series(
	State(ctx): State<AppState>,
	pagination: Query<OffsetPagination>,
	Extension(req): Extension<AuthContext>,
) -> APIResult<Xml> {
	let user = req.user();
	let series = series::Entity::find_for_user(&user)
		.order_by_desc(series::Column::UpdatedAt)
		.offset(pagination.offset())
		.limit(pagination.limit())
		.all(ctx.conn.as_ref())
		.await?;
	let count = series::Entity::find_for_user(&user)
		.count(ctx.conn.as_ref())
		.await?;

	let entries = series
		.into_iter()
		.map(|s| {
			OPDSEntryBuilder::<series::Model>::new(s, req.api_key()).into_opds_entry()
		})
		.collect::<Vec<OpdsEntry>>();

	let feed = OPDSFeedBuilder::new(req.api_key()).paginated(OPDSFeedBuilderParams {
		id: "latestSeries".to_string(),
		title: "Latest Series".to_string(),
		entries,
		href_postfix: "series/latest".to_string(),
		page_params: Some(OPDSFeedBuilderPageParams {
			page: pagination.page,
			count,
		}),
		search: None,
	})?;

	Ok(Xml(feed.build()?))
}

async fn get_series_by_id(
	Path(OPDSURLParams {
		params: OPDSIDURLParams { id },
		..
	}): Path<OPDSURLParams<OPDSIDURLParams>>,
	State(ctx): State<AppState>,
	pagination: Query<OffsetPagination>,
	Extension(req): Extension<AuthContext>,
) -> APIResult<Xml> {
	let user = req.user();
	let series::ModelWithMetadata { series, metadata } =
		series::ModelWithMetadata::find_for_user(&user)
			.filter(series::Column::Id.eq(id.clone()))
			.into_model::<series::ModelWithMetadata>()
			.one(ctx.conn.as_ref())
			.await?
			.ok_or(APIError::NotFound(format!("Series {id} not found")))?;

	let books = OPDSPublicationEntity::find_for_user(&user)
		.filter(media::Column::SeriesId.eq(id.clone()))
		.order_by_asc(media::Column::Name)
		.offset(pagination.offset())
		.limit(pagination.limit())
		.into_model::<OPDSPublicationEntity>()
		.all(ctx.conn.as_ref())
		.await?;
	let count = OPDSPublicationEntity::find_for_user(&user)
		.filter(media::Column::SeriesId.eq(id.clone()))
		.count(ctx.conn.as_ref())
		.await?;

	let entries = books
		.into_iter()
		.map(|m| {
			OPDSEntryBuilder::<OPDSPublicationEntity>::new(m, req.api_key())
				.into_opds_entry()
		})
		.collect();

	let title = metadata
		.and_then(|m| m.title.clone())
		.unwrap_or_else(|| series.name.clone());

	let feed = OPDSFeedBuilder::new(req.api_key()).paginated(OPDSFeedBuilderParams {
		id: series.id.clone(),
		title,
		entries,
		href_postfix: format!("series/{}", &series.id),
		page_params: Some(OPDSFeedBuilderPageParams {
			page: pagination.page,
			count,
		}),
		search: None,
	})?;

	Ok(Xml(feed.build()?))
}

// TODO: support something like `STRICT_OPDS` to enforce OPDS compliance conditionally
fn handle_opds_image_response(
	content_type: ContentType,
	image_buffer: Vec<u8>,
) -> APIResult<ImageResponse> {
	if content_type.is_opds_legacy_image() {
		Ok(ImageResponse::new(content_type, image_buffer))
	} else if content_type.is_decodable_image() {
		tracing::debug!("Converting image to JPEG for legacy OPDS compatibility");
		let jpeg_buffer = tokio::task::block_in_place(|| {
			let converted = GenericImageProcessor::generate(
				&image_buffer,
				ImageProcessorOptions {
					format: SupportedImageFormat::Jpeg,
					..Default::default()
				},
			)?;
			Ok::<Vec<u8>, APIError>(converted)
		})?;
		Ok(ImageResponse::new(ContentType::JPEG, jpeg_buffer))
	} else {
		tracing::warn!(
			?content_type,
			"Encountered image which does not conform to legacy OPDS image requirements"
		);
		Ok(ImageResponse::new(content_type, image_buffer))
	}
}

/// A helper function to fetch a book page for a user. This is not a route handler.
async fn fetch_book_page_for_user(
	ctx: &Ctx,
	user: &AuthUser,
	book_id: String,
	page: i32,
) -> APIResult<ImageResponse> {
	let book = media::Entity::find_for_user(user)
		.columns(vec![media::Column::Id, media::Column::Path])
		.filter(media::Column::Id.eq(book_id))
		.into_model::<media::MediaIdentSelect>()
		.one(ctx.conn.as_ref())
		.await?
		.ok_or(APIError::NotFound("Book not found".to_string()))?;

	let (content_type, image_buffer) =
		get_page_async(PathBuf::from(book.path), page, &ctx.config).await?;
	handle_opds_image_response(content_type, image_buffer)
}

/// A handler for GET /opds/v1.2/books/{id}/thumbnail, returns the thumbnail
async fn get_book_thumbnail(
	Path(OPDSURLParams {
		params: OPDSIDURLParams { id },
		..
	}): Path<OPDSURLParams<OPDSIDURLParams>>,
	State(ctx): State<AppState>,
	Extension(req): Extension<AuthContext>,
) -> APIResult<ImageResponse> {
	fetch_book_page_for_user(&ctx, &req.user(), id, 1).await
}

/// A handler for GET /opds/v1.2/books/{id}/page/{page}, returns the page
async fn get_book_page(
	Path(OPDSURLParams {
		params: OPDSPageURLParams { id, page },
		..
	}): Path<OPDSURLParams<OPDSPageURLParams>>,
	State(ctx): State<AppState>,
	pagination: Query<OffsetPagination>,
	Extension(req): Extension<AuthContext>,
) -> APIResult<ImageResponse> {
	// OPDS defaults to zero-indexed pages, I don't even think it allows the
	// zero_based query param to be set.
	let zero_based = pagination.zero_based.unwrap_or(true);
	let mut correct_page = page;
	if zero_based {
		correct_page = page + 1;
	}

	let user = req.user();
	let book = media::Entity::find_for_user(&user)
		.filter(media::Column::Id.eq(id.clone()))
		.one(ctx.conn.as_ref())
		.await?
		.ok_or(APIError::NotFound("Book not found".to_string()))?;

	if book.pages == correct_page {
		let deleted_sessions = reading_session::Entity::delete_many()
			.filter(
				reading_session::Column::UserId
					.eq(user.id.clone())
					.and(reading_session::Column::MediaId.eq(id.clone())),
			)
			.exec_with_returning(ctx.conn.as_ref())
			.await?;
		let deleted_session = deleted_sessions.into_iter().next();
		tracing::trace!(?deleted_session, "Deleted active reading session");

		let started_at = deleted_session.as_ref().map(|s| s.started_at);
		let device_id = deleted_session.as_ref().and_then(|s| s.device_id.clone());
		let elapsed_seconds = deleted_session.as_ref().and_then(|s| s.elapsed_seconds);

		let active_model = finished_reading_session::ActiveModel {
			user_id: Set(user.id.clone()),
			media_id: Set(id.clone()),
			device_id: Set(device_id),
			started_at: Set(started_at.unwrap_or_default()),
			elapsed_seconds: Set(elapsed_seconds),
			completed_at: Set(Utc::now().into()),
			..Default::default()
		};
		let finished_session = finished_reading_session::Entity::insert(active_model)
			.exec(ctx.conn.as_ref())
			.await?;
		tracing::trace!(?finished_session, "Created finished reading session");
	} else {
		let on_conflict = OnConflict::new()
			.update_columns(vec![
				reading_session::Column::Page,
				reading_session::Column::UpdatedAt,
			])
			.to_owned();
		let active_model = reading_session::ActiveModel {
			user_id: Set(user.id.clone()),
			media_id: Set(id.clone()),
			device_id: Set(None),
			page: Set(Some(correct_page)),
			..Default::default()
		};
		let reading_session = reading_session::Entity::insert(active_model)
			.on_conflict(on_conflict)
			.exec(ctx.conn.as_ref())
			.await?;
		tracing::trace!(?reading_session, "Upserted active reading session");
	}

	let (content_type, image_buffer) =
		get_page_async(PathBuf::from(book.path), page, &ctx.config).await?;
	handle_opds_image_response(content_type, image_buffer)
}

/// A handler for GET /opds/v1.2/books/{id}/file/{filename}, returns the book
async fn download_book(
	Path(OPDSURLParams {
		params: OPDSFilenameURLParams { id, .. },
		..
	}): Path<OPDSURLParams<OPDSFilenameURLParams>>,
	State(ctx): State<AppState>,
	Extension(req): Extension<AuthContext>,
) -> APIResult<NamedFile> {
	let user = req
		.user_and_enforce_permissions(&[UserPermission::DownloadFile])
		.map_err(|_| {
			tracing::error!("User does not have permission to download file");
			APIError::forbidden_discreet()
		})?;

	let book = media::Entity::find_for_user(&user)
		.filter(media::Column::Id.eq(id.clone()))
		.into_model::<media::MediaIdentSelect>()
		.one(ctx.conn.as_ref())
		.await?
		.ok_or(APIError::NotFound("Book not found".to_string()))?;

	Ok(NamedFile::open(book.path.clone()).await?)
}

use axum::{
	extract::{Path, Query, State},
	middleware,
	routing::get,
	Extension, Router,
};
use prisma_client_rust::chrono;
use prisma_client_rust::or;
use serde::{Deserialize, Serialize};
use stump_core::{
	db::{entity::UserPermission, query::pagination::PageQuery},
	filesystem::{
		get_page_async,
		image::{GenericImageProcessor, ImageProcessor, ImageProcessorOptions},
		ContentType,
	},
	opds::v1_2::{
		entry::{IntoOPDSEntry, OPDSEntryBuilder, OpdsEntry},
		feed::{
			OPDSFeedBuilder, OPDSFeedBuilderPageParams, OPDSFeedBuilderParams, OpdsFeed,
		},
		link::{OpdsLink, OpdsLinkRel, OpdsLinkType},
		opensearch::OpdsOpenSearch,
	},
	prisma::{
		active_reading_session, library, media, series, series_metadata, user, SortOrder,
	},
};
use tracing::{debug, trace};

use crate::{
	config::state::AppState,
	errors::{APIError, APIResult},
	filter::chain_optional_iter,
	middleware::auth::{api_key_middleware, auth_middleware, RequestContext},
	routers::api::{
		filters::{
			apply_in_progress_filter_for_user, apply_media_age_restriction,
			apply_media_library_not_hidden_for_user_filter, apply_series_age_restriction,
			library_not_hidden_from_user_filter,
		},
		v1::media::thumbnails::get_media_thumbnail_by_id,
	},
	utils::http::{ImageResponse, NamedFile, Xml},
};

pub(crate) fn mount(app_state: AppState) -> Router<AppState> {
	let primary_router = Router::new()
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

fn catalog_url(req_ctx: &RequestContext, path: &str) -> String {
	if let Some(api_key) = req_ctx.api_key() {
		format!("/opds/{}/v1.2/{}", api_key, path)
	} else {
		format!("/opds/v1.2/{}", path)
	}
}

fn service_url(req_ctx: &RequestContext) -> String {
	if let Some(api_key) = req_ctx.api_key() {
		format!("/opds/{}/v1.2", api_key)
	} else {
		"/opds/v1.2".to_string()
	}
}

async fn catalog(Extension(req): Extension<RequestContext>) -> APIResult<Xml> {
	let entries = vec![
		OpdsEntry::new(
			"keepReading".to_string(),
			chrono::Utc::now().into(),
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
			chrono::Utc::now().into(),
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
			chrono::Utc::now().into(),
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
			chrono::Utc::now().into(),
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

async fn search_description(Extension(req): Extension<RequestContext>) -> APIResult<Xml> {
	Ok(OpdsOpenSearch::new(Some(service_url(&req)))
		.build()
		.map(Xml)?)
}

async fn keep_reading(
	State(ctx): State<AppState>,
	Extension(req): Extension<RequestContext>,
) -> APIResult<Xml> {
	let db = &ctx.db;

	let user_id = req.id();
	let in_progress_filter = vec![apply_in_progress_filter_for_user(user_id)];

	let media = db
		.media()
		.find_many(vec![media::active_user_reading_sessions::some(
			in_progress_filter.clone(),
		)])
		.with(media::active_user_reading_sessions::fetch(
			in_progress_filter,
		))
		.order_by(media::name::order(SortOrder::Asc))
		.exec()
		.await?;

	let books_in_progress = media.into_iter().filter(|m| {
		match m
			.active_user_reading_sessions()
			.ok()
			.and_then(|sessions| sessions.first())
		{
			Some(session) if session.epubcfi.is_some() => session
				.percentage_completed
				.is_some_and(|value| value < 1.0),
			Some(session) if session.page.is_some() => {
				session.page.unwrap_or(1) < m.pages
			},
			_ => false,
		}
	});

	let entries = books_in_progress
		.into_iter()
		.map(|m| OPDSEntryBuilder::<media::Data>::new(m, req.api_key()).into_opds_entry())
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
	Extension(req): Extension<RequestContext>,
) -> APIResult<Xml> {
	let db = &ctx.db;

	let user = req.user();
	let libraries = db
		.library()
		.find_many(chain_optional_iter(
			[library_not_hidden_from_user_filter(user)],
			[search.as_ref().map(|q| library::name::contains(q.clone()))],
		))
		.order_by(library::name::order(SortOrder::Asc))
		.exec()
		.await?;
	let entries = libraries
		.into_iter()
		.map(|l| {
			OPDSEntryBuilder::<library::Data>::new(l, req.api_key()).into_opds_entry()
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
	pagination: Query<PageQuery>,
	Extension(req): Extension<RequestContext>,
) -> APIResult<Xml> {
	let db = &ctx.db;

	let library_id = id.clone();
	let page = pagination.page.unwrap_or(0);
	let (skip, take) = pagination_bounds(page.into(), 20);

	let user = req.user();
	let age_restrictions = user
		.age_restriction
		.as_ref()
		.map(|ar| apply_series_age_restriction(ar.age, ar.restrict_on_unset));

	debug!(skip, take, page, library_id, "opds get_library_by_id");

	let tx_result = db
		._transaction()
		.run(|client| async move {
			let library = client
				.library()
				.find_unique(library::id::equals(id.clone()))
				.with(
					library::series::fetch(chain_optional_iter(
						[],
						[age_restrictions.clone()],
					))
					.skip(skip)
					.take(take),
				)
				.exec()
				.await?;

			client
				.series()
				.count(chain_optional_iter(
					[series::library_id::equals(Some(id.clone()))],
					[age_restrictions],
				))
				.exec()
				.await
				.map(|count| (library, Some(count)))
		})
		.await?;
	trace!(result = ?tx_result, "opds get_library_by_id transaction");

	if let (Some(library), Some(library_series_count)) = tx_result {
		let library_series = library.series().unwrap_or(&Vec::new()).to_owned();
		debug!(
			page,
			series_in_page = library_series.len(),
			library_series_count,
			"Fetched library with series"
		);

		let entries = library_series
			.into_iter()
			.map(|s| {
				OPDSEntryBuilder::<series::Data>::new(s, req.api_key()).into_opds_entry()
			})
			.collect::<Vec<OpdsEntry>>();

		let feed =
			OPDSFeedBuilder::new(req.api_key()).paginated(OPDSFeedBuilderParams {
				id: library.id.clone(),
				title: library.name.clone(),
				entries,
				href_postfix: format!("libraries/{}", &library.id),
				page_params: Some(OPDSFeedBuilderPageParams {
					page: page.into(),
					count: library_series_count,
				}),
				search: None,
			})?;
		Ok(Xml(feed.build()?))
	} else {
		Err(APIError::NotFound(format!(
			"Library {library_id} not found"
		)))
	}
}

// FIXME: Based on testing with Panels, it seems like pagination isn't an expected default when
// a search is present? This feels both odd but understandable to support an "at a glance" view,
// but I feel like it should still support pagination...

/// A handler for GET /opds/v1.2/series, accepts a `page` URL param. Note: OPDS
/// pagination is zero-indexed.
async fn get_series(
	State(ctx): State<AppState>,
	Query(pagination): Query<PageQuery>,
	Query(OPDSSearchQuery { search }): Query<OPDSSearchQuery>,
	Extension(req): Extension<RequestContext>,
) -> APIResult<Xml> {
	let db = &ctx.db;

	let page = pagination.page.unwrap_or(0);
	let (skip, take) = pagination_bounds(page.into(), 20);

	let user = req.user();
	let age_restrictions = user
		.age_restriction
		.as_ref()
		.map(|ar| apply_series_age_restriction(ar.age, ar.restrict_on_unset));

	let search_clone = search.clone();
	let (series, count) = db
		._transaction()
		.run(|client| async move {
			let series = client
				.series()
				.find_many(chain_optional_iter(
					[],
					[
						age_restrictions.clone(),
						search_clone.map(|q| {
							or![
								series::name::contains(q.clone()),
								series::metadata::is(vec![
									series_metadata::title::contains(q),
								])
							]
						}),
					],
				))
				.skip(skip)
				.take(take)
				.order_by(series::name::order(SortOrder::Asc))
				.exec()
				.await?;

			client
				.series()
				.count(chain_optional_iter([], [age_restrictions]))
				.exec()
				.await
				.map(|count| (series, count))
		})
		.await?;

	let entries = series
		.into_iter()
		.map(|s| {
			OPDSEntryBuilder::<series::Data>::new(s, req.api_key()).into_opds_entry()
		})
		.collect::<Vec<OpdsEntry>>();

	let feed = OPDSFeedBuilder::new(req.api_key()).paginated(OPDSFeedBuilderParams {
		id: "allSeries".to_string(),
		title: "All Series".to_string(),
		entries,
		href_postfix: "series".to_string(),
		page_params: Some(OPDSFeedBuilderPageParams {
			page: page.into(),
			count,
		}),
		search,
	})?;

	Ok(Xml(feed.build()?))
}

async fn get_latest_series(
	State(ctx): State<AppState>,
	pagination: Query<PageQuery>,
	Extension(req): Extension<RequestContext>,
) -> APIResult<Xml> {
	let db = &ctx.db;

	let page = pagination.page.unwrap_or(0);
	let (skip, take) = pagination_bounds(page.into(), 20);

	let user = req.user();
	let age_restrictions = user
		.age_restriction
		.as_ref()
		.map(|ar| apply_series_age_restriction(ar.age, ar.restrict_on_unset));

	let (series, count) = db
		._transaction()
		.run(|client| async move {
			let series = client
				.series()
				.find_many(chain_optional_iter([], [age_restrictions.clone()]))
				.order_by(series::updated_at::order(SortOrder::Desc))
				.skip(skip)
				.take(take)
				.exec()
				.await?;

			client
				.series()
				.count(chain_optional_iter([], [age_restrictions]))
				.exec()
				.await
				.map(|count| (series, count))
		})
		.await?;

	let entries = series
		.into_iter()
		.map(|s| {
			OPDSEntryBuilder::<series::Data>::new(s, req.api_key()).into_opds_entry()
		})
		.collect::<Vec<OpdsEntry>>();

	let feed = OPDSFeedBuilder::new(req.api_key()).paginated(OPDSFeedBuilderParams {
		id: "latestSeries".to_string(),
		title: "Latest Series".to_string(),
		entries,
		href_postfix: "series/latest".to_string(),
		page_params: Some(OPDSFeedBuilderPageParams {
			page: page.into(),
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
	pagination: Query<PageQuery>,
	Extension(req): Extension<RequestContext>,
) -> APIResult<Xml> {
	let db = &ctx.db;

	let series_id = id.clone();
	let page = pagination.page.unwrap_or(0);
	let (skip, take) = pagination_bounds(page.into(), 20);
	let user = req.user();
	let age_restrictions = user
		.age_restriction
		.as_ref()
		.map(|ar| apply_series_age_restriction(ar.age, ar.restrict_on_unset));

	let tx_result = db
		._transaction()
		.run(|client| async move {
			let series = db
				.series()
				.find_first(chain_optional_iter(
					[series::id::equals(id.clone())],
					[age_restrictions.clone()],
				))
				.with(
					series::media::fetch(vec![])
						.skip(skip)
						.take(take)
						.order_by(media::name::order(SortOrder::Asc)),
				)
				.exec()
				.await?;

			client
				.media()
				.count(vec![
					media::series_id::equals(Some(id.clone())),
					media::series::is(chain_optional_iter(
						[series::id::equals(id.clone())],
						[age_restrictions],
					)),
				])
				.exec()
				.await
				.map(|count| (series, Some(count)))
		})
		.await?;

	if let (Some(series), Some(series_book_count)) = tx_result {
		let series_media = series.media().unwrap_or(&Vec::new()).to_owned();
		let entries = series_media
			.into_iter()
			.map(|m| {
				OPDSEntryBuilder::<media::Data>::new(m, req.api_key()).into_opds_entry()
			})
			.collect();

		let feed =
			OPDSFeedBuilder::new(req.api_key()).paginated(OPDSFeedBuilderParams {
				id: series.id.clone(),
				title: series.name.clone(),
				entries,
				href_postfix: format!("series/{}", &series.id),
				page_params: Some(OPDSFeedBuilderPageParams {
					page: page.into(),
					count: series_book_count,
				}),
				search: None,
			})?;
		Ok(Xml(feed.build()?))
	} else {
		Err(APIError::NotFound(format!("Series {series_id} not found")))
	}
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
		let jpeg_buffer = GenericImageProcessor::generate(
			&image_buffer,
			ImageProcessorOptions::jpeg(),
		)?;
		Ok(ImageResponse::new(ContentType::JPEG, jpeg_buffer))
	} else {
		tracing::warn!(
			?content_type,
			"Encountered image which does not conform to legacy OPDS image requirements"
		);
		Ok(ImageResponse::new(content_type, image_buffer))
	}
}

/// A handler for GET /opds/v1.2/books/{id}/thumbnail, returns the thumbnail
async fn get_book_thumbnail(
	Path(OPDSURLParams {
		params: OPDSIDURLParams { id },
		..
	}): Path<OPDSURLParams<OPDSIDURLParams>>,
	State(ctx): State<AppState>,
	Extension(req): Extension<RequestContext>,
) -> APIResult<ImageResponse> {
	let (content_type, image_buffer) =
		get_media_thumbnail_by_id(id, &ctx.db, req.user(), &ctx.config).await?;

	handle_opds_image_response(content_type, image_buffer)
}

/// A handler for GET /opds/v1.2/books/{id}/page/{page}, returns the page
async fn get_book_page(
	Path(OPDSURLParams {
		params: OPDSPageURLParams { id, page },
		..
	}): Path<OPDSURLParams<OPDSPageURLParams>>,
	State(ctx): State<AppState>,
	pagination: Query<PageQuery>,
	Extension(req): Extension<RequestContext>,
) -> APIResult<ImageResponse> {
	let client = &ctx.db;

	let user = req.user();
	let age_restrictions = user
		.age_restriction
		.as_ref()
		.map(|ar| apply_media_age_restriction(ar.age, ar.restrict_on_unset));

	// OPDS defaults to zero-indexed pages, I don't even think it allows the
	// zero_based query param to be set.
	let zero_based = pagination.zero_based.unwrap_or(true);
	let mut correct_page = page;
	if zero_based {
		correct_page = page + 1;
	}

	let book = client
		.media()
		.find_first(chain_optional_iter(
			[media::id::equals(id.clone())]
				.into_iter()
				.chain(apply_media_library_not_hidden_for_user_filter(user))
				.collect::<Vec<_>>(),
			[age_restrictions],
		))
		.exec()
		.await?
		.ok_or(APIError::NotFound(String::from("Book not found")))?;
	let is_completed = book.pages == correct_page;

	if is_completed {
		let deleted_session = client
			.active_reading_session()
			.delete(active_reading_session::user_id_media_id(
				user.id.clone(),
				id.clone(),
			))
			.exec()
			.await
			.ok();
		tracing::trace!(?deleted_session, "Deleted active reading session");

		let finished_session = client
			.finished_reading_session()
			.create(
				deleted_session.map(|s| s.started_at).unwrap_or_default(),
				media::id::equals(id.clone()),
				user::id::equals(user.id.clone()),
				vec![],
			)
			.exec()
			.await?;
		tracing::trace!(?finished_session, "Created finished reading session");
	} else {
		client
			.active_reading_session()
			.upsert(
				active_reading_session::user_id_media_id(user.id.clone(), id.clone()),
				active_reading_session::create(
					media::id::equals(id.clone()),
					user::id::equals(user.id.clone()),
					vec![active_reading_session::page::set(Some(correct_page))],
				),
				vec![active_reading_session::page::set(Some(correct_page))],
			)
			.exec()
			.await?;
	}

	let (content_type, image_buffer) =
		get_page_async(book.path.as_str(), correct_page, &ctx.config).await?;
	handle_opds_image_response(content_type, image_buffer)
}

/// A handler for GET /opds/v1.2/books/{id}/file/{filename}, returns the book
async fn download_book(
	Path(OPDSURLParams {
		params: OPDSFilenameURLParams { id, filename },
		..
	}): Path<OPDSURLParams<OPDSFilenameURLParams>>,
	State(ctx): State<AppState>,
	Extension(req): Extension<RequestContext>,
) -> APIResult<NamedFile> {
	let db = &ctx.db;

	let user = req.user_and_enforce_permissions(&[UserPermission::DownloadFile])?;
	let age_restrictions = user
		.age_restriction
		.as_ref()
		.map(|ar| apply_media_age_restriction(ar.age, ar.restrict_on_unset));

	trace!(?id, ?filename, "download_book");

	let book = db
		.media()
		.find_first(chain_optional_iter(
			[media::id::equals(id.clone())],
			[age_restrictions],
		))
		.exec()
		.await?
		.ok_or(APIError::NotFound(String::from("Book not found")))?;

	Ok(NamedFile::open(book.path.clone()).await?)
}

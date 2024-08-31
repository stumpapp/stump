use axum::{
	extract::{Path, Query, State},
	middleware,
	routing::get,
	Extension, Router,
};
use prisma_client_rust::{chrono, Direction};
use stump_core::{
	db::{entity::UserPermission, query::pagination::PageQuery},
	filesystem::{
		get_page_async,
		image::{GenericImageProcessor, ImageProcessor, ImageProcessorOptions},
		ContentType,
	},
	opds::v1_2::{
		entry::OpdsEntry,
		feed::OpdsFeed,
		link::{OpdsLink, OpdsLinkRel, OpdsLinkType},
	},
	prisma::{active_reading_session, library, media, series, user},
};
use tracing::{debug, trace};

use crate::{
	config::state::AppState,
	errors::{APIError, APIResult},
	filter::chain_optional_iter,
	middleware::auth::{auth_middleware, RequestContext},
	routers::api::v1::{
		library::library_not_hidden_from_user_filter,
		media::{
			apply_media_library_not_hidden_for_user_filter, get_media_thumbnail_by_id,
		},
	},
	utils::http::{ImageResponse, NamedFile, Xml},
};

use crate::routers::api::v1::{
	media::{apply_in_progress_filter_for_user, apply_media_age_restriction},
	series::apply_series_age_restriction,
};

pub(crate) fn mount(app_state: AppState) -> Router<AppState> {
	Router::new()
		.nest(
			"/v1.2",
			Router::new()
				.route("/catalog", get(catalog))
				.route("/keep-reading", get(keep_reading))
				.nest(
					"/libraries",
					Router::new()
						.route("/", get(get_libraries))
						.route("/:id", get(get_library_by_id)),
				)
				.nest(
					"/series",
					Router::new()
						.route("/", get(get_series))
						.route("/latest", get(get_latest_series))
						.route("/:id", get(get_series_by_id)),
				)
				.nest(
					"/books/:id",
					Router::new()
						.route("/thumbnail", get(get_book_thumbnail))
						.route("/pages/:page", get(get_book_page))
						.route("/file/:filename", get(download_book)),
				),
		)
		.layer(middleware::from_fn_with_state(app_state, auth_middleware))
}

fn pagination_bounds(page: i64, page_size: i64) -> (i64, i64) {
	let skip = page * page_size;
	(skip, page_size)
}

async fn catalog() -> APIResult<Xml> {
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
				href: String::from("/opds/v1.2/keep-reading"),
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
				href: String::from("/opds/v1.2/series"),
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
				href: String::from("/opds/v1.2/series/latest"),
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
				href: String::from("/opds/v1.2/libraries"),
			}]),
			None,
		),
		// OpdsEntry::new(
		// 	"allCollections".to_string(),
		// 	chrono::Utc::now().into(),
		// 	"All collections".to_string(),
		// 	Some(String::from("Browse by collection")),
		// 	None,
		// 	Some(vec![OpdsLink {
		// 		link_type: OpdsLinkType::Navigation,
		// 		rel: OpdsLinkRel::Subsection,
		// 		href: String::from("/opds/v1.2/collections"),
		// 	}]),
		// 	None,
		// ),
		// OpdsEntry::new(
		// 	"allReadLists".to_string(),
		// 	chrono::Utc::now().into(),
		// 	"All read lists".to_string(),
		// 	Some(String::from("Browse by read list")),
		// 	None,
		// 	Some(vec![OpdsLink {
		// 		link_type: OpdsLinkType::Navigation,
		// 		rel: OpdsLinkRel::Subsection,
		// 		href: String::from("/opds/v1.2/readlists"),
		// 	}]),
		// 	None,
		// ),
		// TODO: more?
		// TODO: get user stored searches, so they don't have to redo them over and over?
		// e.g. /opds/v1.2/series?search={searchTerms}, /opds/v1.2/libraries?search={searchTerms}, etc.
	];

	let links = vec![
		OpdsLink {
			link_type: OpdsLinkType::Navigation,
			rel: OpdsLinkRel::ItSelf,
			href: String::from("/opds/v1.2/catalog"),
		},
		OpdsLink {
			link_type: OpdsLinkType::Navigation,
			rel: OpdsLinkRel::Start,
			href: String::from("/opds/v1.2/catalog"),
		},
		// OpdsLink {
		// 	link_type: OpdsLinkType::Search,
		// 	rel: OpdsLinkRel::Search,
		// 	href: String::from("/opds/v1.2/search"),
		// },
	];

	let feed = OpdsFeed::new(
		"root".to_string(),
		"Stump OPDS catalog".to_string(),
		Some(links),
		entries,
	);

	Ok(Xml(feed.build()?))
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
		.order_by(media::name::order(Direction::Asc))
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
				.map(|value| value < 1.0)
				.unwrap_or(false),
			Some(session) if session.page.is_some() => {
				session.page.unwrap_or(1) < m.pages
			},
			_ => false,
		}
	});

	let entries = books_in_progress.into_iter().map(OpdsEntry::from).collect();

	let feed = OpdsFeed::new(
		"keepReading".to_string(),
		"Keep Reading".to_string(),
		Some(vec![
			OpdsLink {
				link_type: OpdsLinkType::Navigation,
				rel: OpdsLinkRel::ItSelf,
				href: String::from("/opds/v1.2/keep-reading"),
			},
			OpdsLink {
				link_type: OpdsLinkType::Navigation,
				rel: OpdsLinkRel::Start,
				href: String::from("/opds/v1.2/catalog"),
			},
		]),
		entries,
	);

	Ok(Xml(feed.build()?))
}

// TODO: age restrictions
async fn get_libraries(
	State(ctx): State<AppState>,
	Extension(req): Extension<RequestContext>,
) -> APIResult<Xml> {
	let db = &ctx.db;

	let user = req.user();
	let libraries = db
		.library()
		.find_many(vec![library_not_hidden_from_user_filter(user)])
		.exec()
		.await?;
	let entries = libraries.into_iter().map(OpdsEntry::from).collect();

	let feed = OpdsFeed::new(
		"allLibraries".to_string(),
		"All libraries".to_string(),
		Some(vec![
			OpdsLink {
				link_type: OpdsLinkType::Navigation,
				rel: OpdsLinkRel::ItSelf,
				href: String::from("/opds/v1.2/libraries"),
			},
			OpdsLink {
				link_type: OpdsLinkType::Navigation,
				rel: OpdsLinkRel::Start,
				href: String::from("/opds/v1.2/catalog"),
			},
		]),
		entries,
	);

	Ok(Xml(feed.build()?))
}

async fn get_library_by_id(
	State(ctx): State<AppState>,
	Path(id): Path<String>,
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
		Ok(Xml(OpdsFeed::paginated(
			library.id.as_str(),
			library.name.as_str(),
			format!("libraries/{}", &library.id).as_str(),
			library_series,
			page.into(),
			library_series_count,
		)
		.build()?))
	} else {
		Err(APIError::NotFound(format!(
			"Library {} not found",
			library_id
		)))
	}
}

/// A handler for GET /opds/v1.2/series, accepts a `page` URL param. Note: OPDS
/// pagination is zero-indexed.
async fn get_series(
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

	Ok(Xml(OpdsFeed::paginated(
		"allSeries",
		"All Series",
		"series",
		series,
		page.into(),
		count,
	)
	.build()?))
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
				.order_by(series::updated_at::order(Direction::Desc))
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

	Ok(Xml(OpdsFeed::paginated(
		"latestSeries",
		"Latest Series",
		"series/latest",
		series,
		page.into(),
		count,
	)
	.build()?))
}

async fn get_series_by_id(
	Path(id): Path<String>,
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
						.order_by(media::name::order(Direction::Asc)),
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
		Ok(Xml(OpdsFeed::paginated(
			series.id.as_str(),
			series.name.as_str(),
			format!("series/{}", &series.id).as_str(),
			series.media().unwrap_or(&Vec::new()).to_owned(),
			page.into(),
			series_book_count,
		)
		.build()?))
	} else {
		Err(APIError::NotFound(format!(
			"Series {} not found",
			series_id
		)))
	}
}

// TODO: support something like `STRICT_OPDS` to enforce OPDS compliance conditionally
fn handle_opds_image_response(
	content_type: ContentType,
	image_buffer: Vec<u8>,
) -> APIResult<ImageResponse> {
	if content_type.is_opds_legacy_image() {
		trace!("OPDS legacy image detected, returning as-is");
		Ok(ImageResponse::new(content_type, image_buffer))
	} else {
		tracing::warn!(
			?content_type,
			"Unsupported image for OPDS detected, converting to JPEG"
		);
		let jpeg_buffer = GenericImageProcessor::generate(
			&image_buffer,
			ImageProcessorOptions::jpeg(),
		)?;
		Ok(ImageResponse::new(ContentType::JPEG, jpeg_buffer))
	}
}

/// A handler for GET /opds/v1.2/books/{id}/thumbnail, returns the thumbnail
async fn get_book_thumbnail(
	Path(id): Path<String>,
	State(ctx): State<AppState>,
	Extension(req): Extension<RequestContext>,
) -> APIResult<ImageResponse> {
	let (content_type, image_buffer) =
		get_media_thumbnail_by_id(id, &ctx.db, req.user(), &ctx.config).await?;

	handle_opds_image_response(content_type, image_buffer)
}

/// A handler for GET /opds/v1.2/books/{id}/page/{page}, returns the page
async fn get_book_page(
	Path((id, page)): Path<(String, i32)>,
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
				(
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
	Path((id, filename)): Path<(String, String)>,
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

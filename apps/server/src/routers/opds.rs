use axum::{
	extract::{Path, Query, State},
	middleware::from_extractor_with_state,
	routing::get,
	Router,
};
use axum_sessions::extractors::ReadableSession;
use prisma_client_rust::chrono;
use stump_core::{
	db::{query::pagination::PageQuery, PrismaCountTrait},
	filesystem::{
		image::{GenericImageProcessor, ImageProcessor, ImageProcessorOptions},
		media::get_page,
		ContentType,
	},
	opds::{
		entry::OpdsEntry,
		feed::OpdsFeed,
		link::{OpdsLink, OpdsLinkRel, OpdsLinkType},
	},
	prisma::{library, media, series, SortOrder},
};
use tracing::{debug, trace, warn};

use crate::{
	config::state::AppState,
	errors::{ApiError, ApiResult},
	middleware::auth::Auth,
	utils::{
		get_session_user,
		http::{ImageResponse, NamedFile, Xml},
	},
};

use super::api::v1::media::apply_in_progress_filter_for_user;

pub(crate) fn mount(app_state: AppState) -> Router<AppState> {
	Router::new()
		.nest(
			"/opds/v1.2",
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
		.layer(from_extractor_with_state::<Auth, AppState>(app_state))
}

fn pagination_bounds(page: i64, page_size: i64) -> (i64, i64) {
	let skip = page * page_size;
	(skip, page_size)
}

// TODO auth middleware....
async fn catalog() -> ApiResult<Xml> {
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
	session: ReadableSession,
) -> ApiResult<Xml> {
	let db = ctx.get_db();

	let user_id = get_session_user(&session)?.id;
	let read_progress_conditions = vec![apply_in_progress_filter_for_user(user_id)];

	let media = db
		.media()
		.find_many(vec![media::read_progresses::some(
			read_progress_conditions.clone(),
		)])
		.with(media::read_progresses::fetch(read_progress_conditions))
		.order_by(media::name::order(SortOrder::Asc))
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
					// TODO: check/test this logic
					!progress.is_completed
						|| progress
							.percentage_completed
							.map(|value| value < 1.0)
							.unwrap_or(false)
				} else {
					progress.page < m.pages
				}
			},
			_ => false,
		});

	let entries: Vec<OpdsEntry> = media.into_iter().map(OpdsEntry::from).collect();

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

async fn get_libraries(State(ctx): State<AppState>) -> ApiResult<Xml> {
	let db = ctx.get_db();

	let libraries = db.library().find_many(vec![]).exec().await?;
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
) -> ApiResult<Xml> {
	let db = ctx.get_db();

	let library_id = id.clone();
	let page = pagination.page.unwrap_or(0);
	let (skip, take) = pagination_bounds(page.into(), 20);
	debug!(skip, take, page, library_id, "opds get_library_by_id");

	let tx_result = db
		._transaction()
		.run(|client| async move {
			let library = client
				.library()
				.find_unique(library::id::equals(id.clone()))
				.with(library::series::fetch(vec![]).skip(skip).take(take))
				.exec()
				.await?;

			// FIXME: PCR doesn't support relation counts yet!
			client
				.series()
				.count(vec![series::library_id::equals(Some(id.clone()))])
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
		Err(ApiError::NotFound(format!(
			"Library {} not found",
			library_id
		)))
	}
}

/// A handler for GET /opds/v1.2/series, accepts a `page` URL param. Note: OPDS
/// pagination is zero-indexed.
async fn get_series(
	pagination: Query<PageQuery>,
	State(ctx): State<AppState>,
) -> ApiResult<Xml> {
	let db = ctx.get_db();

	let page = pagination.page.unwrap_or(0);
	let (skip, take) = pagination_bounds(page.into(), 20);

	let (series, count) = db
		._transaction()
		.run(|client| async move {
			let series = client
				.series()
				.find_many(vec![])
				.skip(skip)
				.take(take)
				.exec()
				.await?;

			client
				.series()
				.count(vec![])
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
	pagination: Query<PageQuery>,
	State(ctx): State<AppState>,
) -> ApiResult<Xml> {
	let db = ctx.get_db();

	let page = pagination.page.unwrap_or(0);
	let (skip, take) = pagination_bounds(page.into(), 20);

	let (series, count) = db
		._transaction()
		.run(|client| async move {
			let series = client
				.series()
				.find_many(vec![])
				.order_by(series::updated_at::order(SortOrder::Desc))
				.skip(skip)
				.take(take)
				.exec()
				.await?;

			client
				.series()
				.count(vec![])
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
	pagination: Query<PageQuery>,
	State(ctx): State<AppState>,
) -> ApiResult<Xml> {
	let db = ctx.get_db();

	let series_id = id.clone();
	let page = pagination.page.unwrap_or(0);
	let (skip, take) = pagination_bounds(page.into(), 20);

	let tx_result = db
		._transaction()
		.run(|client| async move {
			let series = db
				.series()
				.find_unique(series::id::equals(id.clone()))
				.with(
					series::media::fetch(vec![])
						.skip(skip)
						.take(take)
						.order_by(media::name::order(SortOrder::Asc)),
				)
				.exec()
				.await?;

			// FIXME: PCR doesn't support relation counts yet!
			// let series_media_count = client
			// 	.media()
			// 	.count(vec![media::series_id::equals(Some(id.clone()))])
			// 	.exec()
			// 	.await
			// .map(|count| (series, Some(count)))
			client
				.media_in_series_count(id)
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
		Err(ApiError::NotFound(format!(
			"Series {} not found",
			series_id
		)))
	}
}

fn handle_opds_image_response(
	content_type: ContentType,
	image_buffer: Vec<u8>,
) -> ApiResult<ImageResponse> {
	if content_type.is_opds_legacy_image() {
		trace!("OPDS legacy image detected, returning as-is");
		Ok(ImageResponse::new(content_type, image_buffer))
	} else {
		warn!(
			?content_type,
			"Unsupported image for OPDS detected, converting to JPEG"
		);
		// let jpeg_buffer = image::jpeg_from_bytes(&image_buffer)?;
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
) -> ApiResult<ImageResponse> {
	let db = ctx.get_db();

	let result = db
		.media()
		.find_unique(media::id::equals(id.clone()))
		.exec()
		.await?;

	if let Some(book) = result {
		let (content_type, image_buffer) = get_page(book.path.as_str(), 1)?;
		handle_opds_image_response(content_type, image_buffer)
	} else {
		Err(ApiError::NotFound(format!(
			"Media with id {} not found",
			id
		)))
	}
}

/// A handler for GET /opds/v1.2/books/{id}/page/{page}, returns the page
async fn get_book_page(
	Path((id, page)): Path<(String, i32)>,
	State(ctx): State<AppState>,
	pagination: Query<PageQuery>,
) -> ApiResult<ImageResponse> {
	let db = ctx.get_db();

	// OPDS defaults to zero-indexed pages, I don't even think it allows the
	// zero_based query param to be set.
	let zero_based = pagination.zero_based.unwrap_or(true);
	let result = db
		.media()
		.find_unique(media::id::equals(id.clone()))
		.exec()
		.await?;

	let mut correct_page = page;
	if zero_based {
		correct_page = page + 1;
	}

	if let Some(book) = result {
		let (content_type, image_buffer) = get_page(book.path.as_str(), correct_page)?;
		handle_opds_image_response(content_type, image_buffer)
	} else {
		Err(ApiError::NotFound(format!("Book {} not found", &id)))
	}
}

/// A handler for GET /opds/v1.2/books/{id}/file/{filename}, returns the book
async fn download_book(
	Path((id, filename)): Path<(String, String)>,
	State(ctx): State<AppState>,
) -> ApiResult<NamedFile> {
	let db = ctx.get_db();

	trace!(?id, ?filename, "download_book");

	let book = db
		.media()
		.find_unique(media::id::equals(id.clone()))
		.exec()
		.await?;

	if let Some(book) = book {
		Ok(NamedFile::open(book.path.clone()).await?)
	} else {
		Err(ApiError::NotFound(format!("Book with id {} not found", id)))
	}
}

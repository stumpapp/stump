use axum::{
	extract::{Path, Query, State},
	middleware::from_extractor_with_state,
	routing::get,
	Router,
};
use axum_sessions::extractors::ReadableSession;
use prisma_client_rust::{chrono, Direction};
use stump_core::{
	db::utils::PrismaCountTrait,
	fs::{epub, media_file},
	opds::{
		entry::OpdsEntry,
		feed::OpdsFeed,
		link::{OpdsLink, OpdsLinkRel, OpdsLinkType},
	},
	prelude::PageQuery,
	prisma::{library, media, read_progress, series},
};
use tracing::trace;

use crate::{
	config::state::AppState,
	errors::{ApiError, ApiResult},
	middleware::auth::Auth,
	utils::{
		get_session_user,
		http::{ImageResponse, NamedFile, Xml},
	},
};

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
	let take = skip + page_size;

	(skip, take)
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

	// FIXME: not sure how to go about fixing this query. I kind of need to load all the
	// media, so I know which ones are 'completed'. I think the solution here is to just create
	// a new field on read_progress called 'completed'.
	// Lol just noticed I already said that below. Guess I'll do that before next PR.
	let media = db
		.media()
		.find_many(vec![media::read_progresses::some(vec![
			read_progress::user_id::equals(user_id.clone()),
			read_progress::page::gt(0),
		])])
		.with(media::read_progresses::fetch(vec![
			read_progress::user_id::equals(user_id),
			read_progress::page::gt(0),
		]))
		.order_by(media::name::order(Direction::Asc))
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
					false
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

	let page = pagination.page.unwrap_or(0);
	let (skip, take) = pagination_bounds(page.into(), 20);

	// FIXME: PCR doesn't support relation counts yet!
	let series_count = db
		.series()
		.count(vec![series::library_id::equals(Some(id.clone()))])
		.exec()
		.await?;

	let library = db
		.library()
		.find_unique(library::id::equals(id.clone()))
		.with(library::series::fetch(vec![]).skip(skip).take(take))
		.exec()
		.await?;

	if library.is_none() {
		return Err(ApiError::NotFound(format!("Library {} not found", id)));
	}

	let library = library.unwrap();

	Ok(Xml(OpdsFeed::paginated(
		library.id.as_str(),
		library.name.as_str(),
		format!("libraries/{}", &library.id).as_str(),
		library.series().unwrap_or(&Vec::new()).to_owned(),
		page.into(),
		series_count,
	)
	.build()?))
}

// /// A handler for GET /opds/v1.2/series, accepts a `page` URL param. Note: OPDS
// /// pagination is zero-indexed.
async fn get_series(
	pagination: Query<PageQuery>,
	State(ctx): State<AppState>,
) -> ApiResult<Xml> {
	let db = ctx.get_db();

	let page = pagination.page.unwrap_or(0);
	let (skip, take) = pagination_bounds(page.into(), 20);

	// FIXME: like other areas throughout Stump's paginated routes, I do not love
	// that I need to make 2 queries. Hopefully this get's better as prisma client matures
	// and introduces potential other work arounds.

	let series_count = db.series().count(vec![]).exec().await?;

	let series = db
		.series()
		.find_many(vec![])
		.skip(skip)
		.take(take)
		.exec()
		.await?;

	Ok(Xml(OpdsFeed::paginated(
		"allSeries",
		"All Series",
		"series",
		series,
		page.into(),
		series_count,
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

	let series_count = db.series().count(vec![]).exec().await?;

	let series = db
		.series()
		.find_many(vec![])
		.order_by(series::updated_at::order(Direction::Desc))
		.skip(skip)
		.take(take)
		.exec()
		.await?;

	Ok(Xml(OpdsFeed::paginated(
		"latestSeries",
		"Latest Series",
		"series/latest",
		series,
		page.into(),
		series_count,
	)
	.build()?))
}

async fn get_series_by_id(
	Path(id): Path<String>,
	pagination: Query<PageQuery>,
	State(ctx): State<AppState>,
) -> ApiResult<Xml> {
	let db = ctx.get_db();

	let page = pagination.page.unwrap_or(0);
	let (skip, take) = pagination_bounds(page.into(), 20);

	// FIXME: PCR doesn't support relation counts yet!
	// let series_media_count = db
	// 	.media()
	// 	.count(vec![media::series_id::equals(Some(id.clone()))])
	// 	.exec()
	// 	.await?;

	let series_media_count = db.media_in_series_count(id.clone()).await?;

	let series = db
		.series()
		.find_unique(series::id::equals(id.clone()))
		.with(
			series::media::fetch(vec![])
				.skip(skip)
				.take(take)
				.order_by(media::name::order(Direction::Asc)),
		)
		.exec()
		.await?;

	if series.is_none() {
		return Err(ApiError::NotFound(format!("Series {} not found", id)));
	}

	let series = series.unwrap();

	Ok(Xml(OpdsFeed::paginated(
		series.id.as_str(),
		series.name.as_str(),
		format!("series/{}", &series.id).as_str(),
		series.media().unwrap_or(&Vec::new()).to_owned(),
		page.into(),
		series_media_count,
	)
	.build()?))
}

async fn get_book_thumbnail(
	Path(id): Path<String>,
	State(ctx): State<AppState>,
) -> ApiResult<ImageResponse> {
	let db = ctx.get_db();

	let book = db
		.media()
		.find_unique(media::id::equals(id.clone()))
		.exec()
		.await?;

	if book.is_none() {
		return Err(ApiError::NotFound(format!("Book {} not found", &id)));
	}

	let book = book.unwrap();

	Ok(media_file::get_page(book.path.as_str(), 1)?.into())
}

async fn get_book_page(
	Path((id, page)): Path<(String, i32)>,
	State(ctx): State<AppState>,
	pagination: Query<PageQuery>,
) -> ApiResult<ImageResponse> {
	let db = ctx.get_db();

	// OPDS defaults to zero-indexed pages, I don't even think it allows the
	// ?zero_based query param to be set.
	let zero_based = pagination.zero_based.unwrap_or(true);
	let book = db
		.media()
		.find_unique(media::id::equals(id.clone()))
		.exec()
		.await?;

	let mut correct_page = page;
	if zero_based {
		correct_page = page + 1;
	}

	if book.is_none() {
		return Err(ApiError::NotFound(format!("Book {} not found", &id)));
	}

	let book = book.unwrap();

	if book.path.ends_with(".epub") && correct_page == 1 {
		return Ok(epub::get_cover(&book.path)?.into());
	}

	Ok(media_file::get_page(book.path.as_str(), correct_page)?.into())
}

/// Download the file associated with the book.
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

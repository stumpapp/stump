use prisma_client_rust::{chrono, Direction};
use rocket::Route;

use crate::{
	db::utils::PrismaClientTrait,
	fs,
	guards::auth::Auth,
	opds::{
		self,
		entry::OpdsEntry,
		feed::OpdsFeed,
		link::{OpdsLink, OpdsLinkRel, OpdsLinkType},
		models::OpdsSeries,
		opensearch::OpdsOpenSearch,
	},
	prisma::{self, library, media, read_progress},
	types::{
		alias::{ApiResult, Context},
		errors::ApiError,
		http::{ImageResponse, XmlResponse},
	},
};

fn pagination_bounds(page: i64, page_size: i64) -> (i64, i64) {
	let skip = page * page_size;
	let take = skip + page_size;

	(skip, take)
}

/// Function to return the routes for the `/opds/v1.2` path.
pub fn opds() -> Vec<Route> {
	routes![
		catalog,
		open_search,
		keep_reading,
		libraries,
		library_by_id,
		series,
		series_latest,
		series_by_id,
		book_thumbnail,
		book_page
	]
}

/// A handler for GET /opds/v1.2/catalog. Returns an OPDS catalog as an XML document
#[get("/catalog")]
pub fn catalog(_ctx: &Context, _auth: Auth) -> ApiResult<XmlResponse> {
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
		OpdsEntry::new(
			"allCollections".to_string(),
			chrono::Utc::now().into(),
			"All collections".to_string(),
			Some(String::from("Browse by collection")),
			None,
			Some(vec![OpdsLink {
				link_type: OpdsLinkType::Navigation,
				rel: OpdsLinkRel::Subsection,
				href: String::from("/opds/v1.2/collections"),
			}]),
			None,
		),
		OpdsEntry::new(
			"allReadLists".to_string(),
			chrono::Utc::now().into(),
			"All read lists".to_string(),
			Some(String::from("Browse by read list")),
			None,
			Some(vec![OpdsLink {
				link_type: OpdsLinkType::Navigation,
				rel: OpdsLinkRel::Subsection,
				href: String::from("/opds/v1.2/readlists"),
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
			href: String::from("/opds/v1.2/catalog"),
		},
		OpdsLink {
			link_type: OpdsLinkType::Navigation,
			rel: OpdsLinkRel::Start,
			href: String::from("/opds/v1.2/catalog"),
		},
		OpdsLink {
			link_type: OpdsLinkType::Search,
			rel: OpdsLinkRel::Search,
			href: String::from("/opds/v1.2/search"),
		},
	];

	let feed = OpdsFeed::new(
		"root".to_string(),
		"Stump OPDS catalog".to_string(),
		Some(links),
		entries,
	);

	Ok(XmlResponse(feed.build()?))
}

#[get("/search")]
async fn open_search(_auth: Auth) -> ApiResult<XmlResponse> {
	Ok(XmlResponse(OpdsOpenSearch::build()?))
}

#[get("/keep-reading")]
async fn keep_reading(ctx: &Context, auth: Auth) -> ApiResult<XmlResponse> {
	let db = ctx.get_db();

	let user_id = auth.0.id.clone();

	// FIXME: not sure how to go about fixing this query. I kind of need to load all the
	// media, so I know which ones are 'completed'. I think the solution here is to just create
	// a new field on read_progress called 'completed'.
	// Lol just noticed I already said that below. Guess I'll do that before next PR.
	let media = db
		.media()
		.find_many(vec![media::read_progresses::some(vec![
			read_progress::user_id::equals(auth.0.id),
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
					return false;
				} else {
					return progress.page < m.pages;
				}
			},
			_ => false,
		});

	let entries: Vec<OpdsEntry> = media.into_iter().map(|m| OpdsEntry::from(m)).collect();

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

	Ok(XmlResponse(feed.build()?))
}

#[get("/libraries")]
async fn libraries(ctx: &Context, _auth: Auth) -> ApiResult<XmlResponse> {
	let db = ctx.get_db();

	let libraries = db.library().find_many(vec![]).exec().await?;

	let entries = libraries.into_iter().map(|l| OpdsEntry::from(l)).collect();

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

	Ok(XmlResponse(feed.build()?))
}

#[get("/libraries/<id>?<page>")]
async fn library_by_id(
	ctx: &Context,
	id: String,
	page: Option<i64>,
	_auth: Auth,
) -> ApiResult<XmlResponse> {
	let db = ctx.get_db();

	let page = page.unwrap_or(0);
	let (skip, take) = pagination_bounds(page, 20);

	let series_count = db.series_count(id.clone()).await?;

	let library = db
		.library()
		.find_unique(library::id::equals(id.clone()))
		.with(library::series::fetch(vec![]).skip(skip).take(take))
		.exec()
		.await?;

	if library.is_none() {
		return Err(ApiError::NotFound(format!("Library {} not found", id)));
	}

	Ok(XmlResponse(
		OpdsFeed::from((library.unwrap(), page, series_count)).build()?,
	))
}

/// A handler for GET /opds/v1.2/series, accepts a `page` URL param. Note: OPDS
/// pagination is zero-indexed.
#[get("/series?<page>")]
async fn series(page: Option<i64>, ctx: &Context, _auth: Auth) -> ApiResult<XmlResponse> {
	let db = ctx.get_db();

	let page = page.unwrap_or(0);
	let (skip, take) = pagination_bounds(page, 20);

	// FIXME: like other areas throughout Stump's paginated routes, I do not love
	// that I need to make 2 queries. Hopefully this get's better as prisma client matures
	// and introduces potential other work arounds.
	let series_count = db.series_count_all().await?;

	let series = db
		.series()
		.find_many(vec![])
		.skip(skip)
		.take(take)
		.exec()
		.await?;

	let feed = OpdsFeed::from(("All Series".to_string(), series, page, series_count));

	Ok(XmlResponse(feed.build()?))
}

#[get("/series/latest")]
async fn series_latest(ctx: &Context, _auth: Auth) -> ApiResult<XmlResponse> {
	let db = ctx.get_db();

	let series = db
		.series()
		.find_many(vec![])
		.order_by(prisma::series::updated_at::order(Direction::Desc))
		.exec()
		.await?;

	let entries = series
		.into_iter()
		.map(|s| opds::entry::OpdsEntry::from(s))
		.collect();

	let feed = OpdsFeed::new(
		"root".to_string(),
		"Latest Series".to_string(),
		Some(vec![
			OpdsLink {
				link_type: OpdsLinkType::Navigation,
				rel: OpdsLinkRel::ItSelf,
				href: String::from("/opds/v1.2/series/latest"),
			},
			OpdsLink {
				link_type: OpdsLinkType::Navigation,
				rel: OpdsLinkRel::Start,
				href: String::from("/opds/v1.2/catalog"),
			},
		]),
		entries,
	);

	Ok(XmlResponse(feed.build().unwrap()))
}

#[get("/series/<id>?<page>")]
async fn series_by_id(
	id: String,
	page: Option<usize>,
	ctx: &Context,
	_auth: Auth,
) -> ApiResult<XmlResponse> {
	let db = ctx.get_db();

	// page size is 20
	// take a slice of the media vector representing page
	let corrected_page = page.unwrap_or(0);
	let page_size = 20;
	let start = corrected_page * page_size;
	let end = (start + page_size) - 1;

	let series = db
		.series()
		.find_unique(prisma::series::id::equals(id.clone()))
		.with(
			prisma::series::media::fetch(vec![])
				.order_by(media::name::order(Direction::Asc)), // Note: I really wanted to be able to just paginate the query here,
			                                                // but I need to be able to determine whether or not the series has more media
			                                                // in the below logic for the OPDS feed.
			                                                // .skip(start.try_into()?)
			                                                // .take(end.try_into()?),
		)
		.exec()
		.await?;

	if series.is_none() {
		return Err(ApiError::NotFound(format!("Series {} not found", id)));
	}

	let series = series.unwrap();

	let mut media = series.media()?.to_owned();

	let mut next_page = None;

	if start > media.len() {
		media = vec![];
	} else if end < media.len() {
		next_page = Some(page.unwrap_or(0) + 1);

		media = media
			.get(start..end)
			.ok_or("Invalid page")
			.unwrap()
			.to_vec();
	}

	// // Note: this is still kinda gross but whatever
	let feed = OpdsFeed::from(OpdsSeries::from((
		(series, media),
		(page.unwrap_or(0), next_page),
	)));

	Ok(XmlResponse(feed.build()?))
}

#[get("/books/<id>/thumbnail")]
async fn book_thumbnail(
	id: String,
	ctx: &Context,
	_auth: Auth,
) -> ApiResult<ImageResponse> {
	let db = ctx.get_db();

	let book = db
		.media()
		.find_unique(media::id::equals(id.clone()))
		.exec()
		.await?;

	if let Some(b) = book {
		Ok(fs::media_file::get_page(&b.path, 1)?)
	} else {
		Err(ApiError::NotFound(format!("Book {} not found", &id)))
	}
}

// TODO: generalize the function call
// TODO: cache this? Look into this, I can send a cache-control header to the client, but not sure if I should
// also cache on server. Check my types::rocket crate
#[get("/books/<id>/pages/<page>?<zero_based>")]
async fn book_page(
	id: String,
	page: usize,
	zero_based: Option<bool>,
	ctx: &Context,
	_auth: Auth,
) -> ApiResult<ImageResponse> {
	let db = ctx.get_db();

	let book = db
		.media()
		.find_unique(media::id::equals(id.clone()))
		.exec()
		.await?;

	let mut correct_page = match zero_based {
		Some(true) => page + 1,
		_ => page,
	};

	if let Some(b) = book {
		// TODO: move this elsewhere?? Doing this to load the cover photo instead of page 1. Not ideal solution
		if b.path.ends_with(".epub") && correct_page == 1 {
			correct_page = 0;
		}

		Ok(fs::media_file::get_page(&b.path, correct_page as i32)?)
	} else {
		Err(ApiError::NotFound(format!("Book {} not found", &id)))
	}
}

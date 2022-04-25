use prisma_client_rust::{chrono, Direction};
use rocket::Route;

use crate::{
    fs,
    guards::auth::StumpAuth,
    opds::{
        self,
        entry::OpdsEntry,
        feed::OpdsFeed,
        link::{OpdsLink, OpdsLinkRel, OpdsLinkType},
    },
    prisma::{self, library, media},
    types::{
        alias::{ApiResult, State},
        errors::ApiError,
        http::{ImageResponse, XmlResponse},
        models::MediaWithProgress,
    },
};

/// Function to return the routes for the `/opds/v1.2` path.
pub fn opds() -> Vec<Route> {
    routes![
        catalog,
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
pub fn catalog(_state: &State, _auth: StumpAuth) -> ApiResult<XmlResponse> {
    let entries = vec![
        OpdsEntry::new(
            "keepReading".to_string(),
            chrono::Utc::now(),
            "Keep Reading".to_string(),
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
            chrono::Utc::now(),
            "All Series".to_string(),
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
            chrono::Utc::now(),
            "Latest Series".to_string(),
            Some(String::from("Browse latest series")),
            None,
            Some(vec![OpdsLink {
                link_type: OpdsLinkType::Navigation,
                rel: OpdsLinkRel::Subsection,
                href: String::from("/opds/v1.2/series/latest"),
            }]),
            None,
        ),
    ];

    let feed = OpdsFeed::new(
        "root".to_string(),
        "Stump OPDS catalog".to_string(),
        None,
        entries,
    );

    Ok(XmlResponse(feed.build()?))
}

#[get("/keep-reading")]
async fn keep_reading(state: &State, auth: StumpAuth) -> ApiResult<XmlResponse> {
    let db = state.get_db();

    let user_id = auth.0.id.clone();

    let media_with_progress: Vec<MediaWithProgress> = db
        .read_progress()
        .find_many(vec![prisma::read_progress::user_id::equals(user_id)])
        .with(prisma::read_progress::media::fetch())
        .exec()
        .await?
        .iter()
        .map(|rp| {
            let media = rp.media().unwrap().to_owned();

            (media, rp.to_owned()).into()
        })
        .collect();

    let entries: Vec<OpdsEntry> = media_with_progress
        .into_iter()
        .map(|m| OpdsEntry::from(m))
        .collect();

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
async fn libraries(state: &State, _auth: StumpAuth) -> ApiResult<XmlResponse> {
    let db = state.get_db();

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

#[get("/libraries/<id>")]
async fn library_by_id(state: &State, id: String, _auth: StumpAuth) -> ApiResult<XmlResponse> {
    let db = state.get_db();

    let library = db
        .library()
        .find_unique(library::id::equals(id.clone()))
        .with(library::series::fetch(vec![]))
        .exec()
        .await?;

    if library.is_none() {
        return Err(ApiError::NotFound(format!("Library {} not found", id)));
    }

    let library = library.unwrap();
    let series = library.series()?.to_owned();

    let feed = OpdsFeed::from((library, series));

    Ok(XmlResponse(feed.build()?))
}

/// A handler for GET /opds/v1.2/series
#[get("/series")]
async fn series(state: &State, _auth: StumpAuth) -> ApiResult<XmlResponse> {
    // let res = get_series(state.get_connection()).await?;

    let db = state.get_db();

    let series = db
        .series()
        .find_many(vec![])
        // .with(series::media::fetch(vec![]))
        .exec()
        .await?;

    let entries = series
        .into_iter()
        .map(|s| opds::entry::OpdsEntry::from(s))
        .collect();

    let feed = opds::feed::OpdsFeed::new(
        "root".to_string(),
        "Stump OPDS All Series".to_string(),
        Some(vec![
            OpdsLink {
                link_type: OpdsLinkType::Navigation,
                rel: OpdsLinkRel::ItSelf,
                href: String::from("/opds/v1.2/series"),
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

#[get("/series/latest")]
async fn series_latest(state: &State, _auth: StumpAuth) -> ApiResult<XmlResponse> {
    let db = state.get_db();

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

    let feed = opds::feed::OpdsFeed::new(
        "root".to_string(),
        "Stump OPDS All Series".to_string(),
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

// TODO: use pagination or something instead of manually paging the results
#[get("/series/<id>?<page>")]
async fn series_by_id(
    id: String,
    page: Option<usize>,
    state: &State,
    _auth: StumpAuth,
) -> ApiResult<XmlResponse> {
    let db = state.get_db();

    // TODO: this query needs to change. I think I might just query for series, and
    // query for media separately. This would allow me to not have to sort the media, and
    // be able to distinguish between series not found and no media in series.
    let series = db
        .series()
        .find_unique(prisma::series::id::equals(id.clone()))
        .with(prisma::series::media::fetch(vec![]))
        .exec()
        .await?;

    if series.is_none() {
        return Err(ApiError::NotFound(format!("Series {} not found", id)));
    }

    let series = series.unwrap();

    let mut media = series.media()?.to_owned();

    // TODO: figure out why I grabbed progress I absolutely don't remember lol
    // let mut media =
    //     get_user_media_with_progress(state.get_connection(), auth.0.id, Some(series.id)).await?;

    // page size is 20
    // take a slice of the media vector representing page
    let corrected_page = page.unwrap_or(0);
    let page_size = 20;
    let start = corrected_page * page_size;
    let end = (start + page_size) - 1;

    let mut next_page = None;

    if start > media.len() {
        media = vec![];
    } else if end < media.len() {
        next_page = Some(page.unwrap_or(1));

        // FIXME: DO NOT like this. This needs to be solved along with the above notes
        media.sort_by(|a, b| a.name.cmp(&b.name));

        media = media
            .get(start..end)
            .ok_or("Invalid page")
            .unwrap()
            .to_vec();
    }

    // TODO: this is kinda disgusting, maybe make it a struct?
    let payload = ((series, media), (page.unwrap_or(0), next_page));

    let feed = OpdsFeed::from(payload);

    Ok(XmlResponse(feed.build()?))
}

#[get("/books/<id>/thumbnail")]
async fn book_thumbnail(id: String, state: &State, _auth: StumpAuth) -> ApiResult<ImageResponse> {
    let db = state.get_db();

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
    state: &State,
    _auth: StumpAuth,
) -> ApiResult<ImageResponse> {
    let db = state.get_db();

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

        Ok(fs::media_file::get_page(&b.path, correct_page)?)
    } else {
        Err(ApiError::NotFound(format!("Book {} not found", &id)))
    }
}

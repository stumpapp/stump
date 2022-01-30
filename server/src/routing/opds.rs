extern crate base64;

use crate::database::queries;
use crate::database::queries::series::{
    get_lastest_series, get_series, get_series_by_id_with_media,
};
use crate::fs::media_file::get_zip_image;
use crate::opds::feed::OpdsFeed;
use crate::opds::link::{OpdsLink, OpdsLinkRel, OpdsLinkType};
use crate::types::rocket::ImageResponse;
use crate::{
    database::entities::{self, media},
    opds,
    types::rocket::XmlResponse,
    State,
};

// BASE URL: /opds/v1.2

/// A handler for GET /opds/v1.2/catalog. Returns an OPDS catalog as an XML document
#[get("/catalog")]
pub fn catalog(_db: &State) -> XmlResponse {
    // TODO: media from database
    let entries = vec![
        opds::entry::OpdsEntry::new(
            "allseries".to_string(),
            chrono::Utc::now(),
            "All Series".to_string(),
            Some(String::from("Browse by series")),
            None,
            Some(vec![OpdsLink {
                link_type: OpdsLinkType::Navigation,
                rel: OpdsLinkRel::Subsection,
                href: String::from("/opds/v1.2/series"),
            }]),
        ),
        opds::entry::OpdsEntry::new(
            "latestseries".to_string(),
            chrono::Utc::now(),
            "Latest Series".to_string(),
            Some(String::from("Browse latest series")),
            None,
            Some(vec![OpdsLink {
                link_type: OpdsLinkType::Navigation,
                rel: OpdsLinkRel::Subsection,
                href: String::from("/opds/v1.2/series/latest"),
            }]),
        ),
        // TODO: books/latest
        // TODO: libraries
    ];

    let feed = opds::feed::OpdsFeed::new(
        "root".to_string(),
        "Stump OPDS catalog".to_string(),
        entries,
    );

    XmlResponse(feed.build().unwrap())
}

/// A handler for GET /opds/v1.2/series
#[get("/series")]
pub async fn series(db: &State) -> Result<XmlResponse, String> {
    let res = get_series(db.get_connection()).await?;

    let entries = res
        .into_iter()
        .map(|s| opds::entry::OpdsEntry::from(s))
        .collect();

    let feed = opds::feed::OpdsFeed::new(
        "root".to_string(),
        "Stump OPDS All Series".to_string(),
        entries,
    );

    Ok(XmlResponse(feed.build().unwrap()))
}

#[get("/series/latest")]
pub async fn series_latest(db: &State) -> Result<XmlResponse, String> {
    let res = get_lastest_series(db.get_connection()).await?;

    let entries = res
        .into_iter()
        .map(|s| opds::entry::OpdsEntry::from(s))
        .collect();

    let feed = opds::feed::OpdsFeed::new(
        "root".to_string(),
        "Stump OPDS All Series".to_string(),
        entries,
    );

    Ok(XmlResponse(feed.build().unwrap()))
}

#[get("/series/<id>?<page>")]
pub async fn series_by_id(
    id: String,
    page: Option<usize>,
    db: &State,
) -> Result<XmlResponse, String> {
    let res = get_series_by_id_with_media(db.get_connection(), id).await?;

    if res.len() != 1 {
        return Err("Series not found".to_string());
    }

    let series_with_media: (entities::series::Model, Vec<media::Model>) = res[0].to_owned();

    // I have to do this so I can pass the page into the conversion, so the 'next' link can be
    // generated correctly
    let payload = (series_with_media, page);

    let feed = OpdsFeed::from(payload);

    Ok(XmlResponse(feed.build().unwrap()))
}

// TODO: generalize the function call to `get_image` which will internally call `get_zip_image` or `get_rar_image`
#[get("/books/<id>/thumbnail")]
pub async fn book_thumbnail(id: String, db: &State) -> Result<ImageResponse, String> {
    let book = queries::book::get_book_by_id(db.get_connection(), id).await?;

    if let Some(b) = book {
        match get_zip_image(&b.path, 1) {
            Ok(res) => Ok(res),
            Err(e) => Err(e.to_string()),
        }
    } else {
        Err("Book not found".to_string())
    }
}

// TODO: generalize the function call
// TODO: cache this? Look into this, I can send a cache-control header to the client, but not sure if I should
// also cache on server.
#[get("/books/<id>/pages/<page>")]
pub async fn book_page(id: String, page: usize, db: &State) -> Result<ImageResponse, String> {
    let book = queries::book::get_book_by_id(db.get_connection(), id).await?;

    if let Some(b) = book {
        match get_zip_image(&b.path, page) {
            Ok(res) => Ok(res),
            Err(e) => Err(e.to_string()),
        }
    } else {
        Err("Book not found".to_string())
    }
}

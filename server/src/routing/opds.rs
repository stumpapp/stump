use sea_orm::{ColumnTrait, EntityTrait, QueryFilter};
extern crate base64;

use crate::fs::media_file::get_zip_thumbnail;
use crate::opds::feed::OpdsFeed;
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
            "eqrdfa2dvaca".to_string(),
            chrono::Utc::now(),
            "Spider-Man #69".to_string(),
            None,
            Some(vec!["me".to_string()]),
            None,
        ),
        opds::entry::OpdsEntry::new(
            "dafafafadfad".to_string(),
            chrono::Utc::now(),
            "Spider-Man #420".to_string(),
            None,
            Some(vec!["me".to_string()]),
            None,
        ),
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
    let res = entities::series::Entity::find()
        .all(db.get_connection())
        .await
        .map_err(|e| e.to_string())?;

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
    let res = entities::series::Entity::find()
        .filter(entities::series::Column::Id.eq(id))
        .find_with_related(media::Entity)
        .all(db.get_connection())
        .await
        .map_err(|e| e.to_string())?;

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

// FIXME: this needs to actually return an image
#[get("/books/<id>/thumbnail")]
pub async fn book_thumbnail(id: String, db: &State) -> Result<String, String> {
    let book: Option<media::Model> = media::Entity::find()
        .filter(media::Column::Id.eq(id))
        .one(db.get_connection())
        .await
        .map_err(|e| e.to_string())?;

    if let Some(b) = book {
        let buffer = get_zip_thumbnail(&b.path).map_err(|e| e.to_string())?;
        // let encoded = base64::encode(&buffer);

        // Ok(ImageResponse()
        Ok("Ok".to_string())
    } else {
        Err("Book not found".to_string())
    }
}

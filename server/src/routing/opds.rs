use sea_orm::EntityTrait;

use crate::{database::entities, opds, types::rocket::XmlResponse, State};

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
            vec!["me".to_string()],
        ),
        opds::entry::OpdsEntry::new(
            "dafafafadfad".to_string(),
            chrono::Utc::now(),
            "Spider-Man #420".to_string(),
            None,
            vec!["me".to_string()],
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

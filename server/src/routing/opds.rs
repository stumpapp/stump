use crate::{opds, types::XmlResponse, State};

// BASE URL: /opds/v1.2

/// A handler for GET /opds/v1.2/catalog. Returns an OPDS catalog as an XML document
#[get("/catalog")]
pub fn catalog(db: &State) -> XmlResponse {
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

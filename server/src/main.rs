#[macro_use]
extern crate rocket;

mod database;
mod opds;

#[derive(Responder)]
#[response(content_type = "xml")]
struct XmlResponse(String);

#[get("/")]
fn index() -> &'static str {
    "Hello, world!"
}

#[get("/test")]
fn test() -> XmlResponse {
    let entries = vec![
        opds::entry::OpdsEntry::new(
            "eqrdfa2dvaca".to_string(),
            chrono::Utc::now(),
            "Spider-Man #69".to_string(),
            "content".to_string(),
            vec!["me".to_string()],
        ),
        opds::entry::OpdsEntry::new(
            "dafafafadfad".to_string(),
            chrono::Utc::now(),
            "Spider-Man #420".to_string(),
            "content".to_string(),
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

#[launch]
fn rocket() -> _ {
    rocket::build().mount("/", routes![index, test])
}

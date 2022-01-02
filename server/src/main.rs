use rocket::futures::executor::block_on;

#[macro_use]
extern crate rocket;

mod database;
mod fs;
mod opds;
mod routing;
mod types;

use database::Database;

pub type State = rocket::State<Database>;

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

#[launch]
fn rocket() -> _ {
    env_logger::builder()
        .filter_level(log::LevelFilter::Debug)
        .is_test(true)
        .init();

    let connection = block_on(database::connection::create_connection()).unwrap();

    let db = Database::new(connection);
    // block_on(db.run_migration_up()).unwrap();

    rocket::build()
        .manage(db)
        .mount("/", routes![index, test])
        .mount("/api", routes![routing::api::scan])
        .mount("/opds/v1.2", routes![routing::opds::catalog])
}

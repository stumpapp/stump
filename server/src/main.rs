use rocket::{fs::NamedFile, futures::executor::block_on};
use std::env;
use std::path::{Path, PathBuf};

#[macro_use]
extern crate rocket;

mod database;
mod fs;
mod opds;
mod routing;
mod types;

use database::Database;

pub type State = rocket::State<Database>;

// #[derive(Responder)]
// #[response(content_type = "xml")]
// struct XmlResponse(String);

// #[get("/")]
// fn index() -> &'static str {
//     "Welcome to Stump (name TBD)"
// }

// #[get("/test")]
// fn test()

#[get("/")]
async fn index() -> Option<NamedFile> {
    let page_directory_path = get_directory_path();
    NamedFile::open(Path::new(&page_directory_path).join("index.html"))
        .await
        .ok()
}

#[get("/<file..>")]
async fn files(file: PathBuf) -> Option<NamedFile> {
    let page_directory_path = get_directory_path();
    NamedFile::open(Path::new(&page_directory_path).join(file))
        .await
        .ok()
}

fn get_directory_path() -> String {
    format!("{}/../web/build", env!("CARGO_MANIFEST_DIR"))
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
        .mount("/", routes![index, files])
        .mount("/api", routes![routing::api::scan])
        .mount("/opds/v1.2", routes![routing::opds::catalog])
}

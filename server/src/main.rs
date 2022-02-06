use rocket::tokio::sync::broadcast::{channel, Sender};
use rocket::{fs::NamedFile, futures::executor::block_on};
use std::env;
use std::path::{Path, PathBuf};

#[macro_use]
extern crate rocket;

#[macro_use]
extern crate rocket_include_static_resources;

mod database;
mod fs;
mod logging;
mod opds;
mod routing;
mod state;
mod types;

use crate::logging::Log;
use database::Database;

use rocket_include_static_resources::{EtagIfNoneMatch, StaticContextManager, StaticResponse};

pub type State = state::State;

static_response_handler! {
    "/favicon.ico" => favicon => "favicon",
    "/favicon-16.png" => favicon_png => "favicon-png",
}

// #[get("/")]
// async fn index() -> Option<NamedFile> {
//     let page_directory_path = get_directory_path();
//     NamedFile::open(Path::new(&page_directory_path).join("index.html"))
//         .await
//         .ok()
// }

#[get("/")]
fn index(
    static_resources: &rocket::State<StaticContextManager>,
    etag_if_none_match: EtagIfNoneMatch,
) -> StaticResponse {
    static_resources.build(&etag_if_none_match, "index.html")
}

// FIXME: keeps matching annoyingly. Add prefix to this? like 'static'?
#[get("/<file..>")]
async fn files(file: PathBuf) -> Option<NamedFile> {
    let page_directory_path = get_directory_path();
    NamedFile::open(Path::new(&page_directory_path).join(file))
        .await
        .ok()
}

fn get_directory_path() -> String {
    format!("{}/static", env!("CARGO_MANIFEST_DIR"))
}

#[launch]
fn rocket() -> _ {
    env_logger::builder()
        .filter_level(log::LevelFilter::Debug)
        .is_test(true)
        .init();

    let connection = block_on(database::connection::create_connection()).unwrap();

    let db = Database::new(connection);
    block_on(db.run_migration_up()).unwrap();

    let state = state::AppState::new(db, channel::<Log>(1024).0);

    rocket::build()
        .attach(static_resources_initializer!(
            "favicon" => "static/favicon.ico",
            "favicon-png" => "static/favicon.png",
            "index.html" => "static/index.html",
        ))
        .manage(state)
        .mount("/", routes![index, favicon, favicon_png, files])
        .mount(
            "/api",
            routes![
                // top level
                routing::api::scan,
                routing::api::log_listener,
                routing::api::test_log_event,
                // library api
                routing::api::library_api::get_libraries,
                routing::api::library_api::insert_library,
                routing::api::library_api::update_library,
                routing::api::library_api::delete_library,
            ],
        )
        .mount(
            "/opds/v1.2",
            routes![
                routing::opds::catalog,
                // libraries
                routing::opds::libraries,
                routing::opds::library_by_id,
                // series
                routing::opds::series,
                routing::opds::series_latest,
                routing::opds::series_by_id,
                // books
                routing::opds::book_thumbnail,
                routing::opds::book_page
            ],
        )
}

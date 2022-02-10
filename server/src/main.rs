#[macro_use]
extern crate rocket;

use rocket_session_store::{memory::MemoryStore, SessionStore};

use rocket::tokio::sync::broadcast::channel;
use rocket::{fs::FileServer, futures::executor::block_on, response};

use std::time::Duration;

mod database;
mod fs;
mod guards;
mod logging;
mod opds;
mod routing;
mod state;
mod types;
mod utils;

use crate::{
    database::{entities::user::AuthenticatedUser, Database},
    logging::Log,
    types::rocket::UnauthorizedResponse,
};

pub type State = state::State;

#[catch(401)]
fn opds_unauthorized(_req: &rocket::Request) -> UnauthorizedResponse {
    UnauthorizedResponse {}
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

    let session_name = std::env::var("SESSION_NAME").unwrap_or_else(|_| "stump-session".into());

    // TODO: I am not sure if I like this implementation yet. I might want to use my sqlite connection
    // to manage sessions. I did not want to deep dive into creating my own fairing for this *yet*,
    // but will likely do so in the future.
    let memory_store: MemoryStore<AuthenticatedUser> = MemoryStore::default();
    let store: SessionStore<AuthenticatedUser> = SessionStore {
        store: Box::new(memory_store),
        name: session_name,
        duration: Duration::from_secs(3600 * 24 * 3),
    };

    rocket::build()
        .manage(state)
        .attach(store.fairing())
        .mount("/", FileServer::from("static/"))
        .mount(
            "/api",
            routes![
                // top level
                routing::api::scan,
                routing::api::log_listener,
                // auth
                routing::api::auth::login,
                routing::api::auth::register,
                // logs api
                routing::api::log::get_logs,
                // library api
                routing::api::library::get_libraries,
                routing::api::library::insert_library,
                routing::api::library::update_library,
                routing::api::library::delete_library,
            ],
        )
        .mount(
            "/opds/v1.2",
            routes![
                routing::opds::catalog,
                routing::opds::keep_reading,
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
        .register("/opds/v1.2", catchers![opds_unauthorized])
}

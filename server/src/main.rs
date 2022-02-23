#[macro_use]
extern crate rocket;

use redis::Client;
use rocket::fs::NamedFile;
use rocket::http::SameSite;
use rocket::tokio::sync::broadcast::channel;
use rocket::{fs::FileServer, futures::executor::block_on, http::Method};
use rocket_cors::{AllowedHeaders, AllowedOrigins};
use rocket_session_store::{memory::MemoryStore, redis::RedisStore, CookieConfig, SessionStore};
use types::dto::user::AuthenticatedUser;

use std::path::{Path, PathBuf};
use std::time::Duration;

#[cfg(debug_assertions)]
use dotenv::dotenv;

mod database;
mod fs;
mod guards;
mod logging;
mod opds;
mod routing;
mod state;
mod types;
mod utils;

use crate::{database::Database, logging::Log, types::rocket::UnauthorizedResponse};

pub type State = state::State;

#[catch(401)]
fn opds_unauthorized(_req: &rocket::Request) -> UnauthorizedResponse {
    UnauthorizedResponse {}
}
#[get("/<_..>", rank = 2)]
async fn index_fallback() -> Option<NamedFile> {
    println!("index_fallback");
    NamedFile::open(Path::new("static").join("index.html"))
        .await
        .ok()
}

fn home_dir() -> PathBuf {
    dirs::home_dir().expect("Could not find home directory")
}

fn init_env() {
    let config_dir = match std::env::var("STUMP_CONFIG_DIR") {
        Ok(val) => PathBuf::from(val),
        Err(_) => home_dir().join(".stump"),
    };

    let _ = std::fs::create_dir_all(&config_dir)
        .map_err(|e| panic!("Could not create config directory: {}", e));

    let database_url = format!(
        "sqlite:{}?mode=rwc",
        config_dir.join("stump.db").to_str().unwrap()
    );

    println!("Database URL: {}", database_url);

    std::env::set_var("DATABASE_URL", database_url);
}

#[launch]
fn rocket() -> _ {
    #[cfg(debug_assertions)]
    dotenv().ok();

    init_env();

    env_logger::builder()
        .filter_level(log::LevelFilter::Debug)
        .is_test(true)
        .init();

    let allowed_origins =
        AllowedOrigins::some_exact(&["http://localhost:3000", "http://localhost:6969"]);

    let cors = rocket_cors::CorsOptions {
        allowed_origins,
        allowed_methods: vec![Method::Get, Method::Put, Method::Post, Method::Delete]
            .into_iter()
            .map(From::from)
            .collect(),
        allowed_headers: AllowedHeaders::some(&["Authorization", "Accept"]),
        allow_credentials: true,
        ..Default::default()
    }
    .to_cors()
    .expect("Could not instantiate CORS configuration.");

    let db = block_on(Database::new());
    let state = state::AppState::new(db, channel::<Log>(1024).0);

    let session_name = std::env::var("SESSION_NAME").unwrap_or_else(|_| "stump-session".into());

    let client: Client = Client::open("redis://127.0.0.1").expect("Could not connect to redis");
    let redis_store: RedisStore<AuthenticatedUser> = RedisStore::new(client);

    // TODO: MAKE THIS THE USAGE, redis is temporary
    // let memory_store: MemoryStore<AuthenticatedUser> = MemoryStore::default();
    // TODO: https://github.com/Aurora2500/rocket-session-store/issues/1
    // Forked this temporarily to set the path
    let store: SessionStore<AuthenticatedUser> = SessionStore {
        store: Box::new(redis_store),
        name: session_name,
        duration: Duration::from_secs(3600 * 24 * 3),
        cookie: CookieConfig {
            path: Some("/".into()),
            same_site: Some(SameSite::Lax),
            secure: false,
            http_only: true,
        },
    };

    rocket::build()
        .manage(state)
        .attach(store.fairing())
        .attach(cors)
        .mount("/", FileServer::from("static/").rank(1))
        .mount("/", routes![index_fallback])
        .mount(
            "/api",
            routes![
                // top level
                routing::api::scan,
                routing::api::log_listener,
                // auth
                routing::api::auth::me,
                routing::api::auth::login,
                routing::api::auth::register,
                // logs api
                routing::api::log::get_logs,
                // library api
                routing::api::library::get_libraries,
                routing::api::library::get_library,
                routing::api::library::insert_library,
                routing::api::library::update_library,
                routing::api::library::delete_library,
                routing::api::library::scan_library,
                // series api
                routing::api::series::get_series,
                routing::api::series::get_series_by_id,
                routing::api::series::get_series_thumbnail,
                // media api
                routing::api::media::get_media,
                routing::api::media::get_media_by_id,
                routing::api::media::get_media_file,
                routing::api::media::get_media_page,
                routing::api::media::get_media_thumbnail,
                routing::api::media::update_media_progress,
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

#[macro_use]
extern crate rocket;

#[cfg(debug_assertions)]
use dotenv::dotenv;

use config::{context::Context, cors, helmet::Helmet, session};
use rocket::fs::{FileServer, NamedFile};
use std::path::Path;
use types::http::UnauthorizedResponse;

pub mod config;
pub mod fs;
pub mod guards;
pub mod opds;
pub mod prisma;
pub mod routes;
pub mod types;
pub mod utils;

#[get("/<_..>", rank = 2)]
async fn index_fallback() -> Option<NamedFile> {
    println!("index_fallback");
    NamedFile::open(Path::new("static").join("index.html"))
        .await
        .ok()
}

#[catch(401)]
fn opds_unauthorized(_req: &rocket::Request) -> UnauthorizedResponse {
    UnauthorizedResponse {}
}

#[launch]
async fn rocket() -> _ {
    #[cfg(debug_assertions)]
    dotenv().ok();

    rocket::build()
        .manage(Context::new().await)
        .attach(session::get_session_store().fairing())
        .attach(cors::get_cors())
        .attach(Helmet::default().fairing())
        .mount("/", FileServer::from("static/").rank(1))
        .mount("/", routes![index_fallback])
        .mount("/api", routes::api::api())
        .mount("/opds/v1.2", routes::opds::opds())
        .register("/opds/v1.2", catchers![opds_unauthorized])
}

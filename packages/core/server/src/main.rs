#[macro_use]
extern crate rocket;

#[cfg(debug_assertions)]
use dotenv::dotenv;

use config::{context::Context, cors, helmet::Helmet, session};
use rocket::{
	fs::{FileServer, NamedFile},
	tokio::{self, sync::mpsc::unbounded_channel},
};
use std::path::Path;
use types::{
	event::{InternalEvent, InternalTask, TaskResponder},
	http::UnauthorizedResponse,
};
use utils::event::EventManager;

pub mod config;
pub mod db;
pub mod fs;
pub mod guards;
pub mod job;
pub mod opds;
pub mod prisma;
pub mod routes;
pub mod types;
pub mod utils;

#[get("/<_..>", rank = 2)]
async fn index_fallback() -> Option<NamedFile> {
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

	// TODO: configure logging from env
	// STUMP_LOG_LEVEL maybe

	// println!(
	// 	"{:?}",
	// 	vec![
	// 		std::env::var("STUMP_CONFIG_DIR"),
	// 		std::env::var("STUMP_DATABASE_URL"),
	// 		std::env::var("STUMP_DATA_DIR"),
	// 	]
	// );

	// Channel to handle internal events
	let event_channel = unbounded_channel::<InternalEvent>();

	// Channel to handle internal tasks (usually an endpoint requesting data from the background thread below)
	let task_channel = unbounded_channel::<TaskResponder<InternalTask>>();

	// Ownership will be transferred to the background thread.
	let core_ctx = Context::new(event_channel.0.clone(), task_channel.0.clone()).await;

	// Context clone that will be managed by Rocket
	let route_ctx = core_ctx.get_ctx();

	tokio::spawn(async move {
		EventManager::new(core_ctx)
			.run(event_channel.1, task_channel.1)
			.await;
	});

	rocket::build()
		.manage(route_ctx.get_ctx())
		.attach(session::get_session_store().fairing())
		.attach(cors::get_cors())
		.attach(Helmet::default().fairing())
		.mount("/", FileServer::from("static/").rank(1))
		.mount("/", routes![index_fallback])
		.mount("/api", routes::api::api())
		.mount("/opds/v1.2", routes::opds::opds())
		.register("/opds/v1.2", catchers![opds_unauthorized])
}

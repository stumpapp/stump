#[macro_use]
extern crate rocket;

use db::migration::run_migrations;

use config::{context::Context, cors, env, helmet::Helmet, logging, session};
use rocket::{
	fs::{FileServer, NamedFile},
	tokio::{self, sync::mpsc::unbounded_channel},
};
use rocket_okapi::{
	rapidoc::{
		make_rapidoc, GeneralConfig, HideShowConfig, RapiDocConfig, Theme, UiConfig,
	},
	settings::UrlObject,
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

// TODO: figure out how to embed /static and Rocket.toml in the binary if possible
// otherwise I have to distribute a zip file which isn't TERRIBLE but I don't want to lol
pub fn static_dir() -> String {
	std::env::var("STUMP_CLIENT_DIR").unwrap_or("client".to_string())
}

#[get("/<_..>", rank = 15)]
async fn index_fallback() -> Option<NamedFile> {
	NamedFile::open(Path::new(&static_dir()).join("index.html"))
		.await
		.ok()
}

#[catch(401)]
fn opds_unauthorized(_req: &rocket::Request) -> UnauthorizedResponse {
	UnauthorizedResponse {}
}

#[launch]
async fn rocket() -> _ {
	env::Env::load().unwrap_or_else(|e| {
		log::error!("Failed to load environment variables: {:?}", e.to_string())
	});

	// I am not panic-ing here because I don't believe this should be a fatal error
	logging::init_fern().unwrap_or_else(|e| {
		log::error!("Failed to initialize logging: {:?}", e.to_string())
	});

	// Channel to handle internal events
	let event_channel = unbounded_channel::<InternalEvent>();

	// Channel to handle internal tasks (usually an endpoint requesting data from the background thread below)
	let task_channel = unbounded_channel::<TaskResponder<InternalTask>>();

	// Ownership will be transferred to the background thread.
	let core_ctx = Context::new(event_channel.0.clone(), task_channel.0.clone()).await;

	// Context clone that will be managed by Rocket
	let route_ctx = core_ctx.get_ctx();

	match run_migrations(route_ctx.get_db()).await {
		Ok(_) => {
			log::info!("Migrations ran successfully");
		},
		Err(e) => {
			panic!("Failed to run migrations: {:?}", e);
		},
	};

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
		.mount("/", FileServer::from(static_dir()).rank(1))
		.mount("/", routes![index_fallback])
		.mount("/api", routes::api::api())
		.mount(
			"/api/rapidoc/",
			make_rapidoc(&RapiDocConfig {
				general: GeneralConfig {
					spec_urls: vec![UrlObject::new("General", "/api/openapi.json")],
					..Default::default()
				},
				hide_show: HideShowConfig {
					allow_spec_url_load: false,
					allow_spec_file_load: false,
					..Default::default()
				},
				ui: UiConfig {
					theme: Theme::Dark,
					..Default::default()
				},
				..Default::default()
			}),
		)
		.mount("/opds/v1.2", routes::opds::opds())
		.register("/opds/v1.2", catchers![opds_unauthorized])
}

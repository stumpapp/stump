#[macro_use]
extern crate rocket;

use db::migration::run_migrations;

use config::{
	context::Ctx,
	cors, env,
	helmet::Helmet,
	logging::{self, STUMP_SHADOW_TEXT},
	session,
};
use event::{event_manager::EventManager, ClientRequest};
use rocket::{
	fs::{FileServer, NamedFile},
	tokio::sync::mpsc::unbounded_channel,
};
use rocket_okapi::{
	rapidoc::{
		make_rapidoc, GeneralConfig, HideShowConfig, RapiDocConfig, Theme, UiConfig,
	},
	settings::UrlObject,
};
use std::path::Path;
use types::http::UnauthorizedResponse;

pub mod config;
pub mod db;
pub mod event;
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

	// Channel to handle client requests. The sender goes in Stump Ctx, the receiver goes
	// in the event manager.
	let internal_channel = unbounded_channel::<ClientRequest>();

	// Ownership will be transferred to the event manager.
	let core_ctx = Ctx::new(internal_channel.0.clone()).await;

	match run_migrations(core_ctx.get_db()).await {
		Ok(_) => {
			log::info!("Migrations ran successfully");
		},
		Err(e) => {
			log::error!("Failed to run migrations: {:?}", e);
			// panic!("Failed to run migrations: {:?}", e);
		},
	};

	let _event_manager = EventManager::new(core_ctx.get_ctx(), internal_channel.1);

	log::info!("{}", STUMP_SHADOW_TEXT);

	rocket::build()
		.manage(core_ctx)
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
		// TODO: I need to figure out if I want to allow basic auth on non-opds routes...
		// .register("/api", catchers![opds_unauthorized])
		.register("/opds/v1.2", catchers![opds_unauthorized])
}

#[macro_use]
extern crate rocket;

mod guards;
mod routes;
mod types;
mod utils;

use std::path::Path;

use rocket::fs::{FileServer, NamedFile};
use rocket_okapi::{
	rapidoc::{
		make_rapidoc, GeneralConfig, HideShowConfig, RapiDocConfig, Theme, UiConfig,
	},
	settings::UrlObject,
};
use stump_core::StumpCore;
use types::http::UnauthorizedResponse;
use utils::{cors, helmet::Helmet, session::get_session_store};

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

// TODO: bye bye Rocket, you have annoyed me for the last time lol
#[launch]
async fn rocket() -> _ {
	let core = StumpCore::new().await;

	let core_ctx = core.get_context();

	match core.run_migrations(core_ctx.get_db()).await {
		Ok(_) => {
			println!("Migrations ran successfully");
			// log::info!("Migrations ran successfully");
		},
		Err(e) => {
			// log::error!("Failed to run migrations: {}", e);
			panic!("Failed to run migrations: {}", e);
		},
	};

	// env::Env::load().unwrap_or_else(|e| {
	// 	log::error!("Failed to load environment variables: {:?}", e.to_string())
	// });

	// // I am not panic-ing here because I don't believe this should be a fatal error
	// logging::init_fern().unwrap_or_else(|e| {
	// 	log::error!("Failed to initialize logging: {:?}", e.to_string())
	// });

	let cors_config = cors::get_cors();
	let session_store = get_session_store();

	rocket::build()
		.manage(core_ctx)
		.attach(session_store.fairing())
		.attach(cors_config)
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

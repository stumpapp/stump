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
// OR, just remove rocket because it has been annoying me...
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

fn debug_setup() {
	std::env::set_var(
		"STUMP_CLIENT_DIR",
		env!("CARGO_MANIFEST_DIR").to_string() + "/client",
	);
	std::env::set_var(
		"ROCKET_CONFIG",
		env!("CARGO_MANIFEST_DIR").to_string() + "/Rocket.toml",
	);
}

// TODO: bye bye Rocket, you have annoyed me for the last time lol
#[launch]
async fn rocket() -> _ {
	#[cfg(debug_assertions)]
	debug_setup();

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

	if let Err(err) = core.load_env() {
		log::error!("Failed to load environment variables: {:?}", err);
		// panic!("Failed to load environment variables: {}", err);
	}

	if let Err(err) = core.init_logging() {
		log::error!("Failed to initialize logging: {:?}", err);
		// panic!("Failed to initialize logging: {}", err);
	}

	let cors_config = cors::get_cors();
	let session_store = get_session_store();

	log::info!("{}", core.get_shadow_text());

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

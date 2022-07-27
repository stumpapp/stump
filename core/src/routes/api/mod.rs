use rocket::{serde::json::Json, Route, Shutdown};
use rocket_okapi::{openapi, openapi_get_routes, JsonSchema};
use serde::Serialize;

use crate::{
	guards::auth::AdminGuard,
	types::alias::{ApiResult, Ctx},
};

pub mod auth;
pub mod epub;
pub mod filesystem;
pub mod job;
pub mod library;
pub mod log;
pub mod media;
pub mod series;
pub mod tag;
pub mod user;

/// Function to return the routes for the `/api` path.
pub fn api() -> Vec<Route> {
	openapi_get_routes![
		// top level api endpoints
		claim,
		ping,
		shutdown,
		// auth
		auth::me,
		auth::login,
		auth::register,
		auth::logout,
		// user api
		user::get_users,
		user::create_user,
		user::update_user_preferences,
		// user::update_user
		job::jobs_listener,
		// library api
		library::get_libraries,
		library::get_libraries_stats,
		library::get_library_by_id,
		library::get_library_series,
		library::scan_library,
		library::create_library,
		library::update_library,
		library::delete_library,
		// series api
		series::get_series,
		series::get_series_by_id,
		series::get_series_thumbnail,
		series::get_series_media,
		series::series_next_media,
		// media api
		media::get_media,
		media::get_reading_media,
		media::get_media_by_id,
		media::get_media_file,
		media::get_media_page,
		media::get_media_thumbnail,
		media::update_media_progress,
		media::get_duplicate_media,
		// epub api
		epub::get_epub,
		epub::get_epub_chatper,
		epub::get_epub_meta,
		// tag api
		tag::get_tags,
		tag::create_tags,
		// filesytem api
		filesystem::list_directory,
		// log api
		log::clear_logs,
		log::get_log_info,
	]
}

#[derive(Serialize, JsonSchema)]
#[serde(rename_all = "camelCase")]
struct ClaimResponse {
	is_claimed: bool,
}

// TODO: set status?
// TODO: should this explicitly check for a SERVER_OWNER? Not sure if it's needed, if
// it would be a valid scenario that a SERVER_OWNER account gets deleted but not the
// other *managed* accounts.
/// Checks whether or not the server is 'claimed,' i.e. if there is a user registered.
#[openapi(tag = "Setup")]
#[get("/claim")]
async fn claim(ctx: &Ctx) -> ApiResult<Json<ClaimResponse>> {
	let db = ctx.get_db();

	Ok(Json(ClaimResponse {
		is_claimed: db.user().find_first(vec![]).exec().await?.is_some(),
	}))
}

#[openapi(tag = "General")]
#[get("/ping")]
async fn ping() -> String {
	"pong".to_string()
}

// FIXME: won't work for docker. Allow custom shudown command sequences?
/// Attempts to safely shutdown the server. Only server owners can do this.
#[openapi(tag = "General")]
#[post("/shutdown")]
async fn shutdown(shutdown: Shutdown, _auth: AdminGuard) {
	shutdown.notify();
}

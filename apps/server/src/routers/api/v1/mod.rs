use axum::{
	extract::State,
	routing::{get, post},
	Json, Router,
};
use stump_core::prelude::{ClaimResponse, StumpVersion};

use crate::{config::state::AppState, errors::ApiResult};

mod auth;
mod epub;
mod filesystem;
mod job;
mod library;
mod log;
mod media;
mod reading_list;
mod series;
mod tag;
mod user;

pub(crate) fn mount(app_state: AppState) -> Router<AppState> {
	Router::new()
		.merge(auth::mount())
		.merge(epub::mount(app_state.clone()))
		.merge(library::mount(app_state.clone()))
		.merge(media::mount(app_state.clone()))
		.merge(filesystem::mount(app_state.clone()))
		.merge(job::mount(app_state.clone()))
		.merge(log::mount(app_state.clone()))
		.merge(series::mount(app_state.clone()))
		.merge(tag::mount(app_state.clone()))
		.merge(user::mount(app_state))
		.merge(reading_list::mount())
		.route("/claim", get(claim))
		.route("/ping", get(ping))
		.route("/version", post(version))
}

async fn claim(State(ctx): State<AppState>) -> ApiResult<Json<ClaimResponse>> {
	let db = ctx.get_db();

	Ok(Json(ClaimResponse {
		is_claimed: db.user().find_first(vec![]).exec().await?.is_some(),
	}))
}

async fn ping() -> ApiResult<String> {
	Ok("pong".to_string())
}

async fn version() -> ApiResult<Json<StumpVersion>> {
	Ok(Json(StumpVersion {
		semver: env!("CARGO_PKG_VERSION").to_string(),
		rev: std::env::var("GIT_REV").ok(),
		compile_time: env!("STATIC_BUILD_DATE").to_string(),
	}))
}

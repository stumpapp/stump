use axum::{
	routing::{get, post},
	Extension, Json, Router,
};
use stump_core::types::{ClaimResponse, StumpVersion};

use crate::{config::state::State, errors::ApiResult};

mod auth;
mod epub;
mod filesystem;
mod job;
mod library;
mod log;
mod media;
mod series;
mod tag;
mod user;

pub(crate) fn mount() -> Router {
	Router::new().nest(
		"/api",
		Router::new()
			.merge(auth::mount())
			.merge(epub::mount())
			.merge(library::mount())
			.merge(media::mount())
			.merge(filesystem::mount())
			.merge(job::mount())
			.merge(log::mount())
			.merge(series::mount())
			.merge(tag::mount())
			.merge(user::mount())
			.route("/claim", get(claim))
			.route("/ping", get(ping))
			.route("/version", post(version)),
	)
}

async fn claim(Extension(ctx): State) -> ApiResult<Json<ClaimResponse>> {
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

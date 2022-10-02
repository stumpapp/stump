use axum::{routing::get, Extension, Json, Router};
use stump_core::types::ClaimResponse;

use crate::{config::state::State, errors::ApiResult};

mod auth;
mod library;

pub(crate) fn mount() -> Router {
	Router::new()
		.merge(auth::mount())
		.merge(library::mount())
		.route("/claim", get(claim))
		.route("/ping", get(ping))
		.route("/version", get(version))
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

async fn version() -> ApiResult<String> {
	Ok(env!("CARGO_PKG_VERSION").to_string())
}

use axum::{
	extract::State,
	routing::{get, post},
	Json, Router,
};
use reqwest::header::USER_AGENT;
use serde::{Deserialize, Serialize};
use specta::Type;
use utoipa::ToSchema;

use crate::{
	config::state::AppState,
	errors::{APIError, APIResult},
};

pub(crate) mod auth;
pub(crate) mod book_club;
pub(crate) mod epub;
pub(crate) mod filesystem;
pub(crate) mod job;
pub(crate) mod library;
pub(crate) mod log;
pub(crate) mod media;
pub(crate) mod metadata;
pub(crate) mod notifier;
pub(crate) mod reading_list;
pub(crate) mod series;
pub(crate) mod smart_list;
pub(crate) mod tag;
pub(crate) mod user;

pub(crate) fn mount(app_state: AppState) -> Router<AppState> {
	Router::new()
		.merge(auth::mount())
		.merge(epub::mount(app_state.clone()))
		.merge(library::mount(app_state.clone()))
		.merge(media::mount(app_state.clone()))
		.merge(metadata::mount(app_state.clone()))
		.merge(notifier::mount(app_state.clone()))
		.merge(filesystem::mount(app_state.clone()))
		.merge(job::mount(app_state.clone()))
		.merge(log::mount(app_state.clone()))
		.merge(series::mount(app_state.clone()))
		.merge(tag::mount(app_state.clone()))
		.merge(user::mount(app_state.clone()))
		.merge(reading_list::mount())
		.merge(smart_list::mount())
		.merge(book_club::mount(app_state))
		.route("/claim", get(claim))
		.route("/ping", get(ping))
		// TODO: should /version or /check-for-updates be behind any auth reqs?
		.route("/version", post(version))
		.route("/check-for-update", get(check_for_updates))
}

#[derive(Serialize, Type, ToSchema)]
pub struct ClaimResponse {
	pub is_claimed: bool,
}

#[utoipa::path(
	get,
	path = "/api/v1/claim",
	tag = "util",
	responses(
		(status = 200, description = "Claim status successfully determined", body = ClaimResponse)
	)
)]
async fn claim(State(ctx): State<AppState>) -> APIResult<Json<ClaimResponse>> {
	let db = &ctx.db;

	Ok(Json(ClaimResponse {
		is_claimed: db.user().find_first(vec![]).exec().await?.is_some(),
	}))
}

#[utoipa::path(
	get,
	path = "/api/v1/ping",
	tag = "util",
	responses(
		(status = 200, description = "Always responds with 'pong'", body = String)
	)
)]
async fn ping() -> APIResult<String> {
	Ok("pong".to_string())
}

#[derive(Serialize, Deserialize, Type, ToSchema)]
pub struct StumpVersion {
	pub semver: String,
	pub rev: String,
	pub compile_time: String,
}

#[utoipa::path(
	post,
	path = "/api/v1/version",
	tag = "util",
	responses(
		(status = 200, description = "Version information for the Stump server instance", body = StumpVersion)
	)
)]
async fn version() -> APIResult<Json<StumpVersion>> {
	Ok(Json(StumpVersion {
		semver: env!("CARGO_PKG_VERSION").to_string(),
		rev: env!("GIT_REV").to_string(),
		compile_time: env!("STATIC_BUILD_DATE").to_string(),
	}))
}

#[derive(Serialize, Deserialize, Type, ToSchema)]
pub struct UpdateCheck {
	current_semver: String,
	latest_semver: String,
	has_update_available: bool,
}

#[utoipa::path(
	get,
	path = "/api/v1/check-for-update",
	tag = "util",
	responses(
		(status = 200, description = "Check for updates", body = UpdateCheck)
	)
)]
async fn check_for_updates() -> APIResult<Json<UpdateCheck>> {
	let current_semver = env!("CARGO_PKG_VERSION").to_string();

	let client = reqwest::Client::new();
	let github_response = client
		.get("https://api.github.com/repos/stumpapp/stump/releases/latest")
		.header(USER_AGENT, "stumpapp/stump")
		.send()
		.await?;

	if github_response.status().is_success() {
		let github_json: serde_json::Value = github_response.json().await?;

		let latest_semver = github_json["tag_name"].as_str().ok_or_else(|| {
			APIError::InternalServerError(
				"Failed to parse latest release tag name".to_string(),
			)
		})?;
		let has_update_available = latest_semver != current_semver;

		Ok(Json(UpdateCheck {
			current_semver,
			latest_semver: latest_semver.to_string(),
			has_update_available,
		}))
	} else {
		match github_response.status().as_u16() {
			404 => Ok(Json(UpdateCheck {
				current_semver,
				latest_semver: "unknown".to_string(),
				has_update_available: false,
			})),
			_ => Err(APIError::InternalServerError(format!(
				"Failed to fetch latest release: {}",
				github_response.status()
			))),
		}
	}
}

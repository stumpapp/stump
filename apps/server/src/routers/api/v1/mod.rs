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

// TODO: Also, there is a lot of cringe and smell throughout some of the older code. While I definitely want to focus on building
// out new features and fixing bugs, I think it would be a good idea to start cleaning up some of the older code when I have time. I
// also think there is a good amount of duplication which can be trimmed down, like how I did with the OPDS v2 API. A few of those route
// handlers are one-liners 💅

pub(crate) mod api_key;
pub(crate) mod auth;
pub(crate) mod book_club;
pub(crate) mod config;
pub(crate) mod emailer;
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
pub(crate) mod stats;
pub(crate) mod tag;
pub(crate) mod upload;
pub(crate) mod user;

pub(crate) fn mount(app_state: AppState) -> Router<AppState> {
	let mut router = Router::new()
		.merge(auth::mount(app_state.clone()))
		.merge(api_key::mount(app_state.clone()))
		.merge(epub::mount(app_state.clone()))
		.merge(emailer::mount(app_state.clone()))
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
		.merge(reading_list::mount(app_state.clone()))
		.merge(smart_list::mount(app_state.clone()))
		.merge(book_club::mount(app_state.clone()))
		.merge(stats::mount(app_state.clone()))
		.merge(config::mount(app_state.clone()))
		.route("/claim", get(claim))
		.route("/ping", get(ping))
		// TODO: should /version or /check-for-updates be behind any auth reqs?
		.route("/version", post(version))
		.route("/check-for-update", get(check_for_updates));

	// Conditionally attach upload routes based on settings.
	if app_state.config.enable_upload {
		router = router.merge(upload::mount(app_state.clone()));
	}

	router
}

#[derive(Serialize, Type, ToSchema)]
pub struct ClaimResponse {
	pub is_claimed: bool,
}

// TODO: These root endpoints are not really versioned, so they should be moved somewhere separate
// from the v1 module. There is only a v1 right now, so it literally doesn't matter, but it's a good
// future note I guess.

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
	// TODO: add docker tag since special versions (e.g. nightly, experimental) will have the latest semver but a different commit
	// Also will allow for the UI to display explicitly the docker tag if it's a special version
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

		let mut latest_semver = github_json["tag_name"].as_str().ok_or_else(|| {
			APIError::InternalServerError(
				"Failed to parse latest release tag name".to_string(),
			)
		})?;
		if latest_semver.starts_with('v') && latest_semver.len() > 1 {
			latest_semver = &latest_semver[1..];
		}

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

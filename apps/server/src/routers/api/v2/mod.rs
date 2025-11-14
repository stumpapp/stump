pub(crate) mod auth;
pub(crate) mod library;
pub(crate) mod media;
pub(crate) mod series;

use axum::{
	extract::State,
	routing::{get, post},
	Json, Router,
};
use models::entity::user;
use reqwest::header::USER_AGENT;
use sea_orm::prelude::*;
use serde::{Deserialize, Serialize};

use crate::{
	config::state::AppState,
	errors::{APIError, APIResult},
};

pub(crate) fn mount(app_state: AppState) -> Router<AppState> {
	Router::new()
		.merge(auth::mount(app_state.clone()))
		.merge(media::mount(app_state.clone()))
		.merge(series::mount(app_state.clone()))
		.merge(library::mount(app_state))
		.route("/claim", get(claim))
		.route("/ping", get(ping))
		.route("/version", post(version))
		.route("/check-for-update", get(check_for_updates))
}

#[derive(Serialize)]
#[serde(rename_all = "camelCase")]
pub struct ClaimResponse {
	pub is_claimed: bool,
}

async fn claim(State(ctx): State<AppState>) -> APIResult<Json<ClaimResponse>> {
	let is_claimed = user::Entity::find().count(ctx.conn.as_ref()).await? > 0;

	Ok(Json(ClaimResponse { is_claimed }))
}

async fn ping() -> APIResult<String> {
	Ok("pong".to_string())
}

// TODO: Add docker-specific version info (e.g. tag) to this struct
#[derive(Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct StumpVersion {
	pub semver: String,
	// E.g., nightly, experimental, unstable, etc.
	pub build_channel: Option<String>,
	pub rev: String,
	pub compile_time: String,
}

async fn version() -> APIResult<Json<StumpVersion>> {
	Ok(Json(StumpVersion {
		semver: env!("CARGO_PKG_VERSION").to_string(),
		build_channel: option_env!("BUILD_CHANNEL").map(|s| s.to_string()),
		rev: env!("GIT_REV").to_string(),
		compile_time: env!("STATIC_BUILD_DATE").to_string(),
	}))
}

#[derive(Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct UpdateCheck {
	current_semver: String,
	latest_semver: String,
	has_update_available: bool,
}

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

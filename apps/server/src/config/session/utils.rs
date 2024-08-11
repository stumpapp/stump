use axum::{
	body::BoxBody,
	response::{IntoResponse, Response},
	BoxError,
};
use hyper::StatusCode;
use std::sync::Arc;
use stump_core::Ctx;
use time::Duration;

use tower_sessions::{cookie::SameSite, SessionManagerLayer, SessionStore};

use super::PrismaSessionStore;

pub const SESSION_USER_KEY: &str = "user";
pub const SESSION_NAME: &str = "stump_session";
pub const SESSION_PATH: &str = "/";

pub fn get_session_layer(ctx: Arc<Ctx>) -> SessionManagerLayer<PrismaSessionStore> {
	let client = ctx.db.clone();
	let store = PrismaSessionStore::new(client, ctx.config.clone());

	let cleanup_interval = ctx.config.expired_session_cleanup_interval;
	if cleanup_interval > 0 {
		tracing::trace!(
			cleanup_interval = cleanup_interval,
			"Spawning session expiry cleanup task"
		);
		tokio::task::spawn(store.clone().continuously_delete_expired(
			tokio::time::Duration::from_secs(cleanup_interval),
			ctx.clone(),
		));
	} else {
		tracing::debug!("expired_session_cleanup_interval is set to 0. Session expiry cleanup is disabled");
	}

	// TODO: This configuration won't work for Tauri Windows app, it requires SameSite::None and Secure=true... Linux and macOS work fine.
	SessionManagerLayer::new(store)
		.with_name(SESSION_NAME)
		.with_max_age(Duration::seconds(ctx.config.session_ttl))
		.with_path(SESSION_PATH.to_string())
		.with_same_site(SameSite::Lax)
		.with_secure(false)
}

/// Handle a session service error. This will be called when the session service returns an error, and will
/// attempt to encourage the client to delete their Stump session cookie.
pub async fn handle_session_service_error(err: BoxError) -> impl IntoResponse {
	tracing::error!("Failed to handle session: {:?}", err);
	// We want to ecourage the client to delete their cookies automatically via response headers in the event
	// that the cookie is just invalid. To do this, we'll just set the cookie on the same name, path and domain,
	// but with an Expires value in the past. This *should* cause the client to delete the cookie.
	Response::builder()
		.status(StatusCode::BAD_REQUEST)
		.header(
			"Set-Cookie",
			format!(
				"{}={}; Path={}; Domain={}; Expires={}; Max-Age=0",
				SESSION_NAME, "", SESSION_PATH, "", "Thu, 01 Jan 1970 00:00:00 GMT"
			),
		)
		.body(BoxBody::default())
		.unwrap_or_else(|e| {
			tracing::error!(error = ?e, "Failed to build response");
			StatusCode::INTERNAL_SERVER_ERROR.into_response()
		})
}

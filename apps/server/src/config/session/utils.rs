use std::sync::Arc;
use stump_core::Ctx;
use time::Duration;

use tower_sessions::{cookie::SameSite, Expiry, SessionManagerLayer};

use super::StumpSessionStore;

pub const SESSION_USER_KEY: &str = "user_id";
pub const SESSION_NAME: &str = "stump_session";
pub const SESSION_PATH: &str = "/";

pub fn get_session_layer(ctx: Arc<Ctx>) -> SessionManagerLayer<StumpSessionStore> {
	let store = StumpSessionStore::new(ctx.conn.clone(), ctx.config.clone());

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
		.with_expiry(Expiry::OnInactivity(Duration::seconds(
			ctx.config.session_ttl,
		)))
		.with_path(SESSION_PATH.to_string())
		.with_same_site(SameSite::Lax)
		.with_secure(false)
}

/// Returns a tuple with the Set-Cookie header name and value to delete the session cookie.
/// To do this, we'll just set the cookie on the same name, path and domain, but with an
/// Expires value in the past. This *should* hopefully trigger the client to delete the cookie.
pub fn delete_cookie_header() -> (String, String) {
	(
		"Set-Cookie".to_string(),
		format!(
			"{}={}; HttpOnly; SameSite=Lax; Path={}; Domain={}; Expires={}; Max-Age=0",
			SESSION_NAME, "", SESSION_PATH, "", "Thu, 01 Jan 1970 00:00:00 GMT"
		),
	)
}

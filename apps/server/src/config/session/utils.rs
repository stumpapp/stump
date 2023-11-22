use std::{env, sync::Arc};
use stump_core::prisma::PrismaClient;
use time::Duration;

use tower_sessions::{cookie::SameSite, SessionManagerLayer};

use super::store::PrismaSessionStore;

pub const SESSION_USER_KEY: &str = "user";

pub fn get_session_ttl() -> i64 {
	env::var("SESSION_TTL")
		.map(|s| {
			s.parse::<i64>().unwrap_or_else(|e| {
				tracing::error!(error = ?e, "Failed to parse provided SESSION_TTL");
				3600 * 24 * 3
			})
		})
		.unwrap_or(3600 * 24 * 3)
}

pub fn get_session_expiry_cleanup_interval() -> u64 {
	env::var("SESSION_EXPIRY_CLEANUP_INTERVAL")
		.map(|s| {
			s.parse::<u64>().unwrap_or_else(|e| {
				tracing::error!(error = ?e, "Failed to parse provided SESSION_EXPIRY_CLEANUP_INTERVAL");
				60
			})
		})
		.unwrap_or(60)
}

pub fn get_session_layer(
	client: Arc<PrismaClient>,
) -> SessionManagerLayer<PrismaSessionStore> {
	let store = PrismaSessionStore::new(client);

	let cleanup_interval = get_session_expiry_cleanup_interval();
	if cleanup_interval > 0 {
		tokio::task::spawn(store.clone().continuously_delete_expired(
			tokio::time::Duration::from_secs(cleanup_interval),
		));
	} else {
		tracing::debug!("SESSION_EXPIRY_CLEANUP_INTERVAL is set to 0, session expiry cleanup is disabled.");
	}
	let session_ttl = get_session_ttl();

	// TODO: This configuration won't work for Tauri Windows app, it requires SameSite::None and Secure=true... Linux and macOS work fine.
	SessionManagerLayer::new(store)
		.with_name("stump_session")
		.with_max_age(Duration::seconds(session_ttl))
		.with_path("/".to_string())
		.with_same_site(SameSite::Lax)
		.with_secure(false)
}

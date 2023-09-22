use std::{env, time::Duration};

use axum_sessions::{async_session::MemoryStore, SameSite, SessionLayer};
use rand::{thread_rng, Rng};

fn rand_secret() -> Vec<u8> {
	let mut rng = thread_rng();
	let mut arr = [0u8; 128];
	rng.fill(&mut arr);
	arr.to_vec()
}

pub fn get_session_layer() -> SessionLayer<MemoryStore> {
	let store = MemoryStore::new();

	let secret = env::var("SESSION_SECRET")
		.map(|s| s.into_bytes())
		.unwrap_or_else(|_| rand_secret());

	let ttl = env::var("SESSION_TTL")
		.map(|s| {
			s.parse::<u64>().unwrap_or_else(|e| {
				tracing::error!(error = ?e, "Failed to parse provided SESSION_TTL");
				3600 * 24 * 3
			})
		})
		.unwrap_or(3600 * 24 * 3);

	let sesssion_layer = SessionLayer::new(store, &secret)
		.with_cookie_name("stump_session")
		.with_session_ttl(Some(Duration::from_secs(ttl)))
		.with_cookie_path("/");

	sesssion_layer
		.with_same_site_policy(SameSite::Lax)
		.with_secure(false)

	// TODO: I think this can be configurable, but most people are going to be insecurely
	// running this, which means `secure` needs to be false otherwise the cookie won't
	// be sent.
	// if env::var("STUMP_PROFILE").unwrap_or_else(|_| "release".into()) == "release" {
	// 	sesssion_layer
	// 		.with_same_site_policy(SameSite::None)
	// 		.with_secure(true)
	// } else {
	// 	sesssion_layer
	// 		.with_same_site_policy(SameSite::Lax)
	// 		.with_secure(false)
	// }
}

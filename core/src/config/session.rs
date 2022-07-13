use std::time::Duration;

use rocket::http::SameSite;
use rocket_session_store::{memory::MemoryStore, CookieConfig, SessionStore};

use crate::types::models::AuthenticatedUser;

pub fn get_session_store() -> SessionStore<AuthenticatedUser> {
	let session_name =
		std::env::var("SESSION_NAME").unwrap_or_else(|_| "stump-session".into());

	// let client: Client = Client::open("redis://127.0.0.1").expect("Could not connect to redis");
	// let redis_store: RedisStore<AuthenticatedUser> = RedisStore::new(client);

	let memory_store: MemoryStore<AuthenticatedUser> = MemoryStore::default();
	SessionStore {
		store: Box::new(memory_store),
		name: session_name,
		duration: Duration::from_secs(3600 * 24 * 3),
		cookie: CookieConfig {
			path: Some("/".into()),
			same_site: Some(SameSite::Lax),
			secure: false,
			http_only: true,
		},
	}
}

use std::env;

pub(crate) fn get_client_dir() -> String {
	env::var("STUMP_CLIENT_DIR").unwrap_or_else(|_| "./dist".to_string())
}

pub(crate) fn is_debug() -> bool {
	env::var("STUMP_PROFILE").unwrap_or_else(|_| "release".into()) == "debug"
}

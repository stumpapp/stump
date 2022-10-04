use std::env;

pub(crate) fn get_client_dir() -> String {
	env::var("STUMP_CLIENT_DIR").unwrap_or_else(|_| "./dist".to_string())
}

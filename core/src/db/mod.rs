pub mod migration;
pub mod utils;

use crate::{config::get_config_dir, prisma};

/// Creates the Stump data directory relative to the home directory of the host
/// OS. If the directory does not exist, it will be created.
fn create_config_dir() -> String {
	let config_dir = get_config_dir();

	let path_str = config_dir.to_str().unwrap();

	std::fs::create_dir_all(&path_str).unwrap();

	path_str.to_string()
}

/// Creates the PrismaClient. Will call `create_data_dir` as well
pub async fn create_client() -> prisma::PrismaClient {
	let rocket_env =
		std::env::var("ROCKET_PROFILE").unwrap_or_else(|_| "debug".to_string());

	// FIXME: This is NOT working on builds, I have pass the ROCKET_PROFILE=release
	// manually when running the binary to get it working. WHICH IS WEIRD because if I don't
	// set it but set ROCKET_LOG_LEVEL=debug I can see Rocket knows it is release but this
	// conditional still fails
	if rocket_env == "release" {
		let config_dir = create_config_dir();

		prisma::new_client_with_url(&format!("file:{}/stump.db", &config_dir))
			.await
			.expect("Failed to create Prisma client")
	} else {
		// Development database will live in the /prisma directory
		prisma::new_client()
			.await
			.expect("Failed to create Prisma client")
	}
}

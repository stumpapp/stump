pub mod migration;
pub mod utils;

use crate::{config::get_config_dir, prisma};

/// Creates the PrismaClient. Will call `create_data_dir` as well
pub async fn create_client() -> prisma::PrismaClient {
	let config_dir = get_config_dir()
		.to_str()
		.expect("Error parsing config directory")
		.to_string();

	let rocket_env =
		std::env::var("ROCKET_PROFILE").unwrap_or_else(|_| "debug".to_string());

	if rocket_env == "release" {
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

pub mod migration;
pub mod utils;

use std::path::Path;

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
		log::trace!(
			"Creating Prisma client with url: file:{}/stump.db",
			&config_dir
		);
		prisma::new_client_with_url(&format!("file:{}/stump.db", &config_dir))
			.await
			.expect("Failed to create Prisma client")
	} else {
		log::trace!(
			"Creating Prisma client with url: file:{}/prisma/dev.db",
			&env!("CARGO_MANIFEST_DIR")
		);
		create_client_with_url(&format!(
			"file:{}/prisma/dev.db",
			&env!("CARGO_MANIFEST_DIR")
		))
		.await
	}
}

pub async fn create_client_with_url(url: &str) -> prisma::PrismaClient {
	prisma::new_client_with_url(url)
		.await
		.expect("Failed to create Prisma client")
}

pub async fn create_test_client() -> prisma::PrismaClient {
	let test_dir = Path::new(env!("CARGO_MANIFEST_DIR")).join("integration-tests");

	return create_client_with_url(&format!(
		"file:{}/test.db",
		test_dir.to_str().unwrap()
	))
	.await;
}

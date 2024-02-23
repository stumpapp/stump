use std::path::Path;
use tracing::trace;

use crate::{config::StumpConfig, prisma};

#[derive(Debug, Clone, serde::Serialize, serde::Deserialize)]
pub(crate) struct JournalModeQueryResult {
	pub journal_mode: String,
}

/// Creates the PrismaClient. Will call `create_data_dir` as well
pub async fn create_client(config: &StumpConfig) -> prisma::PrismaClient {
	let config_dir = config
		.get_config_dir()
		.to_str()
		.expect("Error parsing config directory")
		.to_string();

	// let suffix = "?connection_limit=1";
	let suffix = "";

	if let Some(path) = config.db_path.clone() {
		create_client_with_url(&format!("file:{}/stump.db{suffix}", &path)).await
	} else if config.profile == "release" {
		trace!(
			"Creating Prisma client with url: file:{}/stump.db{suffix}",
			&config_dir
		);
		prisma::new_client_with_url(&format!("file:{}/stump.db{suffix}", &config_dir))
			.await
			.expect("Failed to create Prisma client")
	} else {
		trace!(
			"Creating Prisma client with url: file:{}/prisma/dev.db",
			&env!("CARGO_MANIFEST_DIR")
		);
		create_client_with_url(&format!(
			"file:{}/prisma/dev.db{suffix}",
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

	create_client_with_url(&format!("file:{}/test.db", test_dir.to_str().unwrap())).await
}

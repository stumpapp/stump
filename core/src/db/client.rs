use std::{fs, path::Path};

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
	// TODO: experiment with this. I experienced some issues with concurrent writes still :/
	// let postfix = "?socket_timeout=15000&busy_timeout=15000&connection_limit=1";

	let sqlite_url = if let Some(path) = config.db_path.clone() {
		format!("file:{}/stump.db", &path)
	} else if config.profile == "release" {
		tracing::trace!("ile:{}/stump.db", &config_dir);
		format!("file:{}/stump.db", &config_dir)
	} else {
		let dev_db_dir = format!("{}/prisma/dev", env!("CARGO_MANIFEST_DIR"));
		fs::create_dir_all(&dev_db_dir).expect("Failed to create directory /prisma/dev");
		format!("file:{}/dev.db", dev_db_dir)
	};

	tracing::trace!(?sqlite_url, "Creating Prisma client");
	create_client_with_url(&sqlite_url).await
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

use prisma_client_rust::raw;
use std::path::Path;
use tracing::trace;

use crate::{config::StumpConfig, prisma};

/// Creates the PrismaClient. Will call `create_data_dir` as well
pub async fn create_client(config: &StumpConfig) -> prisma::PrismaClient {
	let config_dir = config
		.get_config_dir()
		.to_str()
		.expect("Error parsing config directory")
		.to_string();

	let client = if let Some(path) = config.db_path.clone() {
		create_client_with_url(&format!("file:{}/stump.db", &path)).await
	} else if config.profile == "release" {
		trace!(
			"Creating Prisma client with url: file:{}/stump.db",
			&config_dir
		);
		prisma::new_client_with_url(&format!("file:{}/stump.db", &config_dir))
			.await
			.expect("Failed to create Prisma client")
	} else {
		trace!(
			"Creating Prisma client with url: file:{}/prisma/dev.db",
			&env!("CARGO_MANIFEST_DIR")
		);
		create_client_with_url(&format!(
			"file:{}/prisma/dev.db",
			&env!("CARGO_MANIFEST_DIR")
		))
		.await
	};

	let enable_wal = std::env::var("ENABLE_WAL")
		.unwrap_or_else(|_| "false".to_string())
		.parse()
		.unwrap_or_else(|error| {
			tracing::error!(?error, "Failed to parse ENABLE_WAL");
			false
		});

	if enable_wal {
		let _affected_rows = client
			._execute_raw(raw!("PRAGMA journal_mode=WAL;"))
			.exec()
			.await
			.unwrap_or_else(|error| {
				tracing::error!(?error, "Failed to enable WAL mode");
				0
			});
	}

	client
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

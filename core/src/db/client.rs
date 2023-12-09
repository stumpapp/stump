use prisma_client_rust::raw;
use std::path::Path;
use tracing::trace;

use crate::{config::get_config_dir, prisma};

#[derive(Debug, Clone, serde::Serialize, serde::Deserialize)]
pub(crate) struct JournalModeQueryResult {
	pub journal_mode: String,
}

/// Creates the PrismaClient. Will call `create_data_dir` as well
pub async fn create_client() -> prisma::PrismaClient {
	let config_dir = get_config_dir()
		.to_str()
		.expect("Error parsing config directory")
		.to_string();

	let profile = std::env::var("STUMP_PROFILE").unwrap_or_else(|_| "debug".to_string());
	let db_override = std::env::var("STUMP_DB_PATH").ok();

	let client = if let Some(path) = db_override {
		trace!("Creating Prisma client with url: file:{}", &path);
		create_client_with_url(&format!("file:{}", &path)).await
	} else if profile == "release" {
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

	let enable_wal_var = std::env::var("ENABLE_WAL")
		.ok()
		.and_then(|v| v.parse::<bool>().ok());

	if let Some(enable_wal) = enable_wal_var {
		let journal_value = if enable_wal { "WAL" } else { "DELETE" };

		if enable_wal {
			tracing::warn!(
				"WAL is highly unstable at the moment. DO NOT SET MORE THAN ONCE! Be sure to remove the environment variable after usage"
			);
		}

		let result = client
			._query_raw::<JournalModeQueryResult>(raw!(&format!(
				"PRAGMA journal_mode={journal_value};"
			)))
			.exec()
			.await
			.unwrap_or_else(|error| {
				tracing::error!(?error, "Failed to set journal mode");
				vec![]
			});

		if let Some(journal_mode) = result.first() {
			tracing::debug!(?journal_mode, "Journal mode set");
		} else {
			tracing::error!("No journal mode set!");
		}
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

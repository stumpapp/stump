use std::path::Path;

use crate::{config::StumpConfig, prisma};

#[derive(Debug, Clone, serde::Serialize, serde::Deserialize)]
pub(crate) struct JournalModeQueryResult {
	pub journal_mode: String,
}

/// Creates the [`prisma::PrismaClient`]. Will call `create_data_dir` as well
pub async fn create_client(config: &StumpConfig) -> prisma::PrismaClient {
	let config_dir = config
		.get_config_dir()
		.to_str()
		.expect("Error parsing config directory")
		.to_string();
	tracing::trace!(?config_dir, "Creating Prisma client");
	// NOTE: Prisma 5.16.0 will potentially have a few fixes related to SQLite, in particular fixes for timeouts
	// during query execution. It seems the latest PCR is on 5.1.0 (with a custom patch for PCR-specific things).
	// Hopefully once 5.16.0 is released, PCR will be updated shortly after to take advantage of the improvements.
	// I also believe JOIN performance improvements are coming in 5.16.0, which is exciting too.
	// See https://github.com/prisma/prisma/issues/9562#issuecomment-2162441695
	// See also this note about WAL mode with these fixes: https://github.com/prisma/prisma-engines/pull/4907#issuecomment-2152943591
	// TODO: experiment with this. I experienced some issues with concurrent writes still :/
	// let postfix = "?socket_timeout=15000&busy_timeout=15000&connection_limit=1";

	let sqlite_url = if let Some(path) = config.db_path.clone() {
		format!("file:{path}/stump.db")
	} else if config.profile == "release" {
		tracing::trace!("file:{config_dir}/stump.db");
		format!("file:{config_dir}/stump.db")
	} else {
		format!("file:{}/prisma/dev.db", env!("CARGO_MANIFEST_DIR"))
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

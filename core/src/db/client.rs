use std::path::Path;

use sea_orm::{self, DatabaseConnection};

use crate::config::StumpConfig;

#[derive(Debug, Clone, serde::Serialize, serde::Deserialize)]
pub(crate) struct JournalModeQueryResult {
	pub journal_mode: String,
}

pub async fn create_connection(config: &StumpConfig) -> DatabaseConnection {
	let config_dir = config
		.get_config_dir()
		.to_str()
		.expect("Error parsing config directory")
		.to_string();

	let sqlite_url = if let Some(path) = config.db_path.clone() {
		format!("sqlite://{path}/stump.db")
	} else if config.profile == "release" {
		tracing::trace!("sqlite:{config_dir}/stump.db");
		format!("sqlite://{config_dir}/stump.db")
	} else {
		format!("sqlite://{}/dev.db", env!("CARGO_MANIFEST_DIR"))
	};

	sea_orm::Database::connect(&sqlite_url)
		.await
		.expect("Could not connect to database")
}

use std::env;

use migrations::{Migrator, MigratorTrait};
use sea_orm::{self, DatabaseConnection, FromQueryResult};
use serde::{Deserialize, Serialize};
use std::str::FromStr;

use crate::{config::StumpConfig, CoreError};

pub const FORCE_RESET_KEY: &str = "FORCE_DB_RESET";

pub async fn connect(config: &StumpConfig) -> Result<DatabaseConnection, CoreError> {
	let config_dir = config.get_config_dir();

	let sqlite_url = if let Some(path) = config.db_path.clone() {
		format!("sqlite://{path}/stump.db?mode=rwc")
	} else if cfg!(debug_assertions) {
		format!("sqlite://{}/dev.db?mode=rwc", env!("CARGO_MANIFEST_DIR"))
	} else {
		format!("sqlite://{}/stump.db?mode=rwc", config_dir.display())
	};

	let connection = sea_orm::Database::connect(&sqlite_url).await?;

	let force_reset = match env::var(FORCE_RESET_KEY) {
		Ok(value) => value == "true",
		Err(error) => {
			tracing::warn!(
				?error,
				"Failed to read `{FORCE_RESET_KEY}` environment variable"
			);
			false
		},
	};

	if force_reset && cfg!(debug_assertions) {
		tracing::debug!("Forcing database reset");
		Migrator::down(&connection, None).await?;
	} else if force_reset {
		tracing::warn!("You can only force a reset in debug mode as a safety measure");
		return Err(CoreError::DatabaseResetNotAllowed);
	}

	Migrator::up(&connection, None).await?;

	Ok(connection)
}

pub async fn connect_at(path: &str) -> Result<DatabaseConnection, CoreError> {
	let connection = sea_orm::Database::connect(path).await?;
	Migrator::up(&connection, None).await?;
	Ok(connection)
}

#[derive(Deserialize, Serialize, Debug, Default)]
pub struct CountQueryReturn {
	pub count: i64,
}

// TODO: Use strum, maybe move to models::shared::enums?

#[derive(Debug, Copy, Clone, Serialize, Deserialize, PartialEq, Eq)]
pub enum JournalMode {
	#[serde(alias = "wal")]
	WAL,
	#[serde(alias = "delete")]
	DELETE,
}

impl Default for JournalMode {
	fn default() -> Self {
		Self::WAL
	}
}

impl AsRef<str> for JournalMode {
	fn as_ref(&self) -> &str {
		match self {
			Self::WAL => "WAL",
			Self::DELETE => "DELETE",
		}
	}
}

impl FromStr for JournalMode {
	type Err = String;

	fn from_str(s: &str) -> Result<Self, Self::Err> {
		match s.to_uppercase().as_str() {
			"WAL" => Ok(Self::WAL),
			"DELETE" => Ok(Self::DELETE),
			_ => Err(format!("Invalid or unsupported journal mode: {s}")),
		}
	}
}

#[derive(Debug, Serialize, Deserialize)]
pub struct JournalModeQueryResult {
	pub journal_mode: JournalMode,
}

impl FromQueryResult for JournalModeQueryResult {
	fn from_query_result(
		res: &sea_orm::QueryResult,
		_pre: &str,
	) -> Result<Self, sea_orm::DbErr> {
		let journal_mode = match res.try_get::<String>("", "journal_mode") {
			Ok(value) => JournalMode::from_str(value.as_str()).unwrap_or_default(),
			_ => {
				tracing::warn!("No journal mode found! Defaulting to WAL assumption");
				JournalMode::default()
			},
		};

		Ok(Self { journal_mode })
	}
}

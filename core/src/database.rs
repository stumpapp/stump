use std::{env, time::Duration};

use migrations::{Migrator, MigratorTrait};
use sea_orm::sqlx::sqlite::{SqliteConnectOptions, SqlitePoolOptions};
use sea_orm::{self, DatabaseConnection, FromQueryResult, SqlxSqliteConnector};
use serde::{Deserialize, Serialize};
use std::str::FromStr;

use crate::{config::StumpConfig, CoreError};

pub const FORCE_RESET_KEY: &str = "FORCE_DB_RESET";

/// A slightly lower max number of binding params for SQL queries, I believe
/// the default is 999
pub const SQLITE_BIND_LIMIT: usize = 900;

pub async fn connect(config: &StumpConfig) -> Result<DatabaseConnection, CoreError> {
	let config_dir = config.get_config_dir();

	let sqlite_url = if let Some(path) = config.db_path.clone() {
		format!("sqlite://{path}/stump.db?mode=rwc")
	} else if cfg!(debug_assertions) {
		format!("sqlite://{}/dev.db?mode=rwc", env!("CARGO_MANIFEST_DIR"))
	} else {
		format!("sqlite://{}/stump.db?mode=rwc", config_dir.display())
	};

	let connection = if sqlite_url.starts_with("sqlite://") {
		let options = SqliteConnectOptions::from_str(&sqlite_url)
			.map_err(|e| {
				CoreError::InternalError(format!("Invalid SQLite connection string: {e}"))
			})?
			// TODO(sqlite): do proper eval for NORMAL synchronous mode
			// .synchronous(SqliteSynchronous::Normal)
			.busy_timeout(Duration::from_secs(30));
		let pool = SqlitePoolOptions::new()
			.acquire_timeout(Duration::from_secs(30))
			.connect_with(options)
			.await
			.map_err(|e| {
				CoreError::InternalError(format!("Failed to connect to SQLite: {e}"))
			})?;
		SqlxSqliteConnector::from_sqlx_sqlite_pool(pool)
	} else {
		// TODO(postgres): tune for postgres
		let connect_options = sea_orm::ConnectOptions::new(sqlite_url)
			.acquire_timeout(Duration::from_secs(30))
			.sqlx_logging(true)
			.to_owned();
		sea_orm::Database::connect(connect_options).await?
	};

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

#[derive(Debug, Copy, Clone, Serialize, Deserialize, PartialEq, Eq, Default)]
pub enum JournalMode {
	#[serde(alias = "wal")]
	#[default]
	WAL,
	#[serde(alias = "delete")]
	DELETE,
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

/// Splits a vector of items into chunks of at most [`SQLITE_BIND_LIMIT`]
pub fn chunk_vec_into<T, F, R>(items: Vec<T>, map_fn: F) -> Vec<R>
where
	F: Fn(Vec<T>) -> R,
	T: Clone,
{
	if items.is_empty() {
		return vec![];
	}

	items
		.chunks(SQLITE_BIND_LIMIT)
		.map(|chunk| map_fn(chunk.to_vec()))
		.collect()
}

/// Return an estimated batch size for inserts based on the number of parameters per row.
/// This is to reduce query complexity and avoid shit like "too many SQL variables"
pub fn get_insert_batch_size(param_count: usize) -> usize {
	SQLITE_BIND_LIMIT / param_count
}

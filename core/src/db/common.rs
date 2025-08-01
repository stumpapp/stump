use std::str::FromStr;

use sea_orm::{self, FromQueryResult};
use serde::{Deserialize, Serialize};

use crate::{error::CoreResult, CoreError};

#[derive(Deserialize, Serialize, Debug, Default)]
pub struct CountQueryReturn {
	pub count: i64,
}

#[derive(Deserialize, Debug)]
pub struct SeriesMediaCountQueryReturn {
	pub series_id: String,
	pub count: i64,
}

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

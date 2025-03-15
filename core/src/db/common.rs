use std::{collections::HashMap, str::FromStr};

use entity::sea_orm::{self, FromQueryResult};
use prisma_client_rust::{raw, PrismaValue, QueryError};
use serde::{Deserialize, Serialize};

use crate::{error::CoreResult, prisma::PrismaClient, CoreError};

#[derive(Deserialize, Serialize, Debug, Default)]
pub struct CountQueryReturn {
	pub count: i64,
}

#[derive(Deserialize, Debug)]
pub struct SeriesMediaCountQueryReturn {
	pub series_id: String,
	pub count: i64,
}

// TODO: Replace pretty much all of these once prisma client supports relation counts. That's
// all this trait is used for. See the various FIXME notes throughout that say:
// PCR doesn't support relation counts yet!
#[async_trait::async_trait]
pub trait PrismaCountTrait {
	async fn media_count(&self) -> CoreResult<i64>;
	async fn media_in_series_count(&self, series_id: String) -> CoreResult<i64>;
	async fn series_count_all(&self) -> CoreResult<i64>;
	async fn series_count(&self, library_id: String) -> CoreResult<i64>;
	async fn series_media_count(
		&self,
		series_ids: Vec<String>,
	) -> Result<HashMap<String, i64>, QueryError>;
}

#[async_trait::async_trait]
impl PrismaCountTrait for PrismaClient {
	async fn media_count(&self) -> CoreResult<i64> {
		let count_res: Vec<CountQueryReturn> = self
			._query_raw(raw!("SELECT COUNT(*) as count FROM media"))
			.exec()
			.await?;

		Ok(match count_res.first() {
			Some(val) => val.count,
			None => 0,
		})
	}

	async fn media_in_series_count(&self, series_id: String) -> CoreResult<i64> {
		let count_res: Vec<CountQueryReturn> = self
			._query_raw(raw!(
				"SELECT COUNT(*) as count FROM media WHERE series_id={}",
				PrismaValue::String(series_id)
			))
			.exec()
			.await?;

		Ok(match count_res.first() {
			Some(val) => val.count,
			None => 0,
		})
	}

	async fn series_count_all(&self) -> CoreResult<i64> {
		let count_res: Vec<CountQueryReturn> = self
			._query_raw(raw!("SELECT COUNT(*) as count FROM series"))
			.exec()
			.await?;

		Ok(match count_res.first() {
			Some(val) => val.count,
			None => 0,
		})
	}

	async fn series_count(&self, library_id: String) -> CoreResult<i64> {
		let count_res: Vec<CountQueryReturn> = self
			._query_raw(raw!(
				"SELECT COUNT(*) as count FROM series WHERE library_id={}",
				PrismaValue::String(library_id)
			))
			.exec()
			.await?;

		Ok(match count_res.first() {
			Some(val) => val.count,
			None => 0,
		})
	}

	// FIXME: this is utterly awful, hoping https://github.com/Brendonovich/prisma-client-rust/issues/24
	// makes this go away...
	async fn series_media_count(
		&self,
		series_ids: Vec<String>,
	) -> Result<HashMap<String, i64>, QueryError> {
		let count_res: Vec<SeriesMediaCountQueryReturn> = self
		._query_raw(raw!(format!("SELECT DISTINCT series_id as series_id, COUNT(*) as count FROM media WHERE series_id in ({}) GROUP BY series_id",
		series_ids
			.into_iter()
			.map(|id| format!("\"{id}\""))
			.collect::<Vec<_>>()
			.join(",")
	).as_str())).exec().await?;

		Ok(count_res
			.iter()
			.map(|data| (data.series_id.clone(), data.count))
			.collect())
	}
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

#[async_trait::async_trait]
pub trait DBPragma {
	async fn get_journal_mode(&self) -> CoreResult<JournalMode>;
	async fn set_journal_mode(&self, mode: JournalMode) -> CoreResult<JournalMode>;
}

#[async_trait::async_trait]
impl DBPragma for PrismaClient {
	async fn get_journal_mode(&self) -> CoreResult<JournalMode> {
		let result_vec = self
			._query_raw::<JournalModeQueryResult>(raw!("PRAGMA journal_mode;"))
			.exec()
			.await?;
		let result = result_vec.first();

		if let Some(record) = result {
			Ok(record.journal_mode)
		} else {
			tracing::warn!("No journal mode found! Defaulting to WAL assumption");
			Ok(JournalMode::default())
		}
	}

	async fn set_journal_mode(&self, mode: JournalMode) -> CoreResult<JournalMode> {
		let result_vec = self
			._query_raw::<JournalModeQueryResult>(raw!(&format!(
				"PRAGMA journal_mode={};",
				mode.as_ref()
			)))
			.exec()
			.await?;
		let record = result_vec.first().ok_or_else(|| {
			CoreError::InternalError("Journal mode failed to be set".to_string())
		})?;

		Ok(record.journal_mode)
	}
}

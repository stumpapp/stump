use std::collections::HashMap;

use prisma_client_rust::{raw, PrismaValue};
use serde::Deserialize;

use crate::{prisma::PrismaClient, types::CoreResult};

use super::migration::CountQueryReturn;

#[derive(Deserialize, Debug)]
pub struct SeriesMediaCountQueryReturn {
	pub series_id: String,
	pub count: i64,
}

// TODO: Replace pretty much all of these once prisma client suports relation counts. That's
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
	) -> CoreResult<HashMap<String, i64>>;
}

#[async_trait::async_trait]
impl PrismaCountTrait for PrismaClient {
	async fn media_count(&self) -> CoreResult<i64> {
		let count_res: Vec<CountQueryReturn> = self
			._query_raw(raw!("SELECT COUNT(*) as count FROM media"))
			.exec()
			.await?;

		Ok(match count_res.get(0) {
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

		Ok(match count_res.get(0) {
			Some(val) => val.count,
			None => 0,
		})
	}

	async fn series_count_all(&self) -> CoreResult<i64> {
		let count_res: Vec<CountQueryReturn> = self
			._query_raw(raw!("SELECT COUNT(*) as count FROM series"))
			.exec()
			.await?;

		Ok(match count_res.get(0) {
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

		Ok(match count_res.get(0) {
			Some(val) => val.count,
			None => 0,
		})
	}

	// FIXME: this is utterly awful, hoping https://github.com/Brendonovich/prisma-client-rust/issues/24
	// makes this go away...
	async fn series_media_count(
		&self,
		series_ids: Vec<String>,
	) -> CoreResult<HashMap<String, i64>> {
		let count_res: Vec<SeriesMediaCountQueryReturn> = self
		._query_raw(raw!(format!("SELECT DISTINCT series_id as series_id, COUNT(*) as count FROM media WHERE series_id in ({}) GROUP BY series_id",
		series_ids
			.into_iter()
			.map(|id| format!("\"{}\"", id))
			.collect::<Vec<_>>()
			.join(",")
	).as_str())).exec().await?;

		Ok(count_res
			.iter()
			.map(|data| (data.series_id.to_owned(), data.count))
			.collect())
	}
}

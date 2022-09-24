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

// TODO: Replace pretty much all of these once prisma client 0.6 comes out... Count queries and
// relation counting is expected in that release.
#[async_trait::async_trait]
pub trait PrismaClientTrait {
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
impl PrismaClientTrait for PrismaClient {
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

// pub trait FindManyTrait {
// 	fn paginated(self, page_params: PageParams) -> Self;
// }

// impl<Where, With, OrderBy, Cursor, Set, Data> FindManyTrait
// 	for FindMany<'_, Where, With, OrderBy, Cursor, Set, Data>
// where
// 	Where: Into<SerializedWhere>,
// 	With: Into<Selection>,
// 	OrderBy: Into<(String, PrismaValue)>,
// 	Cursor: Into<Where>,
// 	Set: Into<(String, PrismaValue)>,
// 	Data: DeserializeOwned,
// {
// 	fn paginated(self, page_params: PageParams) -> Self {
// 		let skip = match page_params.zero_based {
// 			true => page_params.page * page_params.page_size,
// 			false => (page_params.page - 1) * page_params.page_size,
// 		} as i64;

// 		let take = page_params.page_size as i64;

// 		self.skip(skip).take(take)
// 	}
// }

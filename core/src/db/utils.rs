use prisma_client_rust::{
	query_core::Selection, raw, FindMany, PrismaValue, SerializedWhere,
};
use rocket::serde::DeserializeOwned;

use crate::{
	prisma::PrismaClient,
	types::{alias::ApiResult, pageable::PageParams},
};

use super::migration::CountQueryReturn;

#[async_trait::async_trait]
pub trait PrismaClientTrait {
	async fn media_count(&self) -> ApiResult<u32>;
	async fn series_media_count(&self, series_id: String) -> ApiResult<u32>;
}

#[async_trait::async_trait]
impl PrismaClientTrait for PrismaClient {
	async fn media_count(&self) -> ApiResult<u32> {
		let count_res: Vec<CountQueryReturn> = self
			._query_raw(raw!("SELECT COUNT(*) as count FROM media"))
			.await?;

		Ok(match count_res.get(0) {
			Some(val) => val.count,
			None => 0,
		})
	}

	async fn series_media_count(&self, series_id: String) -> ApiResult<u32> {
		let count_res: Vec<CountQueryReturn> = self
			._query_raw(raw!(
				"SELECT COUNT(*) as count FROM media WHERE seriesId={}",
				PrismaValue::String(series_id)
			))
			.await?;

		Ok(match count_res.get(0) {
			Some(val) => val.count,
			None => 0,
		})
	}
}

pub trait FindManyTrait {
	fn paginated(self, page_params: PageParams) -> Self;
}

impl<Where, With, OrderBy, Cursor, Set, Data> FindManyTrait
	for FindMany<'_, Where, With, OrderBy, Cursor, Set, Data>
where
	Where: Into<SerializedWhere>,
	With: Into<Selection>,
	OrderBy: Into<(String, PrismaValue)>,
	Cursor: Into<(String, PrismaValue)>,
	Set: Into<(String, PrismaValue)>,
	Data: DeserializeOwned,
{
	fn paginated(self, page_params: PageParams) -> Self {
		let skip = match page_params.zero_based {
			true => page_params.page * page_params.page_size,
			false => (page_params.page - 1) * page_params.page_size,
		} as i64;

		let take = page_params.page_size as i64;

		self.skip(skip).take(take)
	}
}

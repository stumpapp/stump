use prisma_client_rust::{raw, PrismaValue};

use crate::{prisma::PrismaClient, types::alias::ApiResult};

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

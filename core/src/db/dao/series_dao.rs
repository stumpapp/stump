use std::sync::Arc;

use prisma_client_rust::{raw, PrismaValue};

use crate::{
	db::models::Series,
	prelude::{CoreError, CoreResult},
	prisma::{library, series, PrismaClient},
};

use super::{Dao, DaoCount};

pub struct SeriesDao {
	client: Arc<PrismaClient>,
}

impl SeriesDao {
	pub async fn find_recently_added(
		&self,
		skip: i64,
		take: i64,
	) -> CoreResult<Vec<Series>> {
		let series_with_count = self
			.client
			._query_raw::<Series>(raw!(
				r#"
				SELECT
					series.id as id,
					series.name as name,
					series.path as path,
					series.description as description,
					series.status as status,
					series.updated_at as updated_at,
					series.created_at as created_at,
					series.library_id as library_id,
					COUNT(series_media.id) as media_count
				FROM 
					series 
				LEFT OUTER JOIN 
					media series_media
				ON 
					series_media.series_id = series.id
				GROUP BY 
					series.id
				ORDER BY
					series.created_at DESC
				LIMIT {} OFFSET {}"#,
				PrismaValue::Int(take),
				PrismaValue::Int(skip)
			))
			.exec()
			.await?;

		Ok(series_with_count)
	}
}

#[async_trait::async_trait]
impl DaoCount for SeriesDao {
	async fn count_all(&self) -> CoreResult<i64> {
		let count = self.client.series().count(vec![]).exec().await?;

		Ok(count)
	}
}

#[async_trait::async_trait]
impl Dao for SeriesDao {
	type Model = Series;

	fn new(client: Arc<PrismaClient>) -> Self {
		Self { client }
	}

	async fn insert(&self, data: Self::Model) -> CoreResult<Self::Model> {
		let created_series = self
			.client
			.series()
			.create(
				data.name,
				data.path,
				vec![
					series::library::connect(library::id::equals(data.library_id)),
					series::status::set(data.status.to_string()),
				],
			)
			.exec()
			.await?;

		Ok(Self::Model::from(created_series))
	}

	async fn delete(&self, id: &str) -> CoreResult<Self::Model> {
		let deleted_series = self
			.client
			.series()
			.delete(series::id::equals(id.to_string()))
			.exec()
			.await?;

		Ok(Series::from(deleted_series))
	}

	async fn find_by_id(&self, id: &str) -> CoreResult<Self::Model> {
		let series = self
			.client
			.series()
			.find_unique(series::id::equals(id.to_string()))
			.exec()
			.await?;

		if series.is_none() {
			return Err(CoreError::NotFound(format!(
				"Series with id {} not found",
				id
			)));
		}

		Ok(Series::from(series.unwrap()))
	}

	async fn find_all(&self) -> CoreResult<Vec<Self::Model>> {
		let series = self.client.series().find_many(vec![]).exec().await?;

		Ok(series.into_iter().map(Series::from).collect())
	}

	async fn find_paginated(&self, skip: i64, take: i64) -> CoreResult<Vec<Self::Model>> {
		let series = self
			.client
			.series()
			.find_many(vec![])
			.skip(skip)
			.take(take)
			.exec()
			.await?;

		Ok(series.into_iter().map(Series::from).collect())
	}
}

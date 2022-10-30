use std::sync::Arc;

use crate::{
	db::models::Series,
	prelude::{CoreError, CoreResult},
	prisma::{library, series, PrismaClient},
};

use super::Dao;

pub struct SeriesDao {
	client: Arc<PrismaClient>,
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

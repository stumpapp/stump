use std::sync::Arc;

use crate::{
	db::models::LibraryOptions,
	prelude::{CoreError, CoreResult},
	prisma::{library_options, PrismaClient},
};

use super::Dao;

pub struct LibraryOptionsDao {
	client: Arc<PrismaClient>,
}

#[async_trait::async_trait]
impl Dao for LibraryOptionsDao {
	type Model = LibraryOptions;

	fn new(client: Arc<PrismaClient>) -> Self {
		Self { client }
	}

	async fn insert(&self, data: Self::Model) -> CoreResult<Self::Model> {
		let created_library_options = self
			.client
			.library_options()
			.create(vec![
				library_options::convert_rar_to_zip::set(data.convert_rar_to_zip),
				library_options::hard_delete_conversions::set(
					data.hard_delete_conversions,
				),
				library_options::create_webp_thumbnails::set(data.create_webp_thumbnails),
				library_options::library_pattern::set(data.library_pattern.to_string()),
			])
			.exec()
			.await?;

		Ok(LibraryOptions::from(created_library_options))
	}

	async fn delete(&self, id: &str) -> CoreResult<Self::Model> {
		let deleted_library_options = self
			.client
			.library_options()
			.delete(library_options::id::equals(id.to_string()))
			.exec()
			.await?;

		Ok(LibraryOptions::from(deleted_library_options))
	}

	async fn find_by_id(&self, id: &str) -> CoreResult<Self::Model> {
		let library_options = self
			.client
			.library_options()
			.find_unique(library_options::id::equals(id.to_string()))
			.exec()
			.await?;

		if library_options.is_none() {
			return Err(CoreError::NotFound(format!(
				"LibraryOptions with id {} not found",
				id
			)));
		}

		Ok(LibraryOptions::from(library_options.unwrap()))
	}

	async fn find_all(&self) -> CoreResult<Vec<Self::Model>> {
		let library_options = self
			.client
			.library_options()
			.find_many(vec![])
			.exec()
			.await?;

		Ok(library_options
			.into_iter()
			.map(LibraryOptions::from)
			.collect())
	}

	async fn find_paginated(&self, skip: i64, take: i64) -> CoreResult<Vec<Self::Model>> {
		let library_options = self
			.client
			.library_options()
			.find_many(vec![])
			.skip(skip)
			.take(take)
			.exec()
			.await?;

		Ok(library_options
			.into_iter()
			.map(LibraryOptions::from)
			.collect())
	}
}

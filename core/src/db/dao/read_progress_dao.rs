use std::sync::Arc;

use crate::{
	db::models::ReadProgress,
	prelude::{CoreError, CoreResult},
	prisma::{
		media,
		read_progress::{self, UniqueWhereParam},
		user, PrismaClient,
	},
};

use super::{Dao, DaoUpdate};

pub struct ReadProgressDaoImpl {
	client: Arc<PrismaClient>,
}

#[async_trait::async_trait]
impl Dao for ReadProgressDaoImpl {
	type Model = ReadProgress;

	fn new(client: Arc<PrismaClient>) -> Self {
		Self { client }
	}

	async fn insert(&self, data: Self::Model) -> CoreResult<Self::Model> {
		if data.media_id.is_empty() {
			return Err(CoreError::InvalidQuery(
				"ReadProgress::media_id must be set".to_string(),
			));
		} else if data.user_id.is_empty() {
			return Err(CoreError::InvalidQuery(
				"ReadProgress::user_id must be set".to_string(),
			));
		}

		let created_read_progress = self
			.client
			.read_progress()
			.create(
				data.page,
				media::id::equals(data.media_id),
				user::id::equals(data.user_id),
				vec![],
			)
			.exec()
			.await?;

		Ok(ReadProgress::from(created_read_progress))
	}

	async fn delete(&self, id: &str) -> CoreResult<Self::Model> {
		let deleted_read_progress = self
			.client
			.read_progress()
			.delete(read_progress::id::equals(id.to_string()))
			.exec()
			.await?;

		Ok(ReadProgress::from(deleted_read_progress))
	}

	async fn find_by_id(&self, id: &str) -> CoreResult<Self::Model> {
		let read_progress = self
			.client
			.read_progress()
			.find_unique(read_progress::id::equals(id.to_string()))
			.exec()
			.await?;

		if read_progress.is_none() {
			return Err(CoreError::NotFound(format!(
				"ReadProgress with id {} not found",
				id
			)));
		}

		Ok(ReadProgress::from(read_progress.unwrap()))
	}

	async fn find_all(&self) -> CoreResult<Vec<Self::Model>> {
		let read_progress = self.client.read_progress().find_many(vec![]).exec().await?;

		Ok(read_progress.into_iter().map(ReadProgress::from).collect())
	}
}

#[async_trait::async_trait]
impl DaoUpdate for ReadProgressDaoImpl {
	type Model = ReadProgress;

	async fn update(&self, _id: &str, _data: Self::Model) -> CoreResult<Self::Model> {
		unreachable!("ReadProgressDaoImpl::update will not be implemented");
	}

	async fn upsert(&self, data: Self::Model) -> CoreResult<Self::Model> {
		let read_progress = self
			.client
			.read_progress()
			.upsert(
				UniqueWhereParam::UserIdMediaIdEquals(
					data.user_id.clone(),
					data.id.clone(),
				),
				(
					data.page,
					media::id::equals(data.media_id.clone()),
					user::id::equals(data.user_id.clone()),
					vec![],
				),
				vec![read_progress::page::set(data.page)],
			)
			.exec()
			.await?;

		Ok(ReadProgress::from(read_progress))
	}
}

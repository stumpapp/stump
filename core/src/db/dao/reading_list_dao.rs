use std::sync::Arc;

use crate::{
	db::models::ReadingList,
	prelude::{CoreError, CoreResult},
	prisma::{media, reading_list, user, PrismaClient},
};

use super::Dao;

pub struct ReadingListDaoImpl {
	client: Arc<PrismaClient>,
}

#[async_trait::async_trait]
impl Dao for ReadingListDaoImpl {
	type Model = ReadingList;

	fn new(client: Arc<PrismaClient>) -> Self {
		Self { client }
	}

	async fn insert(&self, data: Self::Model) -> CoreResult<Self::Model> {
		let media_ids = data
			.media
			.map(|m| m.into_iter().map(|m| m.id).collect::<Vec<String>>())
			.unwrap_or_default();

		let mut params = Vec::with_capacity(1);
		if !media_ids.is_empty() {
			params.push(reading_list::media::connect(
				media_ids
					.iter()
					.map(|id| media::id::equals(id.to_string()))
					.collect(),
			));
		}

		let reading_list = self
			.client
			.reading_list()
			.create(
				data.name.to_owned(),
				user::id::equals(data.creating_user_id.to_owned()),
				params,
			)
			.with(reading_list::media::fetch(vec![]))
			.exec()
			.await?;

		Ok(ReadingList::from(reading_list))
	}

	async fn delete(&self, id: &str) -> CoreResult<Self::Model> {
		let reading_list = self
			.client
			.reading_list()
			.delete(reading_list::id::equals(id.to_string()))
			.exec()
			.await?;

		Ok(ReadingList::from(reading_list))
	}

	async fn find_by_id(&self, id: &str) -> CoreResult<Self::Model> {
		let reading_list = self
			.client
			.reading_list()
			.find_unique(reading_list::id::equals(id.to_string()))
			.with(reading_list::media::fetch(vec![]))
			.exec()
			.await?;

		if reading_list.is_none() {
			return Err(CoreError::NotFound(format!(
				"Reading list with ID {} not found",
				id
			)));
		}

		Ok(ReadingList::from(reading_list.unwrap()))
	}

	async fn find_all(&self) -> CoreResult<Vec<Self::Model>> {
		let reading_lists = self
			.client
			.reading_list()
			.find_many(vec![])
			.with(reading_list::media::fetch(vec![]))
			.exec()
			.await?;

		Ok(reading_lists.into_iter().map(ReadingList::from).collect())
	}
}

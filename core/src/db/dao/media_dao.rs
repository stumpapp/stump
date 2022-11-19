use std::sync::Arc;

use prisma_client_rust::{raw, Direction};

use crate::{
	db::models::Media,
	prelude::{CoreError, CoreResult, PageBounds},
	prisma::{media, read_progress, series, PrismaClient},
};

use super::{Dao, DaoBatch};

#[async_trait::async_trait]
pub trait MediaDao: Dao {
	async fn get_in_progress_media(
		&self,
		viewer_id: &str,
		page_bounds: PageBounds,
	) -> CoreResult<Vec<Media>>;

	async fn get_duplicate_media(&self) -> CoreResult<Vec<Media>>;
	// async fn patch(&self, media: Media, partial: MediaPatch) -> CoreResult<Media>;
}

pub struct MediaDaoImpl {
	client: Arc<PrismaClient>,
}

#[async_trait::async_trait]
impl MediaDao for MediaDaoImpl {
	async fn get_in_progress_media(
		&self,
		viewer_id: &str,
		page_bounds: PageBounds,
	) -> CoreResult<Vec<Media>> {
		let progresses_with_media = self
			.client
			.read_progress()
			.find_many(vec![
				read_progress::user_id::equals(viewer_id.to_string()),
				read_progress::is_completed::equals(false),
			])
			.with(read_progress::media::fetch())
			.order_by(read_progress::updated_at::order(Direction::Desc))
			.skip(page_bounds.skip)
			.take(page_bounds.take)
			.exec()
			.await?;

		Ok(progresses_with_media
			.into_iter()
			.filter(|progress| progress.media.is_some())
			.map(Media::from_progress)
			.filter_map(Result::ok)
			.collect())
	}

	async fn get_duplicate_media(&self) -> CoreResult<Vec<Media>> {
		let duplicates = self.client
			._query_raw::<Media>(raw!("SELECT * FROM media WHERE checksum IN (SELECT checksum FROM media GROUP BY checksum HAVING COUNT(*) > 1)"))
			.exec()
			.await?;

		Ok(duplicates)
	}
}

#[async_trait::async_trait]
impl Dao for MediaDaoImpl {
	type Model = Media;

	fn new(client: Arc<PrismaClient>) -> Self {
		Self { client }
	}

	async fn insert(&self, data: Self::Model) -> CoreResult<Self::Model> {
		let created_media = self
			.client
			.media()
			.create(
				data.name.to_owned(),
				data.size,
				data.extension.to_owned(),
				data.pages,
				data.path.to_owned(),
				vec![
					media::checksum::set(data.checksum.to_owned()),
					media::description::set(data.description.to_owned()),
					media::series::connect(series::id::equals(data.series_id.to_owned())),
				],
			)
			.exec()
			.await?;

		Ok(Media::from(created_media))
	}

	async fn delete(&self, id: &str) -> CoreResult<Self::Model> {
		let deleted_media = self
			.client
			.media()
			.delete(media::id::equals(id.to_string()))
			.exec()
			.await?;

		Ok(Media::from(deleted_media))
	}

	async fn find_all(&self) -> CoreResult<Vec<Self::Model>> {
		Ok(self
			.client
			.media()
			.find_many(vec![])
			.exec()
			.await?
			.into_iter()
			.map(Media::from)
			.collect())
	}

	async fn find_by_id(&self, id: &str) -> CoreResult<Self::Model> {
		let media = self
			.client
			.media()
			.find_unique(media::id::equals(id.to_string()))
			.exec()
			.await?;

		if media.is_none() {
			return Err(CoreError::NotFound(format!(
				"Media with id {} not found.",
				id
			)));
		}

		Ok(Media::from(media.unwrap()))
	}
}

#[async_trait::async_trait]
impl DaoBatch for MediaDaoImpl {
	type Model = Media;

	async fn insert_many(&self, data: Vec<Self::Model>) -> CoreResult<Vec<Self::Model>> {
		let queries = data.into_iter().map(|media| {
			self.client.media().create(
				media.name,
				media.size,
				media.extension,
				media.pages,
				media.path,
				vec![
					media::checksum::set(media.checksum),
					media::description::set(media.description),
					media::series::connect(series::id::equals(media.series_id)),
				],
			)
		});

		Ok(self
			.client
			._batch(queries)
			.await?
			.into_iter()
			.map(Media::from)
			.collect())
	}

	async fn _insert_batch<T>(&self, models: T) -> CoreResult<Vec<Self::Model>>
	where
		T: Iterator<Item = Self::Model> + Send + Sync,
	{
		let queries = models.map(|media| {
			self.client.media().create(
				media.name,
				media.size,
				media.extension,
				media.pages,
				media.path,
				vec![
					media::checksum::set(media.checksum),
					media::description::set(media.description),
					media::series::connect(series::id::equals(media.series_id)),
				],
			)
		});

		let created_media = self.client._batch(queries).await?;

		Ok(created_media.into_iter().map(Media::from).collect())
	}

	async fn delete_many(&self, ids: Vec<String>) -> CoreResult<i64> {
		Ok(self
			.client
			.media()
			.delete_many(vec![media::id::in_vec(ids)])
			.exec()
			.await?)
	}

	async fn _delete_batch(&self, ids: Vec<String>) -> CoreResult<Vec<Self::Model>> {
		let queries = ids
			.into_iter()
			.map(|id| self.client.media().delete(media::id::equals(id)));

		let deleted_media = self.client._batch(queries).await?;

		Ok(deleted_media.into_iter().map(Media::from).collect())
	}
}

// #[async_trait::async_trait]
// impl DaoUpsert for MediaDao {
// 	type Model = Media;

// 	async fn upsert(&self, data: &Self::Model) -> CoreResult<Self::Model> {
// 		let client = self.client;
// 		let resulting_media = client
// 			.media()
// 			.upsert(
// 				media::id::equals(data.id.clone()),
// 				(
// 					data.name.clone(),
// 					data.size,
// 					data.extension.clone(),
// 					data.pages,
// 					data.path.clone(),
// 					vec![
// 						media::checksum::set(data.checksum.clone()),
// 						media::description::set(data.description.clone()),
// 						media::series::connect(series::id::equals(
// 							data.series_id.clone(),
// 						)),
// 					],
// 				),
// 				vec![
// 					media::name::set(data.name.clone()),
// 					media::size::set(data.size),
// 					media::extension::set(data.extension.clone()),
// 					media::pages::set(data.pages),
// 					media::path::set(data.path.clone()),
// 					media::checksum::set(data.checksum.clone()),
// 					media::description::set(data.description.clone()),
// 					media::series::connect(series::id::equals(data.series_id.clone())),
// 				],
// 			)
// 			.exec()
// 			.await?;

// 		Ok(Media::from(resulting_media))
// 	}
// }

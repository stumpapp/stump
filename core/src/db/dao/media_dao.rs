use std::sync::Arc;

use prisma_client_rust::{raw, PrismaValue, QueryError};
use tracing::trace;

use crate::{
	db::{
		entity::{FileStatus, Media},
		query::pagination::{PageParams, Pageable},
		CountQueryReturn,
	},
	prisma::{media, media_metadata, series, PrismaClient},
	CoreError, CoreResult,
};

use super::DAO;

pub struct MediaDAO {
	client: Arc<PrismaClient>,
}

impl DAO for MediaDAO {
	type Entity = Media;

	fn new(client: Arc<PrismaClient>) -> Self {
		Self { client }
	}
}

impl MediaDAO {
	/// Creates a new media in the database. To reduce code duplication, internally
	/// this function invokes `create_many` with a single element.
	pub async fn create(&self, media: Media) -> CoreResult<Media> {
		let result = Self::create_many(self, vec![media]).await?;
		Ok(result
			.first()
			.ok_or(CoreError::Unknown("Failed to insert media".to_string()))?
			.to_owned())
	}

	/// Creates many media in the database from the given list within a transaction.
	/// Will also create and connect metadata if it is present.
	// FIXME: this is so vile lol refactor once neseted create is supported:
	// https://github.com/Brendonovich/prisma-client-rust/issues/44
	pub async fn create_many(&self, media: Vec<Media>) -> CoreResult<Vec<Media>> {
		let result: Result<Vec<Media>, QueryError> = self
			.client
			._transaction()
			.run(|client| async move {
				let mut ret = vec![];

				for media in media {
					let created_metadata = if let Some(metadata) = media.metadata {
						let params = metadata.into_prisma();
						let created_metadata =
							client.media_metadata().create(params).exec().await?;
						Some(created_metadata)
					} else {
						None
					};
					trace!(?created_metadata, "Metadata insertion result");

					let created_media = client
						.media()
						.create(
							media.name,
							media.size,
							media.extension,
							media.pages,
							media.path,
							vec![
								media::hash::set(media.hash),
								media::series::connect(series::id::equals(
									media.series_id,
								)),
							],
						)
						.exec()
						.await?;
					trace!(?created_media, "Media insertion result");

					if let Some(media_metadata) = created_metadata {
						let updated_media = client
							.media()
							.update(
								media::id::equals(created_media.id),
								// vec![media::metadata_id::set(Some(media_metadata.id))],
								vec![media::metadata::connect(
									media_metadata::id::equals(media_metadata.id),
								)],
							)
							.with(media::metadata::fetch())
							.exec()
							.await?;
						trace!(?updated_media, "Media update result");

						ret.push(Media::from(updated_media));
					} else {
						ret.push(Media::from(created_media));
					}
				}

				Ok(ret)
			})
			.await;

		Ok(result?)
	}

	/// Gets a page of media with matching file hashes.
	pub async fn get_duplicate_media(
		&self,
		page_params: PageParams,
	) -> CoreResult<Pageable<Vec<Media>>> {
		let page_bounds = page_params.get_page_bounds();

		let duplicated_media_page = self
			.client
			._query_raw::<Media>(raw!(
				r#"
				SELECT * FROM media
				WHERE hash IN (
					SELECT hash FROM media GROUP BY hash HAVING COUNT(*) > 1
				)
				LIMIT {} OFFSET {}"#,
				PrismaValue::Int(page_bounds.take),
				PrismaValue::Int(page_bounds.skip)
			))
			.exec()
			.await?;

		let count_result = self
			.client
			._query_raw::<CountQueryReturn>(raw!(
				r#"
				SELECT COUNT(*) as count FROM media
				WHERE hash IN (
					SELECT hash FROM media GROUP BY hash HAVING COUNT(*) s> 1
				)"#
			))
			.exec()
			.await?;

		if let Some(db_total) = count_result.first() {
			Ok(Pageable::with_count(
				duplicated_media_page,
				db_total.count,
				page_params,
			))
		} else {
			Err(CoreError::InternalError(
				"A failure occurred when trying to query for the count of duplicate media".to_string(),
			))
		}
	}

	/// Updates the given media in the database.
	pub async fn update_many(&self, media: Vec<Media>) -> CoreResult<Vec<Media>> {
		let queries = media.into_iter().map(|media| {
			self.client.media().update(
				media::id::equals(media.id),
				vec![
					media::name::set(media.name),
					media::size::set(media.size),
					media::pages::set(media.pages),
					media::hash::set(media.hash),
				],
			)
		});

		let updated_media = self.client._batch(queries).await?;
		Ok(updated_media.into_iter().map(Media::from).collect())
	}

	/// Marks all media in the given paths as missing. Returns the number of rows affected.
	pub async fn mark_paths_missing(&self, paths: Vec<String>) -> CoreResult<i64> {
		let rows_affected = self
			.client
			.media()
			.update_many(
				vec![media::path::in_vec(paths)],
				vec![media::status::set(FileStatus::Missing.to_string())],
			)
			.exec()
			.await?;

		Ok(rows_affected)
	}
}

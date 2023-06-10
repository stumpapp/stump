use std::sync::Arc;
use tracing::trace;

use crate::{
	db::entity::{FileStatus, Library},
	prisma::{library, media, series, PrismaClient},
	CoreResult,
};

use super::DAO;

pub struct LibraryDAO {
	client: Arc<PrismaClient>,
}

impl DAO for LibraryDAO {
	type Entity = Library;

	fn new(client: Arc<PrismaClient>) -> Self {
		Self { client }
	}
}

impl LibraryDAO {
	pub async fn mark_library_missing(
		&self,
		library: &library::Data,
	) -> CoreResult<Library> {
		let series_ids = library
			.series()
			.unwrap_or(&vec![])
			.iter()
			.map(|s| s.id.clone())
			.collect();

		let (updated_library, affected_series, affected_media) = self
			.client
			._transaction()
			.run(|client| async move {
				let updated_library = client
					.library()
					.update(
						library::id::equals(library.id.clone()),
						vec![library::status::set(FileStatus::Missing.to_string())],
					)
					.exec()
					.await?;

				let affected_series = client
					.series()
					.update_many(
						vec![series::library_id::equals(Some(library.id.clone()))],
						vec![series::status::set(FileStatus::Missing.to_string())],
					)
					.exec()
					.await?;

				client
					.media()
					.update_many(
						vec![media::series_id::in_vec(series_ids)],
						vec![media::status::set(FileStatus::Missing.to_string())],
					)
					.exec()
					.await
					.map(|affected_media| {
						(updated_library, affected_series, affected_media)
					})
			})
			.await?;

		trace!(
			library_id = library.id.as_str(),
			affected_series = affected_series,
			affected_media = affected_media,
			"Marked library as missing"
		);

		Ok(Library::from(updated_library))
	}
}

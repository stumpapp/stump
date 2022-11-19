use std::sync::Arc;

use prisma_client_rust::{raw, PrismaValue};

use crate::{
	db::models::Series,
	prelude::{CoreError, CoreResult, PageBounds},
	prisma::{library, series, PrismaClient},
};

use super::{Dao, DaoCount};

pub struct SeriesDaoImpl {
	client: Arc<PrismaClient>,
}

impl SeriesDaoImpl {
	// TODO: Once PCR is more mature, I think this kind of query can be possible without writing raw SQL.
	// I know it's possible in JS prisma, so hopefully these kinds of manual queries can be phased out.
	/// Returns a vector of [Series] in the order of most recently created in the database.
	/// The number of books and unread books is included in the resulting [Series] objects.
	/// This is used to populate the "Recently Added Series" section of the UI.
	pub async fn find_recently_added(
		&self,
		viewer_id: &str,
		page_bounds: PageBounds,
	) -> CoreResult<Vec<Series>> {
		let series_with_count = self
			.client
			._query_raw::<Series>(raw!(
				r#"
				SELECT
					series.id AS id,
					series.name AS name,
					series.path AS path,
					series.description AS description,
					series.status AS status,
					series.updated_at AS updated_at,
					series.created_at AS created_at,
					series.library_id AS library_id,
					COUNT(series_media.id) AS media_count,
					COUNT(series_media.id) - COUNT(media_progress.id) AS unread_media_count
				FROM 
					series 
					LEFT OUTER JOIN media series_media ON series_media.series_id = series.id
					LEFT OUTER JOIN read_progresses media_progress ON media_progress.media_id = series_media.id AND media_progress.user_id = {}
				GROUP BY 
					series.id
				ORDER BY
					series.created_at DESC
				LIMIT {} OFFSET {}"#,
				PrismaValue::String(viewer_id.to_string()),
				PrismaValue::Int(page_bounds.take),
				PrismaValue::Int(page_bounds.skip)
			))
			.exec()
			.await?;

		Ok(series_with_count)
	}
}

#[async_trait::async_trait]
impl DaoCount for SeriesDaoImpl {
	async fn count_all(&self) -> CoreResult<i64> {
		let count = self.client.series().count(vec![]).exec().await?;

		Ok(count)
	}
}

#[async_trait::async_trait]
impl Dao for SeriesDaoImpl {
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
}

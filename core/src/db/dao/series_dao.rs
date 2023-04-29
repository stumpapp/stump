use std::sync::Arc;

use prisma_client_rust::{raw, PrismaValue};
use tracing::{error, trace};

use crate::{
	db::{
		common::CountQueryReturn,
		entity::{Media, Series},
	},
	error::{CoreError, CoreResult},
	prelude::{PageParams, Pageable},
	prisma::{library, media, series, PrismaClient},
};

use super::{Dao, DaoCount};

#[async_trait::async_trait]
pub trait SeriesDao {
	async fn get_recently_added_series_page(
		&self,
		viewer_id: &str,
		page_params: PageParams,
	) -> CoreResult<Pageable<Vec<Series>>>;
	async fn get_series_media(&self, series_id: &str) -> CoreResult<Vec<Media>>;
}

pub struct SeriesDaoImpl {
	client: Arc<PrismaClient>,
}

#[async_trait::async_trait]
impl SeriesDao for SeriesDaoImpl {
	// TODO: Just move this query out of this file...
	async fn get_recently_added_series_page(
		&self,
		viewer_id: &str,
		page_params: PageParams,
	) -> CoreResult<Pageable<Vec<Series>>> {
		let page_bounds = page_params.get_page_bounds();
		let recently_added_series = self
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

		// NOTE: removed the `GROUP BY` clause from the query below because it would cause an empty count result
		// set to be returned. This makes sense, but is ~annoying~.
		let count_result = self
		.client
		._query_raw::<CountQueryReturn>(raw!(
			r#"
			SELECT
				COUNT(DISTINCT series.id) as count
			FROM 
				series 
				LEFT OUTER JOIN media series_media ON series_media.series_id = series.id
				LEFT OUTER JOIN read_progresses media_progress ON media_progress.media_id = series_media.id AND media_progress.user_id = {}
			ORDER BY
				series.created_at DESC"#,
			PrismaValue::String(viewer_id.to_string())
		))
		.exec()
		.await.map_err(|e| {
			error!(error = ?e, "Failed to compute count of recently added series");
			e
		})?;

		trace!(
			?count_result,
			"Count result for recently added series query."
		);

		if let Some(db_total) = count_result.first() {
			Ok(Pageable::with_count(
				recently_added_series,
				db_total.count,
				page_params,
			))
		} else {
			Err(CoreError::InternalError(
				"A database error occurred while counting recently added series."
					.to_string(),
			))
		}
	}

	async fn get_series_media(&self, series_id: &str) -> CoreResult<Vec<Media>> {
		let series_media = self
			.client
			.media()
			.find_many(vec![media::series_id::equals(Some(series_id.to_string()))])
			.exec()
			.await?;

		Ok(series_media
			.into_iter()
			.map(Media::from)
			.collect::<Vec<Media>>())
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

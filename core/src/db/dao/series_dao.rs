use prisma_client_rust::{raw, PrismaValue};
use std::sync::Arc;
use tracing::{error, trace};

use crate::{
	db::{
		entity::Series,
		query::pagination::{PageParams, Pageable},
		CountQueryReturn,
	},
	prisma::{series, series_metadata, PrismaClient},
	CoreError, CoreResult,
};

use super::DAO;

pub struct SeriesDAO {
	client: Arc<PrismaClient>,
}

impl DAO for SeriesDAO {
	type Entity = Series;

	fn new(client: Arc<PrismaClient>) -> Self {
		Self { client }
	}
}

impl SeriesDAO {
	/// Creates many series in the database from the given list within a transaction.
	/// Will also create and connect metadata if it is present.
	///
	/// NOTE: Internally invokes `do_create_many` to handle the transaction logic.
	/// This function serves as a wrapper to handle the transaction commit/rollback.
	pub async fn create_many(&self, series: Vec<Series>) -> CoreResult<Vec<Series>> {
		// FIXME: this is so vile lol refactor once nested create is supported:
		// https://github.com/Brendonovich/prisma-client-rust/issues/44
		let (tx, client) = self.client._transaction().begin().await?;
		match do_create_many(&client, series).await {
			Ok(v) => {
				tx.commit(client).await?;
				Ok(v)
			},
			Err(e) => {
				tx.rollback(client).await?;
				Err(e)
			},
		}
	}

	pub async fn get_recently_added_series(
		&self,
		viewer_id: &str,
		page_params: PageParams,
	) -> CoreResult<Pageable<Vec<Series>>> {
		let page_bounds = page_params.get_page_bounds();
		// TODO: Not sure yet if OR or AND is better for this query...
		let recently_added_series = self
			.client
			._query_raw::<Series>(raw!(
				r"
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
					LEFT OUTER JOIN series_metadata sm ON sm.series_id = series.id
					LEFT OUTER JOIN media series_media ON series_media.series_id = series.id
					LEFT OUTER JOIN media_metadata mm ON mm.media_id = series_media.id
					LEFT OUTER JOIN read_progresses media_progress ON media_progress.media_id = series_media.id AND media_progress.user_id = {}
					LEFT OUTER JOIN age_restrictions ar ON ar.user_id = {}
					INNER JOIN libraries l ON l.id = series.library_id
					INNER JOIN _LibraryToUser lu ON lu.A = l.id
				WHERE
					lu.B != {} AND (
						ar.age IS NULL OR (
							(ar.restrict_on_unset = FALSE AND mm.age_rating IS NULL) OR mm.age_rating <= ar.age
						) OR (
							(ar.restrict_on_unset = FALSE AND sm.age_rating IS NULL) OR sm.age_rating <= ar.age
						)
					)
				GROUP BY 
					series.id
				ORDER BY
					series.created_at DESC
				LIMIT {} OFFSET {}",
				PrismaValue::String(viewer_id.to_string()),
				PrismaValue::String(viewer_id.to_string()),
				PrismaValue::String(viewer_id.to_string()),
				PrismaValue::Int(page_bounds.take),
				PrismaValue::Int(page_bounds.skip)
			))
			.exec()
			.await?;

		// TODO: Not sure yet if OR or AND is better for this query...
		// NOTE: removed the `GROUP BY` clause from the query below because it would cause an empty count result
		// set to be returned. This makes sense, but is ~annoying~.
		let count_result = self
		.client
		._query_raw::<CountQueryReturn>(raw!(
			r"
			SELECT
				COUNT(DISTINCT series.id) as count
			FROM 
				series 
				LEFT OUTER JOIN series_metadata sm ON sm.series_id = series.id
				LEFT OUTER JOIN media series_media ON series_media.series_id = series.id
				LEFT OUTER JOIN media_metadata mm ON mm.media_id = series_media.id
				LEFT OUTER JOIN read_progresses media_progress ON media_progress.media_id = series_media.id AND media_progress.user_id = {}
				LEFT OUTER JOIN age_restrictions ar ON ar.user_id = {}
			WHERE
				ar.age IS NULL OR (
					(ar.restrict_on_unset = FALSE AND mm.age_rating IS NULL) OR mm.age_rating <= ar.age
				) OR (
					(ar.restrict_on_unset = FALSE AND sm.age_rating IS NULL) OR sm.age_rating <= ar.age
				)
			ORDER BY
				series.created_at DESC",
			PrismaValue::String(viewer_id.to_string()),
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
				&page_params,
			))
		} else {
			Err(CoreError::InternalError(
				"A database error occurred while counting recently added series."
					.to_string(),
			))
		}
	}
}

async fn do_create_many(
	client: &PrismaClient,
	series_list: Vec<Series>,
) -> CoreResult<Vec<Series>> {
	let mut ret = vec![];
	for series in series_list {
		let (filename, path, params, meta_params) = series.create_action();
		let created_series = client
			.series()
			.create(filename, path, params)
			.exec()
			.await?;

		if let Some((meta_type, params)) = meta_params {
			let created_metadata = client
				.series_metadata()
				.create(
					meta_type,
					series::id::equals(created_series.id.clone()),
					params,
				)
				.exec()
				.await?;
			let updated_series = client
				.series()
				.update(
					series::id::equals(created_series.id),
					vec![series::metadata::connect(
						series_metadata::series_id::equals(created_metadata.series_id),
					)],
				)
				.with(series::metadata::fetch())
				.exec()
				.await?;

			ret.push(Series::from(updated_series));
		} else {
			ret.push(Series::from(created_series));
		}
	}

	Ok(ret)
}

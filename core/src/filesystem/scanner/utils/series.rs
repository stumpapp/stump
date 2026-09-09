use std::{
	path::{Path, PathBuf},
	sync::Arc,
	time::Instant,
};

use futures::StreamExt;
use models::{
	entity::{media, series},
	shared::enums::FileStatus,
};
use sea_orm::{
	prelude::*,
	sea_query::{Expr, Query},
	Condition, DatabaseConnection, Set, TransactionTrait,
};
use tokio::task::spawn_blocking;

use crate::{
	config::StumpConfig,
	error::{CoreError, CoreResult},
	filesystem::{
		scanner::utils::BuiltEntityFutures,
		series::{BuiltSeries, SeriesBuilder},
	},
	job::{error::JobError, JobExecuteLog},
};

/// Builds a series from the given path
async fn build_series(for_library: &str, path: &Path) -> CoreResult<BuiltSeries> {
	let path = path.to_path_buf();
	let for_library = for_library.to_string();

	// Spawn a blocking task to handle the IO-intensive operations:
	spawn_blocking(move || SeriesBuilder::new(&path, &for_library).build())
		.await
		.map_err(|e| CoreError::Unknown(e.to_string()))?
}

/// Safely builds a series from a list of paths concurrently
pub(crate) async fn safely_build_series(
	for_library: &str,
	paths: Vec<PathBuf>,
	config: Arc<StumpConfig>,
	reporter: impl Fn(usize),
) -> (Vec<BuiltSeries>, Vec<JobExecuteLog>) {
	let mut logs = vec![];
	let mut created_series = Vec::with_capacity(paths.len());

	let concurrency = config.cpu_concurrency_limit();
	let total_series = paths.len();
	tracing::debug!(total_series, concurrency, "Processing series");

	let start = Instant::now();
	let mut futures: BuiltEntityFutures<BuiltSeries> = BuiltEntityFutures::new();
	let mut cursor = 0usize;

	for path in paths {
		if futures.len() >= concurrency {
			if let Some(result) = futures.next().await {
				match result {
					Ok(series) => {
						created_series.push(series);
					},
					Err((error, path)) => {
						logs.push(
							JobExecuteLog::error(format!(
								"Failed to build series: {:?}",
								error.to_string()
							))
							.with_ctx(format!("Path: {path:?}")),
						);
					},
				}
				reporter(cursor);
				cursor += 1;
			}
		}

		let for_library = for_library.to_string();
		futures.push(Box::pin(async move {
			tracing::trace!(?path, "Starting series build");
			build_series(&for_library, &path)
				.await
				.map_err(|e| (e, path.clone()))
		}));
	}

	while let Some(result) = futures.next().await {
		match result {
			Ok(series) => {
				created_series.push(series);
			},
			Err((error, path)) => {
				logs.push(
					JobExecuteLog::error(format!(
						"Failed to build series: {:?}",
						error.to_string()
					))
					.with_ctx(format!("Path: {path:?}")),
				);
			},
		}
		reporter(cursor);
		cursor += 1;
	}

	let success_count = created_series.len();
	let error_count = logs.len();
	tracing::debug!(elapsed = ?start.elapsed(), success_count, error_count, "Finished batch of series");

	(created_series, logs)
}

/// Inserts a batch of built series into the database within a single transaction
pub(crate) async fn insert_series(
	series: Vec<BuiltSeries>,
	conn: &DatabaseConnection,
) -> Result<Vec<series::Model>, JobError> {
	let mut output = Vec::with_capacity(series.len());

	let txn = conn.begin().await?;

	for BuiltSeries { series, metadata } in series {
		let created_series = series.insert(&txn).await?;

		// I opted to not kill the transaction if metadata insertion fails, I figure this
		// is a best-effort operation and we can always try again later after fixing a bad
		// metadata entry vs killing the entire series creation process over a single bad entry
		if let Some(mut meta) = metadata {
			meta.series_id = Set(created_series.id.clone());
			if let Err(error) = meta.insert(&txn).await {
				tracing::error!(?error, "Failed to insert series metadata");
			}
		}

		output.push(created_series);
	}

	txn.commit().await?;
	tracing::debug!(series_count = output.len(), "Inserted series into database");
	Ok(output)
}

#[derive(Default)]
pub(crate) struct MissingSeriesOutput {
	pub updated_series: u64,
	pub updated_media: u64,
	pub logs: Vec<JobExecuteLog>,
}

pub(crate) async fn handle_missing_series(
	client: &DatabaseConnection,
	path: &str,
) -> Result<MissingSeriesOutput, JobError> {
	let mut output = MissingSeriesOutput::default();

	let affected_rows = series::Entity::update_many()
		.filter(series::Column::Path.eq(path.to_string()))
		.col_expr(
			series::Column::Status,
			Expr::value(FileStatus::Missing.to_string()),
		)
		.exec(client)
		.await
		.map_or_else(
			|error| {
				tracing::error!(error = ?error, "Failed to update missing series");
				output.logs.push(JobExecuteLog::error(format!(
					"Failed to update missing series: {:?}",
					error.to_string()
				)));
				0
			},
			|res| {
				output.updated_series += res.rows_affected;
				res.rows_affected
			},
		);

	if affected_rows > 1 {
		tracing::warn!(
			affected_rows,
			?path,
			"Updated more than one series for path",
		);
	}

	let _affected_media = media::Entity::update_many()
		.filter(
			Condition::any().add(
				media::Column::SeriesId.in_subquery(
					Query::select()
						.column(series::Column::Id)
						.from(series::Entity)
						.and_where(series::Column::Path.eq(path.to_string()))
						.to_owned(),
				),
			),
		)
		.col_expr(
			media::Column::Status,
			Expr::value(FileStatus::Missing.to_string()),
		)
		.exec(client)
		.await
		.map_or_else(
			|error| {
				tracing::error!(?error, "Failed to update missing media");
				output.logs.push(JobExecuteLog::error(format!(
					"Failed to update missing media: {:?}",
					error.to_string()
				)));
				0
			},
			|res| {
				output.updated_media += res.rows_affected;
				res.rows_affected
			},
		);

	Ok(output)
}

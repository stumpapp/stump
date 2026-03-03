use std::collections::VecDeque;
use std::sync::Arc;

use async_graphql::SimpleObject;
use metadata_integrations::{MatchCandidate, SearchQuery};
use models::{
	entity::{media, metadata_fetch_record, metadata_provider_config, series},
	shared::enums::MetadataFetchStatus,
};
use sea_orm::{prelude::*, sea_query::OnConflict, Set};
use serde::{Deserialize, Serialize};

use crate::job::{
	error::JobError, JobExecuteLog, JobExt, JobOutputExt, JobProgress, JobTaskOutput,
	WorkerCtx, WorkingState, WrappedJob,
};

use super::{apply, ProviderClientCache};

type Id = String;

/// The scope of entities to fetch metadata for
#[derive(Clone, Debug, Serialize, Deserialize)]
#[serde(tag = "type")]
pub enum MetadataFetchScope {
	/// Fetch metadata for specific series by ID
	Series(Vec<Id>),
	/// Fetch metadata for all series in a library
	SeriesInLibrary(Id),
	/// Fetch metadata for specific media items by ID
	Media(Vec<Id>),
	/// Fetch metadata for all media in a series
	MediaInSeries(Id),
}

/// Parameters for the metadata fetch job
#[derive(Clone, Debug, Serialize, Deserialize)]
pub struct MetadataFetchJobParams {
	pub scope: MetadataFetchScope,
	/// If true, will re-fetch metadata even if matches already exist
	pub force_refetch: bool,
}

impl MetadataFetchJobParams {
	pub fn new(scope: MetadataFetchScope, force_refetch: bool) -> Self {
		Self {
			scope,
			force_refetch,
		}
	}

	pub fn series(ids: Vec<Id>) -> Self {
		Self::new(MetadataFetchScope::Series(ids), false)
	}

	pub fn series_in_library(library_id: Id) -> Self {
		Self::new(MetadataFetchScope::SeriesInLibrary(library_id), false)
	}

	pub fn media(ids: Vec<Id>) -> Self {
		Self::new(MetadataFetchScope::Media(ids), false)
	}

	pub fn media_in_series(series_id: Id) -> Self {
		Self::new(MetadataFetchScope::MediaInSeries(series_id), false)
	}
}

/// A single task for the metadata fetch job
#[derive(Serialize, Deserialize)]
pub enum MetadataFetchTask {
	/// Fetch metadata for a series
	FetchSeries {
		series_id: String,
		series_name: String,
	},
	/// Fetch metadata for a media item
	FetchMedia {
		media_id: String,
		media_name: String,
		series_name: Option<String>,
	},
}

#[derive(Clone, Serialize, Deserialize, Default, Debug, SimpleObject)]
#[serde(default, rename_all = "camelCase")]
pub struct MetadataFetchJobOutput {
	/// Total number of entities processed
	pub total_processed: u64,
	/// Number of entities where matches were found
	pub matches_found: u64,
	/// Number of entities where no matches were found
	pub no_matches: u64,
	/// Number of entities that were skipped (already have matches)
	pub skipped: u64,
	/// Number of entities that failed during fetch
	pub failed: u64,
	/// Number of entities that were auto-applied
	pub auto_applied: u64,
}

impl JobOutputExt for MetadataFetchJobOutput {
	fn update(&mut self, updated: Self) {
		self.total_processed += updated.total_processed;
		self.matches_found += updated.matches_found;
		self.no_matches += updated.no_matches;
		self.skipped += updated.skipped;
		self.failed += updated.failed;
		self.auto_applied += updated.auto_applied;
	}
}

/// The main job struct for fetching metadata
#[derive(Clone)]
pub struct MetadataFetchJob {
	pub params: MetadataFetchJobParams,
	provider_cache: Option<Arc<ProviderClientCache>>,
}

// Note: We won't persist the provider cache
impl Serialize for MetadataFetchJob {
	fn serialize<S>(&self, serializer: S) -> Result<S::Ok, S::Error>
	where
		S: serde::Serializer,
	{
		self.params.serialize(serializer)
	}
}

impl<'de> Deserialize<'de> for MetadataFetchJob {
	fn deserialize<D>(deserializer: D) -> Result<Self, D::Error>
	where
		D: serde::Deserializer<'de>,
	{
		let params = MetadataFetchJobParams::deserialize(deserializer)?;
		Ok(Self {
			params,
			provider_cache: None,
		})
	}
}

impl MetadataFetchJob {
	pub fn new(params: MetadataFetchJobParams) -> Box<WrappedJob<Self>> {
		WrappedJob::new(Self {
			params,
			provider_cache: None,
		})
	}

	async fn get_or_init_cache(
		&mut self,
		ctx: &WorkerCtx,
	) -> Result<Arc<ProviderClientCache>, JobError> {
		if let Some(cache) = &self.provider_cache {
			return Ok(Arc::clone(cache));
		}

		let encryption_key = ctx.get_encryption_key().await?;

		let cache = Arc::new(ProviderClientCache::new(encryption_key));
		self.provider_cache = Some(Arc::clone(&cache));
		Ok(cache)
	}
}

#[async_trait::async_trait]
impl JobExt for MetadataFetchJob {
	const NAME: &'static str = "metadata_fetch";

	type Output = MetadataFetchJobOutput;
	type Task = MetadataFetchTask;

	fn description(&self) -> Option<String> {
		match &self.params.scope {
			MetadataFetchScope::Series(ids) => {
				Some(format!("Metadata fetch for {} series", ids.len()))
			},
			MetadataFetchScope::SeriesInLibrary(id) => {
				Some(format!("Metadata fetch for series in library {}", id))
			},
			MetadataFetchScope::Media(ids) => {
				Some(format!("Metadata fetch for {} media items", ids.len()))
			},
			MetadataFetchScope::MediaInSeries(id) => {
				Some(format!("Metadata fetch for media in series {}", id))
			},
		}
	}

	async fn init(
		&mut self,
		ctx: &WorkerCtx,
	) -> Result<WorkingState<Self::Output, Self::Task>, JobError> {
		let conn = ctx.conn.as_ref();

		self.get_or_init_cache(ctx).await?;

		// TODO: The names should be entity.metadata.name.or(entity.name)
		let tasks: VecDeque<MetadataFetchTask> = match &self.params.scope {
			MetadataFetchScope::Series(ids) => {
				let series_list = series::Entity::find()
					.filter(series::Column::Id.is_in(ids.clone()))
					.all(conn)
					.await?;

				series_list
					.into_iter()
					.map(|s| MetadataFetchTask::FetchSeries {
						series_id: s.id,
						series_name: s.name,
					})
					.collect()
			},
			MetadataFetchScope::SeriesInLibrary(library_id) => {
				let series_list = series::Entity::find()
					.filter(series::Column::LibraryId.eq(library_id))
					.all(conn)
					.await?;

				series_list
					.into_iter()
					.map(|s| MetadataFetchTask::FetchSeries {
						series_id: s.id,
						series_name: s.name,
					})
					.collect()
			},
			MetadataFetchScope::Media(ids) => {
				let media_list = media::Entity::find()
					.filter(media::Column::Id.is_in(ids.clone()))
					.find_also_related(series::Entity)
					.all(conn)
					.await?;

				media_list
					.into_iter()
					.map(|(m, s)| MetadataFetchTask::FetchMedia {
						media_id: m.id,
						media_name: m.name,
						series_name: s.map(|s| s.name),
					})
					.collect()
			},
			MetadataFetchScope::MediaInSeries(series_id) => {
				let media_list = media::Entity::find()
					.filter(media::Column::SeriesId.eq(series_id))
					.find_also_related(series::Entity)
					.all(conn)
					.await?;

				media_list
					.into_iter()
					.map(|(m, s)| MetadataFetchTask::FetchMedia {
						media_id: m.id,
						media_name: m.name,
						series_name: s.map(|s| s.name),
					})
					.collect()
			},
		};

		ctx.report_progress(JobProgress::msg(&format!(
			"Initialized metadata fetch with {} tasks",
			tasks.len()
		)));

		Ok(WorkingState {
			output: Some(Self::Output::default()),
			tasks,
			completed_tasks: 0,
			logs: vec![],
		})
	}

	async fn execute_task(
		&self,
		ctx: &WorkerCtx,
		task: Self::Task,
	) -> Result<JobTaskOutput<Self>, JobError> {
		let conn = ctx.conn.as_ref();
		let mut output = Self::Output::default();

		let provider_cache = self.provider_cache.as_ref().ok_or_else(|| {
			JobError::TaskFailed("Provider cache not initialized".to_string())
		})?;

		let provider_configs = metadata_provider_config::Entity::find()
			.filter(metadata_provider_config::Column::Enabled.eq(true))
			.all(conn)
			.await?;

		if provider_configs.is_empty() {
			tracing::warn!("No enabled metadata providers configured");
			return Ok(JobTaskOutput {
				output,
				logs: vec![],
				subtasks: vec![],
			});
		}

		let mut logs = vec![];

		match task {
			MetadataFetchTask::FetchSeries {
				series_id,
				series_name,
			} => {
				output.total_processed = 1;
				ctx.report_progress(JobProgress::msg(&format!(
					"Fetching metadata for series: {}",
					series_name
				)));

				if !self.params.force_refetch {
					let existing = metadata_fetch_record::Entity::find()
						.filter(metadata_fetch_record::Column::SeriesId.eq(&series_id))
						.filter(metadata_fetch_record::Column::Status.is_in([
							MetadataFetchStatus::AwaitingReview,
							MetadataFetchStatus::Fetched,
						]))
						.one(conn)
						.await?;

					if existing.is_some() {
						output.skipped = 1;
						return Ok(JobTaskOutput {
							output,
							logs,
							subtasks: vec![],
						});
					}
				}

				let mut all_candidates: Vec<MatchCandidate> = Vec::new();

				for config in &provider_configs {
					match provider_cache.get_or_create(config).await {
						Ok(provider) => {
							let query = SearchQuery {
								title: series_name.clone(),
								limit: Some(10),
								..Default::default()
							};

							match provider.search_series(&query).await {
								Ok(candidates) => {
									all_candidates.extend(candidates);
								},
								Err(e) => {
									logs.push(JobExecuteLog::error(format!(
										"Failed to search provider for series metadata: {:?}",
										e
									)));
									tracing::error!(
										provider = ?config.provider_type,
										error = ?e,
										"Failed to search provider for series metadata"
									);
								},
							}
						},
						Err(e) => {
							logs.push(JobExecuteLog::error(format!(
								"Failed to get provider client: {:?}",
								e
							)));
							tracing::error!(
								provider = ?config.provider_type,
								error = ?e,
								"Failed to get provider client"
							);
						},
					}
				}

				let status = if all_candidates.is_empty() {
					output.no_matches = 1;
					MetadataFetchStatus::NoMatch
				} else {
					output.matches_found = 1;
					MetadataFetchStatus::AwaitingReview
				};

				let candidates_json = serde_json::to_value(&all_candidates)
					.map_err(|e| JobError::TaskFailed(e.to_string()))?;

				let active_model = metadata_fetch_record::ActiveModel {
					series_id: Set(Some(series_id.clone())),
					status: Set(status),
					match_candidates: Set(Some(candidates_json)),
					..Default::default()
				};

				metadata_fetch_record::Entity::insert(active_model)
					.on_conflict(
						OnConflict::column(metadata_fetch_record::Column::SeriesId)
							.update_columns([
								metadata_fetch_record::Column::Status,
								metadata_fetch_record::Column::MatchCandidates,
								metadata_fetch_record::Column::UpdatedAt,
							])
							.to_owned(),
					)
					.exec(conn)
					.await?;

				if let Some((candidate, config)) =
					apply::find_auto_apply_candidate(&all_candidates, &provider_configs)
				{
					tracing::info!(
						series_id,
						provider = candidate.provider,
						confidence = candidate.confidence,
						"Auto-applying series metadata match"
					);
					match apply::apply_series_match(
						conn,
						&series_id,
						&candidate,
						config.strategy,
						config.exclude_fields,
						vec![],
					)
					.await
					{
						Ok(()) => output.auto_applied = 1,
						Err(e) => {
							logs.push(
								JobExecuteLog::error(format!(
									"Failed to auto-apply series metadata: {:?}",
									e
								))
								.with_ctx(format!("For {series_name}")),
							);
							tracing::error!(
								series_id,
								error = ?e,
								"Failed to auto-apply series metadata"
							);
						},
					}
				}
			},

			MetadataFetchTask::FetchMedia {
				media_id,
				media_name,
				..
			} => {
				output.total_processed = 1;
				ctx.report_progress(JobProgress::msg(&format!(
					"Fetching metadata for media: {}",
					media_name
				)));

				if !self.params.force_refetch {
					let existing = metadata_fetch_record::Entity::find()
						.filter(metadata_fetch_record::Column::MediaId.eq(&media_id))
						.filter(metadata_fetch_record::Column::Status.is_in([
							MetadataFetchStatus::AwaitingReview,
							MetadataFetchStatus::Fetched,
						]))
						.one(conn)
						.await?;

					if existing.is_some() {
						output.skipped = 1;
						return Ok(JobTaskOutput {
							output,
							logs: vec![],
							subtasks: vec![],
						});
					}
				}

				let mut all_candidates: Vec<MatchCandidate> = Vec::new();

				for config in &provider_configs {
					match provider_cache.get_or_create(config).await {
						Ok(provider) => {
							let query = SearchQuery {
								title: media_name.clone(),
								limit: Some(10),
								..Default::default()
							};

							match provider.search_media(&query).await {
								Ok(candidates) => {
									all_candidates.extend(candidates);
								},
								Err(e) => {
									tracing::error!(
										provider = ?config.provider_type,
										error = ?e,
										"Failed to search provider for media metadata"
									);
								},
							}
						},
						Err(e) => {
							tracing::error!(
								provider = ?config.provider_type,
								error = ?e,
								"Failed to get provider client"
							);
						},
					}
				}

				let status = if all_candidates.is_empty() {
					output.no_matches = 1;
					MetadataFetchStatus::NoMatch
				} else {
					output.matches_found = 1;
					MetadataFetchStatus::AwaitingReview
				};

				let candidates_json = serde_json::to_value(&all_candidates)
					.map_err(|e| JobError::TaskFailed(e.to_string()))?;

				let active_model = metadata_fetch_record::ActiveModel {
					media_id: Set(Some(media_id.clone())),
					status: Set(status),
					match_candidates: Set(Some(candidates_json)),
					..Default::default()
				};

				metadata_fetch_record::Entity::insert(active_model)
					.on_conflict(
						OnConflict::column(metadata_fetch_record::Column::MediaId)
							.update_columns([
								metadata_fetch_record::Column::Status,
								metadata_fetch_record::Column::MatchCandidates,
								metadata_fetch_record::Column::UpdatedAt,
							])
							.to_owned(),
					)
					.exec(conn)
					.await?;

				if let Some((candidate, config)) =
					apply::find_auto_apply_candidate(&all_candidates, &provider_configs)
				{
					tracing::info!(
						media_id,
						provider = candidate.provider,
						confidence = candidate.confidence,
						"Auto-applying media metadata match"
					);
					match apply::apply_media_match(
						conn,
						&media_id,
						&candidate,
						config.strategy,
						config.exclude_fields,
						vec![],
					)
					.await
					{
						Ok(()) => output.auto_applied = 1,
						Err(e) => {
							logs.push(
								JobExecuteLog::error(format!(
									"Failed to auto-apply media metadata: {:?}",
									e
								))
								.with_ctx(format!("For {media_name}")),
							);
							tracing::error!(
								media_id,
								error = ?e,
								"Failed to auto-apply media metadata"
							);
						},
					}
				}
			},
		}

		Ok(JobTaskOutput {
			output,
			logs,
			subtasks: vec![],
		})
	}
}

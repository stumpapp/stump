use std::collections::{HashMap, VecDeque};
use std::sync::Arc;

use async_graphql::SimpleObject;
use metadata_integrations::{MatchCandidate, SearchQuery};
use models::{
	entity::{
		library_config, media, metadata_fetch_record, metadata_provider_config, series,
	},
	shared::enums::{LibraryType, MetadataFetchStatus},
};
use sea_orm::QuerySelect;
use sea_orm::{
	prelude::*,
	sea_query::{OnConflict, Query},
	Set,
};
use serde::{Deserialize, Serialize};

use crate::job::{
	error::JobError, JobContext, JobExecuteLog, JobLifecycle, JobOutputExt, JobProgress,
	JobTaskOutput, WorkingState,
};

use super::{apply, ProviderClientCache};

type Id = String;

/// The scope of entities to fetch metadata for
#[derive(Clone, Debug, Serialize, Deserialize)]
#[serde(tag = "type")]
pub enum MetadataFetchScope {
	MediaInLibrary(Id),
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

	pub fn media_in_library(library_id: Id) -> Self {
		Self::new(MetadataFetchScope::MediaInLibrary(library_id), false)
	}
}

/// A single task for the metadata fetch job
#[derive(Serialize, Deserialize)]
pub enum MetadataFetchTask {
	/// Fetch metadata for a series
	FetchSeries {
		series_id: String,
		series_name: String,
		library_type: LibraryType,
	},
	/// Fetch metadata for a media item
	FetchMedia {
		media_id: String,
		media_name: String,
		series_name: Option<String>,
		library_type: LibraryType,
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
	/// Number of entities that were rate-limited
	pub rate_limited: u64,
}

impl JobOutputExt for MetadataFetchJobOutput {
	fn update(&mut self, updated: Self) {
		self.total_processed += updated.total_processed;
		self.matches_found += updated.matches_found;
		self.no_matches += updated.no_matches;
		self.skipped += updated.skipped;
		self.failed += updated.failed;
		self.auto_applied += updated.auto_applied;
		self.rate_limited += updated.rate_limited;
	}
}

/// The main job struct for fetching metadata
#[derive(Clone)]
pub struct MetadataFetchJob {
	pub params: MetadataFetchJobParams,
	pub provider_cache: Option<Arc<ProviderClientCache>>,
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
	pub fn new(params: MetadataFetchJobParams) -> Self {
		Self {
			params,
			provider_cache: None,
		}
	}

	async fn get_or_init_cache(
		&mut self,
		ctx: &JobContext,
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
impl JobLifecycle for MetadataFetchJob {
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
			MetadataFetchScope::MediaInLibrary(id) => {
				Some(format!("Metadata fetch for media in library {}", id))
			},
		}
	}

	async fn init(
		&mut self,
		ctx: &JobContext,
	) -> Result<WorkingState<Self::Output, Self::Task>, JobError> {
		let conn = ctx.conn();

		self.get_or_init_cache(ctx).await?;

		// TODO: This is terrible, media needs direct fk to library
		// TODO: The names should be entity.metadata.name.or(entity.name)
		let tasks: VecDeque<MetadataFetchTask> = match &self.params.scope {
			MetadataFetchScope::Series(ids) => {
				let series_list = series::Entity::find()
					.filter(series::Column::Id.is_in(ids.clone()))
					.all(conn)
					.await?;

				let unique_library_ids: Vec<String> = series_list
					.iter()
					.filter_map(|s| s.library_id.clone())
					.collect::<std::collections::HashSet<_>>()
					.into_iter()
					.collect();

				let mut library_type_map: HashMap<String, LibraryType> = HashMap::new();

				for library_id in &unique_library_ids {
					let lt = resolve_library_type(conn, library_id).await?;
					library_type_map.insert(library_id.clone(), lt);
				}

				series_list
					.into_iter()
					.filter_map(|s| {
						Some(MetadataFetchTask::FetchSeries {
							series_id: s.id,
							series_name: s.name,
							library_type: s
								.library_id
								.as_ref()
								.and_then(|lid| library_type_map.get(lid))
								.cloned()?,
						})
					})
					.collect()
			},
			MetadataFetchScope::SeriesInLibrary(library_id) => {
				let library_type = resolve_library_type(conn, library_id).await?;

				let series_list = series::Entity::find()
					.filter(series::Column::LibraryId.eq(library_id))
					.all(conn)
					.await?;

				series_list
					.into_iter()
					.map(|s| MetadataFetchTask::FetchSeries {
						series_id: s.id,
						series_name: s.name,
						library_type,
					})
					.collect()
			},
			MetadataFetchScope::Media(ids) => {
				let media_list = media::Entity::find()
					.filter(media::Column::Id.is_in(ids.clone()))
					.find_also_related(series::Entity)
					.all(conn)
					.await?;

				let unique_library_ids: Vec<String> = media_list
					.iter()
					.filter_map(|(_, s)| s.as_ref().and_then(|s| s.library_id.clone()))
					.collect::<std::collections::HashSet<_>>()
					.into_iter()
					.collect();

				let mut library_type_map: HashMap<String, LibraryType> = HashMap::new();

				for library_id in &unique_library_ids {
					let lt = resolve_library_type(conn, library_id).await?;
					library_type_map.insert(library_id.clone(), lt);
				}

				media_list
					.into_iter()
					.filter_map(|(m, s)| {
						Some(MetadataFetchTask::FetchMedia {
							media_id: m.id,
							media_name: m.name,
							series_name: s.as_ref().map(|s| s.name.clone()),
							library_type: s
								.as_ref()
								.and_then(|s| s.library_id.as_ref())
								.and_then(|lid| library_type_map.get(lid))
								.cloned()?,
						})
					})
					.collect()
			},
			MetadataFetchScope::MediaInSeries(series_id) => {
				let library_id = series::Entity::find_by_id(series_id)
					.select_only()
					.column(series::Column::LibraryId)
					.into_tuple::<String>()
					.one(conn)
					.await?
					.ok_or_else(|| {
						JobError::TaskFailed("Series not found".to_string())
					})?;
				let library_type = resolve_library_type(conn, &library_id).await?;

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
						library_type,
					})
					.collect()
			},
			MetadataFetchScope::MediaInLibrary(library_id) => {
				let library_type = resolve_library_type(conn, library_id).await?;

				let media_list = media::Entity::find()
					.filter(
						media::Column::SeriesId.in_subquery(
							// TODO(perf): I think I just need to add a direct fk to library on media at this point
							// bc I do this way too often
							Query::select()
								.column(series::Column::Id)
								.from(series::Entity)
								.and_where(series::Column::LibraryId.eq(library_id))
								.to_owned(),
						),
					)
					.find_also_related(series::Entity)
					.all(conn)
					.await?;

				media_list
					.into_iter()
					.map(|(m, s)| MetadataFetchTask::FetchMedia {
						media_id: m.id,
						media_name: m.name,
						series_name: s.map(|s| s.name),
						library_type,
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
			logs: vec![],
		})
	}

	async fn execute_task(
		&self,
		ctx: &JobContext,
		task: Self::Task,
	) -> Result<JobTaskOutput<Self>, JobError> {
		let conn = ctx.conn();
		let mut output = Self::Output::default();

		let provider_cache = self.provider_cache.as_ref().ok_or_else(|| {
			JobError::TaskFailed("Provider cache not initialized".to_string())
		})?;

		let all_provider_configs = metadata_provider_config::Entity::find()
			.filter(metadata_provider_config::Column::Enabled.eq(true))
			.all(conn)
			.await?;

		if all_provider_configs.is_empty() {
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
				library_type,
			} => {
				let provider_configs: Vec<_> = all_provider_configs
					.iter()
					.filter(|c| library_type.has_provider_overlap(&c.provider_type))
					.collect();

				if provider_configs.is_empty() {
					tracing::debug!(
						?library_type,
						"No compatible providers for this library type, skipping series"
					);
					output.total_processed = 1;
					output.skipped = 1;
					return Ok(JobTaskOutput {
						output,
						logs: vec![],
						subtasks: vec![],
					});
				}
				output.total_processed = 1;
				ctx.report_progress(JobProgress::msg_with_subtitle(
					"Fetching series metadata",
					&series_name,
				));

				if !self.params.force_refetch {
					let existing = metadata_fetch_record::Entity::find()
						.filter(metadata_fetch_record::Column::SeriesId.eq(&series_id))
						.filter(metadata_fetch_record::Column::Status.is_in([
							MetadataFetchStatus::AwaitingReview,
							MetadataFetchStatus::Fetched,
							MetadataFetchStatus::RateLimited,
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
				let mut was_rate_limited = false;

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
								Err(e) if e.is_rate_limited() => {
									was_rate_limited = true;
									logs.push(JobExecuteLog::error(format!(
										"Rate limited by provider {:?} for series metadata",
										config.provider_type
									)));
									tracing::warn!(
										provider = ?config.provider_type,
										"Rate limited after retries for series metadata"
									);
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

				let status = if was_rate_limited && all_candidates.is_empty() {
					output.rate_limited = 1;
					MetadataFetchStatus::RateLimited
				} else if all_candidates.is_empty() {
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

				if let Some((candidate, config)) = apply::find_auto_apply_candidate(
					&all_candidates,
					&all_provider_configs,
				) {
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
				library_type,
				..
			} => {
				let provider_configs: Vec<_> = all_provider_configs
					.iter()
					.filter(|c| library_type.has_provider_overlap(&c.provider_type))
					.collect();

				if provider_configs.is_empty() {
					tracing::debug!(
						?library_type,
						"No compatible providers for this library type, skipping media"
					);
					output.total_processed = 1;
					output.skipped = 1;
					return Ok(JobTaskOutput {
						output,
						logs: vec![],
						subtasks: vec![],
					});
				}
				output.total_processed = 1;
				ctx.report_progress(JobProgress::msg_with_subtitle(
					"Fetching media metadata",
					&media_name,
				));

				if !self.params.force_refetch {
					let existing = metadata_fetch_record::Entity::find()
						.filter(metadata_fetch_record::Column::MediaId.eq(&media_id))
						.filter(metadata_fetch_record::Column::Status.is_in([
							MetadataFetchStatus::AwaitingReview,
							MetadataFetchStatus::Fetched,
							MetadataFetchStatus::RateLimited,
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
				let mut was_rate_limited = false;

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
								Err(e) if e.is_rate_limited() => {
									was_rate_limited = true;
									logs.push(JobExecuteLog::error(format!(
										"Rate limited by provider {:?} for media metadata",
										config.provider_type
									)));
									tracing::warn!(
										provider = ?config.provider_type,
										"Rate limited after retries for media metadata"
									);
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

				let status = if was_rate_limited && all_candidates.is_empty() {
					output.rate_limited = 1;
					MetadataFetchStatus::RateLimited
				} else if all_candidates.is_empty() {
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

				if let Some((candidate, config)) = apply::find_auto_apply_candidate(
					&all_candidates,
					&all_provider_configs,
				) {
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

async fn resolve_library_type(
	conn: &DatabaseConnection,
	library_id: &str,
) -> Result<LibraryType, JobError> {
	let config = library_config::Entity::find()
		.filter(library_config::Column::LibraryId.eq(library_id))
		.one(conn)
		.await
		.map_err(|e| JobError::InitFailed(e.to_string()))?
		.ok_or_else(|| {
			JobError::InitFailed(format!(
				"Library config not found for library {library_id}"
			))
		})?;

	Ok(config.library_type)
}

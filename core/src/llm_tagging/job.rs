use std::{collections::VecDeque, sync::Arc};

use async_graphql::SimpleObject;
use futures::StreamExt;
use llm_integrations::{LlmClient, LlmError};
use models::{
	entity::{llm_tag_suggestion, media, media_tag, series},
	shared::{
		enums::LlmTagSuggestionStatus,
		llm_tagging::{LlmSuggestedTag, LlmTagBatchScope},
	},
};
use sea_orm::{
	prelude::*,
	sea_query::{OnConflict, Query},
	DatabaseTransaction, QuerySelect, Set, TransactionTrait,
};
use serde::{Deserialize, Serialize};

use crate::{
	job::{
		error::JobError, JobContext, JobExecuteLog, JobLifecycle, JobOutputExt,
		JobProgress, JobTaskOutput, WorkingState,
	},
	scan::utils::media::ensure_tags_linked,
};

use super::{
	build_book_tagging_input, count_requests_today, existing_tag_names,
	load_llm_settings, LlmSettings, SETTLED_SUGGESTION_STATUSES,
};

type Id = String;

/// Parameters for the LLM tag job. The scope is shared with the metadata
/// fetch job's scope enum, though only media-oriented scopes are supported.
#[derive(Clone, Debug, Serialize, Deserialize)]
pub struct LlmTagJobParams {
	pub scope: crate::metadata::provider::MetadataFetchScope,
	/// If true, will re-suggest tags even if suggestions already exist
	pub force_refetch: bool,
}

impl LlmTagJobParams {
	pub fn new(
		scope: crate::metadata::provider::MetadataFetchScope,
		force_refetch: bool,
	) -> Self {
		Self {
			scope,
			force_refetch,
		}
	}

	pub fn media(ids: Vec<Id>) -> Self {
		Self::new(
			crate::metadata::provider::MetadataFetchScope::Media(ids),
			false,
		)
	}

	pub fn media_in_library(library_id: Id) -> Self {
		Self::new(
			crate::metadata::provider::MetadataFetchScope::MediaInLibrary(library_id),
			false,
		)
	}
}

/// A single LLM tagging task: a batch of books processed concurrently
#[derive(Serialize, Deserialize)]
pub struct LlmTagTask {
	pub media: Vec<LlmTagTaskMedia>,
}

#[derive(Serialize, Deserialize)]
pub struct LlmTagTaskMedia {
	pub media_id: String,
	pub media_name: String,
}

#[derive(Clone, Serialize, Deserialize, Default, Debug, SimpleObject)]
#[serde(default, rename_all = "camelCase")]
pub struct LlmTagJobOutput {
	/// Total number of books processed
	pub total_processed: u64,
	/// Number of books whose suggestions await review
	pub suggested: u64,
	/// Number of books whose suggestions were auto-applied
	pub auto_applied: u64,
	/// Number of books that failed
	pub failed: u64,
	/// Number of books that were rate-limited
	pub rate_limited: u64,
	/// Number of books that were skipped (already have settled suggestions)
	pub skipped: u64,
	/// Approximate total token usage reported by the LLM API
	pub tokens_used: u64,
}

impl JobOutputExt for LlmTagJobOutput {
	fn update(&mut self, updated: Self) {
		self.total_processed += updated.total_processed;
		self.suggested += updated.suggested;
		self.auto_applied += updated.auto_applied;
		self.failed += updated.failed;
		self.rate_limited += updated.rate_limited;
		self.skipped += updated.skipped;
		self.tokens_used += updated.tokens_used;
	}
}

/// A job which asks the configured LLM for tag suggestions, one request per
/// book, and persists the results for review (or auto-applies them when the
/// configured threshold is met).
#[derive(Clone)]
pub struct LlmTagJob {
	pub params: LlmTagJobParams,
	/// Loaded during `init`, never serialized
	llm_settings: Option<Arc<LlmSettings>>,
	llm_client: Option<Arc<LlmClient>>,
}

// Note: the client holds a decrypted key, so it is never persisted
impl Serialize for LlmTagJob {
	fn serialize<S>(&self, serializer: S) -> Result<S::Ok, S::Error>
	where
		S: serde::Serializer,
	{
		self.params.serialize(serializer)
	}
}

impl<'de> Deserialize<'de> for LlmTagJob {
	fn deserialize<D>(deserializer: D) -> Result<Self, D::Error>
	where
		D: serde::Deserializer<'de>,
	{
		let params = LlmTagJobParams::deserialize(deserializer)?;
		Ok(Self {
			params,
			llm_settings: None,
			llm_client: None,
		})
	}
}

impl LlmTagJob {
	pub fn new(params: LlmTagJobParams) -> Self {
		Self {
			params,
			llm_settings: None,
			llm_client: None,
		}
	}

	async fn get_or_init_settings(
		&mut self,
		ctx: &JobContext,
	) -> Result<Arc<LlmSettings>, JobError> {
		if let Some(settings) = &self.llm_settings {
			return Ok(Arc::clone(settings));
		}

		let encryption_key = ctx
			.get_encryption_key()
			.await
			.map_err(|e| JobError::InitFailed(e.to_string()))?;

		let settings = load_llm_settings(ctx.conn(), &encryption_key)
			.await
			.map_err(|e| JobError::InitFailed(e.to_string()))?
			.ok_or_else(|| {
				JobError::InitFailed(
					"LLM is not configured. Set the LLM URL, model name, and API key in the server settings first."
						.to_string(),
				)
			})?;

		let client = Arc::new(settings.build_client());
		let settings = Arc::new(settings);

		self.llm_settings = Some(Arc::clone(&settings));
		self.llm_client = Some(client);

		Ok(settings)
	}
}

#[async_trait::async_trait]
impl JobLifecycle for LlmTagJob {
	const NAME: &'static str = "llm_tag";

	type Output = LlmTagJobOutput;
	type Task = LlmTagTask;

	fn description(&self) -> Option<String> {
		Some(format!("LLM tagging: {:?}", self.params.scope))
	}

	async fn init(
		&mut self,
		ctx: &JobContext,
	) -> Result<WorkingState<Self::Output, Self::Task>, JobError> {
		let conn = ctx.conn();

		let settings = self.get_or_init_settings(ctx).await?;
		let config = &settings.tagging_config;

		let media_list: Vec<media::ModelWithMetadata> = match &self.params.scope {
			crate::metadata::provider::MetadataFetchScope::MediaInLibrary(library_id) => {
				media::ModelWithMetadata::find()
					.filter(
						media::Column::SeriesId.in_subquery(
							// TODO(perf): media really needs a direct fk to library
							Query::select()
								.column(series::Column::Id)
								.from(series::Entity)
								.and_where(series::Column::LibraryId.eq(library_id))
								.to_owned(),
						),
					)
					.into_model::<media::ModelWithMetadata>()
					.all(conn)
					.await?
			},
			crate::metadata::provider::MetadataFetchScope::Media(ids) => {
				let mut all = Vec::new();
				for chunk in ids.chunks(crate::database::SQLITE_BIND_LIMIT) {
					let batch = media::ModelWithMetadata::find()
						.filter(media::Column::Id.is_in(chunk.to_vec()))
						.into_model::<media::ModelWithMetadata>()
						.all(conn)
						.await?;
					all.extend(batch);
				}
				all
			},
			_ => {
				return Err(JobError::InitFailed(
					"Unsupported scope for LLM tagging job".to_string(),
				));
			},
		};

		// skip books which already have settled suggestions, unless refetching
		let mut to_skip: std::collections::HashSet<String> =
			std::collections::HashSet::new();
		if !self.params.force_refetch {
			let ids: Vec<String> =
				media_list.iter().map(|m| m.media.id.clone()).collect();
			for chunk in ids.chunks(crate::database::SQLITE_BIND_LIMIT) {
				let settled: Vec<llm_tag_suggestion::Model> =
					llm_tag_suggestion::Entity::find()
						.filter(llm_tag_suggestion::Column::MediaId.is_in(chunk.to_vec()))
						.filter(
							llm_tag_suggestion::Column::Status
								.is_in(SETTLED_SUGGESTION_STATUSES),
						)
						.all(conn)
						.await?;
				for record in settled {
					to_skip.insert(record.media_id);
				}
			}
		}

		// Note: when batch scope is "new books only" I also skip books which
		// are already linked to at least one tag
		let media_list: Vec<media::ModelWithMetadata> =
			if matches!(config.batch_scope, LlmTagBatchScope::NewBooksOnly) {
				let ids: Vec<String> =
					media_list.iter().map(|m| m.media.id.clone()).collect();
				let mut tagged: std::collections::HashSet<String> =
					std::collections::HashSet::new();
				for chunk in ids.chunks(crate::database::SQLITE_BIND_LIMIT) {
					let rows: Vec<String> = media_tag::Entity::find()
						.select_only()
						.column(media_tag::Column::MediaId)
						.filter(media_tag::Column::MediaId.is_in(chunk.to_vec()))
						.into_tuple()
						.all(conn)
						.await?;
					tagged.extend(rows);
				}
				media_list
					.into_iter()
					.filter(|m| !tagged.contains(&m.media.id))
					.collect()
			} else {
				media_list
			};

		let skipped = to_skip.len() as u64;
		let media_list: Vec<media::ModelWithMetadata> = media_list
			.into_iter()
			.filter(|m| !to_skip.contains(&m.media.id))
			.collect();

		// each task is a "wave" of up to `concurrency` books, executed
		// concurrently via buffer_unordered in `execute_task`
		let concurrency = config.concurrency.max(1) as usize;
		let mut tasks: VecDeque<LlmTagTask> = VecDeque::new();
		for chunk in media_list.chunks(concurrency) {
			tasks.push_back(LlmTagTask {
				media: chunk
					.iter()
					.map(|m| LlmTagTaskMedia {
						media_id: m.media.id.clone(),
						media_name: m.media.name.clone(),
					})
					.collect(),
			});
		}

		ctx.report_progress(JobProgress::msg(&format!(
			"Initialized LLM tagging with {} book(s)",
			media_list.len()
		)));

		let mut output = Self::Output::default();
		output.skipped = skipped;

		Ok(WorkingState {
			output: Some(output),
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
		let mut logs = vec![];

		let settings = self.llm_settings.as_ref().ok_or_else(|| {
			JobError::TaskFailed("LLM settings not initialized".to_string())
		})?;
		let client = self.llm_client.as_ref().ok_or_else(|| {
			JobError::TaskFailed("LLM client not initialized".to_string())
		})?;

		let config = &settings.tagging_config;
		let concurrency = config.concurrency.max(1) as usize;
		let total = task.media.len();
		output.total_processed = total as u64;

		ctx.report_progress(JobProgress::msg_with_subtitle(
			"Requesting tag suggestions",
			&task
				.media
				.first()
				.map(|m| m.media_name.clone())
				.unwrap_or_default(),
		));

		// check the daily request limit before doing any work in this batch
		let requests_today = count_requests_today(conn)
			.await
			.map_err(|e| JobError::TaskFailed(e.to_string()))?;

		let remaining_quota =
			(config.daily_request_limit as i64 - requests_today).max(0) as usize;

		// books beyond the daily quota are marked as rate-limited and left
		// for the cron retry job to pick up
		let (to_process, over_quota) = if task.media.len() > remaining_quota {
			task.media.split_at(remaining_quota)
		} else {
			(&task.media[..], &task.media[task.media.len()..])
		};

		// Phase 1: concurrently request suggestions from the LLM
		let existing_tags = existing_tag_names(conn)
			.await
			.map_err(|e| JobError::TaskFailed(e.to_string()))?;

		let mut futures = Vec::with_capacity(to_process.len());
		for item in to_process {
			let client = Arc::clone(client);
			let existing_tags = existing_tags.clone();
			let max_summary_chars = config.max_summary_chars;

			futures.push(async move {
				// reload the book with metadata inside the future so the
				// per-book work is fully self-contained
				let book = media::ModelWithMetadata::find()
					.filter(media::Column::Id.eq(item.media_id.clone()))
					.into_model::<media::ModelWithMetadata>()
					.one(conn)
					.await;

				match book {
					Ok(Some(book)) => {
						let input = build_book_tagging_input(
							&book.media,
							book.metadata.as_ref(),
							max_summary_chars,
						);
						client
							.suggest_tags(&input, &existing_tags)
							.await
							.map(|(tags, tokens)| (item, Ok::<_, LlmError>(tags), tokens))
							.unwrap_or_else(|e| (item, Err(e), 0))
					},
					Ok(None) => {
						(item, Err(LlmError::Other("media not found".to_string())), 0)
					},
					Err(e) => (item, Err(LlmError::Other(e.to_string())), 0),
				}
			});
		}

		let results: Vec<_> = futures::stream::iter(futures)
			.buffer_unordered(concurrency)
			.collect()
			.await;

		// Phase 2: persist results sequentially to avoid write contention
		let mut processed = 0usize;
		for (item, result, tokens) in results {
			processed += 1;
			output.tokens_used += tokens;

			match result {
				Ok(raw_suggestions) => {
					let mut seen = std::collections::HashSet::new();
					let suggestions: Vec<LlmSuggestedTag> = raw_suggestions
						.into_iter()
						.filter_map(|s| {
							let name =
								super::normalize_tags(vec![s.name]).into_iter().next()?;
							if !seen.insert(
								models::shared::llm_tagging::normalize_tag_key(&name),
							) {
								return None;
							}
							Some(LlmSuggestedTag {
								name,
								confidence: s.confidence,
								reason: s.reason,
							})
						})
						.collect();

					if suggestions.is_empty() {
						// treat "no usable suggestions" as failed so it is
						// visible in the output stats
						output.failed += 1;
						upsert_suggestion(
							conn,
							&item.media_id,
							LlmTagSuggestionStatus::Failed,
							None,
							None,
						)
						.await?;
						continue;
					}

					// auto-apply when every suggestion meets the threshold
					let threshold = config.auto_apply_threshold;
					let should_auto_apply = threshold.is_some_and(|t| {
						!suggestions.is_empty()
							&& suggestions.iter().all(|s| s.confidence >= t)
					});

					if should_auto_apply {
						let names: Vec<String> =
							suggestions.iter().map(|s| s.name.clone()).collect();
						let txn = conn.begin().await?;
						match apply_tags(&txn, &item.media_id, &names).await {
							Ok(()) => {
								txn.commit().await?;
								output.auto_applied += 1;
								upsert_suggestion(
									conn,
									&item.media_id,
									LlmTagSuggestionStatus::AutoApplied,
									Some(suggestions),
									Some(names),
								)
								.await?;
							},
							Err(e) => {
								let _ = txn.rollback().await;
								logs.push(
									JobExecuteLog::error(format!(
										"Failed to auto-apply LLM tags: {e:?}"
									))
									.with_ctx(format!("For {}", item.media_name)),
								);
								output.failed += 1;
								upsert_suggestion(
									conn,
									&item.media_id,
									LlmTagSuggestionStatus::Failed,
									Some(suggestions),
									None,
								)
								.await?;
							},
						}
					} else {
						output.suggested += 1;
						upsert_suggestion(
							conn,
							&item.media_id,
							LlmTagSuggestionStatus::Suggested,
							Some(suggestions),
							None,
						)
						.await?;
					}
				},
				Err(e) if e.is_rate_limited() => {
					output.rate_limited += 1;
					upsert_suggestion(
						conn,
						&item.media_id,
						LlmTagSuggestionStatus::RateLimited,
						None,
						None,
					)
					.await?;
				},
				Err(e) => {
					logs.push(
						JobExecuteLog::error(format!(
							"Failed to fetch LLM tag suggestions: {e:?}"
						))
						.with_ctx(format!("For {}", item.media_name)),
					);
					output.failed += 1;
					upsert_suggestion(
						conn,
						&item.media_id,
						LlmTagSuggestionStatus::Failed,
						None,
						None,
					)
					.await?;
				},
			}

			ctx.report_progress(JobProgress::subtask_position(
				processed as i32,
				total as i32,
			));
		}

		// persist rate-limited placeholders for books beyond the daily quota
		for item in over_quota {
			output.rate_limited += 1;
			upsert_suggestion(
				conn,
				&item.media_id,
				LlmTagSuggestionStatus::RateLimited,
				None,
				None,
			)
			.await?;
		}

		Ok(JobTaskOutput {
			output,
			logs,
			subtasks: vec![],
		})
	}
}

/// Persists a suggestion record for a book, upserting on the unique media_id
pub async fn upsert_suggestion(
	conn: &DatabaseConnection,
	media_id: &str,
	status: LlmTagSuggestionStatus,
	suggested_tags: Option<Vec<LlmSuggestedTag>>,
	applied_tags: Option<Vec<String>>,
) -> Result<(), DbErr> {
	let suggested_tags = suggested_tags.and_then(|tags| serde_json::to_value(tags).ok());
	let applied_tags = applied_tags.and_then(|tags| serde_json::to_value(tags).ok());

	let active_model = llm_tag_suggestion::ActiveModel {
		media_id: Set(media_id.to_string()),
		status: Set(status),
		suggested_tags: Set(suggested_tags),
		applied_tags: Set(applied_tags),
		..Default::default()
	};

	llm_tag_suggestion::Entity::insert(active_model)
		.on_conflict(
			OnConflict::column(llm_tag_suggestion::Column::MediaId)
				.update_columns([
					llm_tag_suggestion::Column::Status,
					llm_tag_suggestion::Column::SuggestedTags,
					llm_tag_suggestion::Column::AppliedTags,
					llm_tag_suggestion::Column::UpdatedAt,
				])
				.to_owned(),
		)
		.exec(conn)
		.await?;

	Ok(())
}

/// Links the given tag names to the media, creating missing tags
pub async fn apply_tags(
	txn: &DatabaseTransaction,
	media_id: &str,
	tag_names: &[String],
) -> crate::error::CoreResult<()> {
	ensure_tags_linked(txn, media_id, tag_names).await
}

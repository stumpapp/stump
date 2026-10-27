use std::{
	collections::{HashSet, VecDeque},
	sync::Arc,
};

use async_graphql::SimpleObject;
use futures::StreamExt;
use llm_integrations::{LibraryBatchResult, LlmClient};
use models::{
	entity::{llm_library_tag_draft, media, series},
	shared::{
		enums::LlmLibraryTagDraftStatus,
		llm_tagging::{normalize_tag_key, LlmLibraryTagAssignment, LlmTaggingConfig},
	},
};
use sea_orm::{prelude::*, sea_query::Query, QueryOrder, Set, TransactionTrait};
use serde::{Deserialize, Serialize};

use crate::{
	job::{
		error::JobError, JobContext, JobExecuteLog, JobLifecycle, JobOutputExt,
		JobProgress, JobTaskOutput, WorkingState,
	},
	llm_tagging::{
		build_library_book_brief, count_requests_today, existing_tag_names,
		load_llm_settings, normalize_tags, LlmSettings,
	},
};

type Id = String;

/// Parameters for the library-wide LLM tag analysis job
#[derive(Clone, Debug, Serialize, Deserialize)]
pub struct LlmLibraryTagJobParams {
	pub library_id: Id,
	/// If true, starts a fresh analysis even if a resumable draft exists
	pub force_refetch: bool,
}

impl LlmLibraryTagJobParams {
	pub fn new(library_id: Id, force_refetch: bool) -> Self {
		Self {
			library_id,
			force_refetch,
		}
	}
}

/// A single analysis task: a segment of batches. Batches within a segment run
/// concurrently (against the vocabulary snapshot taken at segment start),
/// while segments run serially so vocabulary merges stay semantically safe.
#[derive(Clone, Serialize, Deserialize)]
pub struct LlmLibraryTagSegment {
	pub batches: Vec<LlmLibraryTagBatch>,
}

#[derive(Clone, Serialize, Deserialize)]
pub struct LlmLibraryTagBatch {
	pub media_ids: Vec<String>,
}

#[derive(Clone, Serialize, Deserialize, Default, Debug, SimpleObject)]
#[serde(default, rename_all = "camelCase")]
pub struct LlmLibraryTagJobOutput {
	/// Total number of batches planned
	pub total_batches: u64,
	/// Number of batches completed in this run
	pub completed_batches: u64,
	/// Number of books with at least one suggested tag
	pub books_analyzed: u64,
	/// Size of the final tag vocabulary
	pub tags_in_vocabulary: u64,
	/// Number of batches that failed
	pub failed_batches: u64,
	/// Number of batches that were rate-limited
	pub rate_limited_batches: u64,
	/// Approximate total token usage reported by the LLM API
	pub tokens_used: u64,
}

impl JobOutputExt for LlmLibraryTagJobOutput {
	fn update(&mut self, updated: Self) {
		self.total_batches += updated.total_batches;
		self.completed_batches += updated.completed_batches;
		self.books_analyzed += updated.books_analyzed;
		self.tags_in_vocabulary += updated.tags_in_vocabulary;
		self.failed_batches += updated.failed_batches;
		self.rate_limited_batches += updated.rate_limited_batches;
		self.tokens_used += updated.tokens_used;
	}
}

/// A job which analyzes an entire library in batches: each batch is a single
/// LLM request covering `batch_size` books. Batches accumulate a global tag
/// vocabulary (only ever added to) and per-book tag assignments, persisted
/// incrementally into a resumable draft.
#[derive(Clone)]
pub struct LlmLibraryTagJob {
	pub params: LlmLibraryTagJobParams,
	/// Loaded during `init`, never serialized
	llm_settings: Option<Arc<LlmSettings>>,
	llm_client: Option<Arc<LlmClient>>,
	/// The working tag vocabulary, updated after each segment
	vocabulary: Arc<std::sync::Mutex<Vec<String>>>,
	/// The draft row being written to, loaded/created during `init`
	draft_id: Arc<std::sync::Mutex<Option<i32>>>,
}

// Note: the client holds a decrypted key, so it is never persisted
impl Serialize for LlmLibraryTagJob {
	fn serialize<S>(&self, serializer: S) -> Result<S::Ok, S::Error>
	where
		S: serde::Serializer,
	{
		self.params.serialize(serializer)
	}
}

impl<'de> Deserialize<'de> for LlmLibraryTagJob {
	fn deserialize<D>(deserializer: D) -> Result<Self, D::Error>
	where
		D: serde::Deserializer<'de>,
	{
		let params = LlmLibraryTagJobParams::deserialize(deserializer)?;
		Ok(Self {
			params,
			llm_settings: None,
			llm_client: None,
			vocabulary: Arc::new(std::sync::Mutex::new(Vec::new())),
			draft_id: Arc::new(std::sync::Mutex::new(None)),
		})
	}
}

impl LlmLibraryTagJob {
	pub fn new(params: LlmLibraryTagJobParams) -> Self {
		Self {
			params,
			llm_settings: None,
			llm_client: None,
			vocabulary: Arc::new(std::sync::Mutex::new(Vec::new())),
			draft_id: Arc::new(std::sync::Mutex::new(None)),
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

/// A batch which could not produce a result
enum BatchOutcome {
	Success(Box<LibraryBatchResult>),
	RateLimited,
	Failed(String),
}

#[async_trait::async_trait]
impl JobLifecycle for LlmLibraryTagJob {
	const NAME: &'static str = "llm_library_tag";

	type Output = LlmLibraryTagJobOutput;
	type Task = LlmLibraryTagSegment;

	fn description(&self) -> Option<String> {
		Some(format!(
			"LLM library tag analysis for library {}",
			self.params.library_id
		))
	}

	async fn init(
		&mut self,
		ctx: &JobContext,
	) -> Result<WorkingState<Self::Output, Self::Task>, JobError> {
		let conn = ctx.conn();

		let settings = self.get_or_init_settings(ctx).await?;
		let config = &settings.tagging_config;

		// the starting vocabulary: either a resumable draft's list or the
		// library's current global tags
		let mut vocabulary: Vec<String> = existing_tag_names(conn)
			.await
			.map_err(|e| JobError::InitFailed(e.to_string()))?;

		// materialize the books of this library, ordered for stable batching
		let media_list: Vec<media::ModelWithMetadata> = media::ModelWithMetadata::find()
			.filter(
				media::Column::SeriesId.in_subquery(
					Query::select()
						.column(series::Column::Id)
						.from(series::Entity)
						.and_where(series::Column::LibraryId.eq(&self.params.library_id))
						.to_owned(),
				),
			)
			.into_model::<media::ModelWithMetadata>()
			.all(conn)
			.await
			.map_err(|e| JobError::InitFailed(e.to_string()))?;

		let batch_size = config.batch_size.max(1) as usize;
		let batches: Vec<LlmLibraryTagBatch> = media_list
			.chunks(batch_size)
			.map(|chunk| LlmLibraryTagBatch {
				media_ids: chunk.iter().map(|m| m.media.id.clone()).collect(),
			})
			.collect();

		let total_batches = batches.len() as i32;

		// find or create the draft row used for resumability
		let existing_draft = llm_library_tag_draft::Entity::find()
			.filter(llm_library_tag_draft::Column::LibraryId.eq(&self.params.library_id))
			.filter(llm_library_tag_draft::Column::Status.is_in([
				LlmLibraryTagDraftStatus::InProgress,
				LlmLibraryTagDraftStatus::RateLimited,
			]))
			.order_by_desc(llm_library_tag_draft::Column::Id)
			.one(conn)
			.await
			.map_err(|e| JobError::InitFailed(e.to_string()))?;

		let (draft_id, completed_batches) = if let Some(draft) =
			existing_draft.filter(|_| !self.params.force_refetch)
		{
			// resume: adopt the draft's vocabulary when available
			if let Some(list) = draft.final_tag_list.as_ref() {
				if let Ok(saved) = serde_json::from_value::<Vec<String>>(list.clone()) {
					if !saved.is_empty() {
						vocabulary = saved;
					}
				}
			}
			(draft.id, draft.completed_batches)
		} else {
			let draft = llm_library_tag_draft::ActiveModel {
				library_id: Set(self.params.library_id.clone()),
				status: Set(LlmLibraryTagDraftStatus::InProgress),
				final_tag_list: Set(Some(
					serde_json::to_value(&vocabulary)
						.map_err(|e| JobError::InitFailed(e.to_string()))?,
				)),
				assignments: Set(Some(
					serde_json::to_value(Vec::<LlmLibraryTagAssignment>::new())
						.map_err(|e| JobError::InitFailed(e.to_string()))?,
				)),
				books_analyzed: Set(0),
				completed_batches: Set(0),
				total_batches: Set(total_batches),
				..Default::default()
			};
			let draft = draft
				.insert(conn)
				.await
				.map_err(|e| JobError::InitFailed(e.to_string()))?;
			(draft.id, 0)
		};

		// advance the cursor past batches that were already completed in a
		// previous run (resume semantics)
		let completed_batches = completed_batches.min(total_batches) as usize;
		let remaining_batches: Vec<LlmLibraryTagBatch> =
			batches.into_iter().skip(completed_batches).collect();

		*self.vocabulary.lock().map_err(|_| {
			JobError::InitFailed("vocabulary lock poisoned".to_string())
		})? = vocabulary.clone();

		*self
			.draft_id
			.lock()
			.map_err(|_| JobError::InitFailed("draft lock poisoned".to_string()))? =
			Some(draft_id);
		// segments of `concurrency` batches; batches within a segment run
		// concurrently against the segment-start vocabulary snapshot
		let concurrency = config.concurrency.max(1) as usize;
		let mut tasks: VecDeque<LlmLibraryTagSegment> = VecDeque::new();
		for chunk in remaining_batches.chunks(concurrency) {
			tasks.push_back(LlmLibraryTagSegment {
				batches: chunk.to_vec(),
			});
		}

		ctx.report_progress(JobProgress::msg(&format!(
			"Initialized LLM library tag analysis: {} book(s) in {} batch(es), resuming at batch {}",
			media_list.len(),
			total_batches,
			completed_batches + 1
		)));

		let mut output = Self::Output::default();
		output.total_batches = total_batches as u64;

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
		let segment_len = task.batches.len();

		// snapshot of the vocabulary for this segment; concurrent batches
		// within the segment all see this same list
		let segment_vocabulary: Vec<String> =
			self.vocabulary.lock().map(|v| v.clone()).map_err(|_| {
				JobError::TaskFailed("vocabulary lock poisoned".to_string())
			})?;

		let draft_id = self
			.draft_id
			.lock()
			.map_err(|_| JobError::TaskFailed("draft lock poisoned".to_string()))?
			.ok_or_else(|| JobError::TaskFailed("Draft not initialized".to_string()))?;

		// the book payloads for each batch, loaded once per segment
		let mut batch_futures = Vec::with_capacity(segment_len);
		for batch in &task.batches {
			let client = Arc::clone(client);
			let vocabulary = segment_vocabulary.clone();
			let media_ids: HashSet<String> = batch.media_ids.iter().cloned().collect();

			batch_futures.push(async move {
				// enforce the daily request limit lazily per batch
				let requests_today = match count_requests_today(conn).await {
					Ok(v) => v,
					Err(e) => return BatchOutcome::Failed(e.to_string()),
				};
				if requests_today >= config.daily_request_limit as i64 {
					return BatchOutcome::RateLimited;
				}

				let briefs: Vec<llm_integrations::LibraryBookBrief> =
					match load_briefs(conn, &batch.media_ids, config).await {
						Ok(briefs) => briefs,
						Err(e) => return BatchOutcome::Failed(e.to_string()),
					};

				// validate the briefs against the batch to be safe
				let briefs: Vec<llm_integrations::LibraryBookBrief> = briefs
					.into_iter()
					.filter(|b| media_ids.contains(&b.media_id))
					.collect();

				match client.recommend_tags_for_batch(&briefs, &vocabulary).await {
					Ok((mut result, _tokens)) => {
						// keep only assignments that reference books in this batch
						result
							.assignments
							.retain(|a| media_ids.contains(&a.media_id));
						BatchOutcome::Success(Box::new(result))
					},
					Err(e) if e.is_rate_limited() => BatchOutcome::RateLimited,
					Err(e) => BatchOutcome::Failed(e.to_string()),
				}
			});
		}

		// run the segment's batches concurrently; results are merged
		// sequentially below as they complete
		let results: Vec<BatchOutcome> = futures::stream::iter(batch_futures)
			.buffer_unordered(concurrency)
			.collect()
			.await;

		for outcome in results {
			match outcome {
				BatchOutcome::Success(result) => {
					merge_batch_result(
						self,
						conn,
						draft_id,
						&segment_vocabulary,
						*result,
						&mut output,
						&mut logs,
					)
					.await?;
					output.completed_batches += 1;
				},
				BatchOutcome::RateLimited => {
					output.rate_limited_batches += 1;
				},
				BatchOutcome::Failed(message) => {
					logs.push(JobExecuteLog::error(format!(
						"LLM library tag batch failed: {message}"
					)));
					output.failed_batches += 1;
				},
			}
		}

		ctx.report_progress(JobProgress::msg(&format!(
			"Segment complete: {} batch(es) processed",
			segment_len
		)));

		Ok(JobTaskOutput {
			output,
			logs,
			subtasks: vec![],
		})
	}

	async fn finalize(
		&self,
		ctx: &JobContext,
		output: &Self::Output,
	) -> Result<(), JobError> {
		let conn = ctx.conn();
		let draft_id = self
			.draft_id
			.lock()
			.map_err(|_| JobError::TaskFailed("draft lock poisoned".to_string()))?
			.ok_or_else(|| JobError::TaskFailed("Draft not initialized".to_string()))?;

		let Some(draft) = llm_library_tag_draft::Entity::find_by_id(draft_id)
			.one(conn)
			.await
			.map_err(|e| JobError::TaskFailed(e.to_string()))?
		else {
			return Err(JobError::TaskFailed("Draft row not found".to_string()));
		};

		// the draft is awaiting review when fully completed, otherwise it
		// stays resumable (rate limited drafts are retried by the cron job)
		let status = if draft.completed_batches >= draft.total_batches
			&& draft.total_batches > 0
		{
			LlmLibraryTagDraftStatus::AwaitingReview
		} else {
			LlmLibraryTagDraftStatus::RateLimited
		};

		let mut active: llm_library_tag_draft::ActiveModel = draft.into();
		active.status = Set(status);
		active
			.update(conn)
			.await
			.map_err(|e| JobError::TaskFailed(e.to_string()))?;

		ctx.report_progress(JobProgress::msg(&format!(
			"LLM library tag analysis finished: {} book(s) analyzed, {} tag(s) in vocabulary",
			output.books_analyzed, output.tags_in_vocabulary
		)));

		Ok(())
	}
}

/// Merges a successful batch result into the vocabulary and the draft row.
/// The vocabulary only ever grows (no rename, no removal).
async fn merge_batch_result(
	job: &LlmLibraryTagJob,
	conn: &DatabaseConnection,
	draft_id: i32,
	_segment_vocabulary: &[String],
	result: LibraryBatchResult,
	output: &mut LlmLibraryTagJobOutput,
	logs: &mut Vec<JobExecuteLog>,
) -> Result<(), JobError> {
	output.tokens_used += result.tokens_used;

	// compute the vocabulary delta under the lock, but never hold the lock
	// across an await
	let (existing_keys, vocabulary_snapshot) = {
		let vocabulary = job
			.vocabulary
			.lock()
			.map_err(|_| JobError::TaskFailed("vocabulary lock poisoned".to_string()))?;
		(
			vocabulary
				.iter()
				.map(|t| normalize_tag_key(t))
				.collect::<HashSet<_>>(),
			vocabulary.clone(),
		)
	};

	// merge new tags into the vocabulary (only-add, normalized + deduped)
	let mut newly_added: Vec<String> = Vec::new();
	for tag in normalize_tags(result.new_tags) {
		let key = normalize_tag_key(&tag);
		if !existing_keys.contains(&key)
			&& !newly_added.iter().any(|t| normalize_tag_key(t) == key)
		{
			newly_added.push(tag);
		}
	}

	let assignments: Vec<LlmLibraryTagAssignment> = result
		.assignments
		.into_iter()
		.filter_map(|a| {
			let tags = normalize_tags(a.tags);
			if tags.is_empty() {
				None
			} else {
				Some(LlmLibraryTagAssignment {
					media_id: a.media_id,
					tags,
				})
			}
		})
		.collect();

	let assignments_count = assignments.len() as i64;

	// persist the draft incrementally: append assignments, advance cursor
	let txn = conn
		.begin()
		.await
		.map_err(|e| JobError::TaskFailed(e.to_string()))?;

	let Some(draft) = llm_library_tag_draft::Entity::find_by_id(draft_id)
		.one(&txn)
		.await
		.map_err(|e| JobError::TaskFailed(e.to_string()))?
	else {
		let _ = txn.rollback().await;
		return Err(JobError::TaskFailed("Draft row not found".to_string()));
	};

	let mut all_assignments: Vec<LlmLibraryTagAssignment> = draft
		.assignments
		.as_ref()
		.and_then(|v| serde_json::from_value(v.clone()).ok())
		.unwrap_or_default();
	all_assignments.extend(assignments);

	let previous_completed = draft.completed_batches;
	let mut active: llm_library_tag_draft::ActiveModel = draft.into();
	active.assignments = Set(Some(
		serde_json::to_value(&all_assignments)
			.map_err(|e| JobError::TaskFailed(e.to_string()))?,
	));
	active.final_tag_list = Set(Some(
		serde_json::to_value(&vocabulary_snapshot)
			.map_err(|e| JobError::TaskFailed(e.to_string()))?,
	));
	active.completed_batches = Set(previous_completed.saturating_add(1));
	active.books_analyzed = Set(all_assignments.len() as i32);
	active
		.update(&txn)
		.await
		.map_err(|e| JobError::TaskFailed(e.to_string()))?;

	txn.commit()
		.await
		.map_err(|e| JobError::TaskFailed(e.to_string()))?;

	// after the draft write succeeds, grow the working vocabulary
	if !newly_added.is_empty() {
		let mut vocabulary = job
			.vocabulary
			.lock()
			.map_err(|_| JobError::TaskFailed("vocabulary lock poisoned".to_string()))?;
		vocabulary.extend(newly_added.iter().cloned());
	}

	if assignments_count > 0 {
		tracing::debug!(
			draft_id,
			assignments = assignments_count,
			"Persisted LLM library tag batch"
		);
	}
	logs.push(JobExecuteLog::new(
		format!("Batch complete: {assignments_count} book(s) with new assignments"),
		models::shared::enums::LogLevel::Info,
	));

	Ok(())
}

/// Loads the book briefs for a set of media ids
async fn load_briefs(
	conn: &DatabaseConnection,
	media_ids: &[String],
	config: &LlmTaggingConfig,
) -> Result<Vec<llm_integrations::LibraryBookBrief>, DbErr> {
	let mut briefs = Vec::with_capacity(media_ids.len());

	for chunk in media_ids.chunks(crate::database::SQLITE_BIND_LIMIT) {
		let rows: Vec<media::ModelWithMetadata> = media::ModelWithMetadata::find()
			.filter(media::Column::Id.is_in(chunk.to_vec()))
			.into_model::<media::ModelWithMetadata>()
			.all(conn)
			.await?;

		for row in rows {
			briefs.push(build_library_book_brief(
				&row.media,
				row.metadata.as_ref(),
				config.max_summary_chars,
			));
		}
	}

	Ok(briefs)
}

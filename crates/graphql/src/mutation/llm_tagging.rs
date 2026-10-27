use crate::{
	data::{AuthContext, CoreContext},
	guard::PermissionGuard,
};
use async_graphql::{Context, Object, Result, ID};
use models::{
	entity::{library, llm_library_tag_draft, llm_tag_suggestion, media, server_config},
	shared::{
		enums::{LlmLibraryTagDraftStatus, LlmTagSuggestionStatus, UserPermission},
		llm_tagging::{LlmApplyStrategy, LlmSuggestedTag, LlmTaggingConfig},
	},
};
use sea_orm::{prelude::*, IntoActiveModel, QuerySelect, Set, TransactionTrait};

#[derive(Default)]
pub struct LlmTaggingMutation;

/// Returns true when the LLM connection is fully configured. Used by the
/// trigger mutations to no-op (returning false) instead of enqueueing a job
/// destined to fail.
async fn is_llm_configured(conn: &DatabaseConnection) -> Result<bool> {
	let config = server_config::Entity::find()
		.one(conn)
		.await?
		.ok_or("Server configuration not found")?;

	Ok(config
		.llm_url
		.as_deref()
		.is_some_and(|u| !u.trim().is_empty())
		&& config
			.llm_model_name
			.as_deref()
			.is_some_and(|m| !m.trim().is_empty())
		&& config
			.llm_encrypted_api_key
			.as_deref()
			.is_some_and(|k| !k.trim().is_empty()))
}

#[Object]
impl LlmTaggingMutation {
	/// Accept (a subset of) the suggested tags for a book and link them to it.
	/// When `tagNames` is omitted, all suggested tags are applied.
	#[graphql(guard = "PermissionGuard::one(UserPermission::EditMetadata)")]
	async fn accept_llm_tag_suggestions(
		&self,
		ctx: &Context<'_>,
		media_id: ID,
		tag_names: Option<Vec<String>>,
	) -> Result<bool> {
		let conn = ctx.data::<CoreContext>()?.conn.as_ref();

		let record = llm_tag_suggestion::Entity::find()
			.filter(llm_tag_suggestion::Column::MediaId.eq(media_id.to_string()))
			.filter(
				llm_tag_suggestion::Column::Status.eq(LlmTagSuggestionStatus::Suggested),
			)
			.one(conn)
			.await?
			.ok_or("No pending LLM tag suggestion found for this book")?;

		let suggestions: Vec<LlmSuggestedTag> = record
			.suggested_tags
			.as_ref()
			.and_then(|v| serde_json::from_value(v.clone()).ok())
			.unwrap_or_default();

		let to_apply: Vec<String> = match tag_names {
			Some(names) => {
				// only suggested tags may be accepted
				names
					.into_iter()
					.filter(|n| suggestions.iter().any(|s| &s.name == n))
					.collect()
			},
			None => suggestions.iter().map(|s| s.name.clone()).collect(),
		};

		let txn = conn.begin().await?;
		stump_core::llm_tagging::apply_tags(&txn, &media_id.to_string(), &to_apply)
			.await?;
		txn.commit().await?;

		let mut active = record.into_active_model();
		active.status = Set(LlmTagSuggestionStatus::Accepted);
		active.applied_tags = Set(Some(serde_json::to_value(&to_apply)?));
		active.update(conn).await?;

		Ok(true)
	}

	/// Reject the suggested tags for a book
	#[graphql(guard = "PermissionGuard::one(UserPermission::EditMetadata)")]
	async fn reject_llm_tag_suggestions(
		&self,
		ctx: &Context<'_>,
		media_id: ID,
	) -> Result<bool> {
		let conn = ctx.data::<CoreContext>()?.conn.as_ref();

		let record = llm_tag_suggestion::Entity::find()
			.filter(llm_tag_suggestion::Column::MediaId.eq(media_id.to_string()))
			.filter(
				llm_tag_suggestion::Column::Status.eq(LlmTagSuggestionStatus::Suggested),
			)
			.one(conn)
			.await?
			.ok_or("No pending LLM tag suggestion found for this book")?;

		let mut active = record.into_active_model();
		active.status = Set(LlmTagSuggestionStatus::Rejected);
		active.update(conn).await?;

		Ok(true)
	}

	/// Accept all pending LLM tag suggestions, applying every suggested tag
	#[graphql(guard = "PermissionGuard::one(UserPermission::EditMetadata)")]
	async fn accept_all_llm_suggestions(&self, ctx: &Context<'_>) -> Result<u32> {
		let conn = ctx.data::<CoreContext>()?.conn.as_ref();

		let pending = llm_tag_suggestion::Entity::find()
			.filter(
				llm_tag_suggestion::Column::Status.eq(LlmTagSuggestionStatus::Suggested),
			)
			.all(conn)
			.await?;

		let tx = conn.begin().await?;
		let mut accepted = 0u32;

		for record in pending {
			let suggestions: Vec<LlmSuggestedTag> = record
				.suggested_tags
				.as_ref()
				.and_then(|v| serde_json::from_value(v.clone()).ok())
				.unwrap_or_default();

			if suggestions.is_empty() {
				continue;
			}

			let names: Vec<String> = suggestions.iter().map(|s| s.name.clone()).collect();

			let media_id = record.media_id.clone();
			let result =
				stump_core::llm_tagging::apply_tags(&tx, &media_id, &names).await;

			match result {
				Ok(()) => {
					let mut active = record.into_active_model();
					active.status = Set(LlmTagSuggestionStatus::Accepted);
					active.applied_tags = Set(Some(serde_json::to_value(&names)?));
					active.update(&tx).await?;
					accepted += 1;
				},
				Err(e) => {
					tracing::error!(
						?media_id,
						error = ?e,
						"Failed to accept LLM tag suggestion"
					);
				},
			}
		}

		tx.commit().await?;

		Ok(accepted)
	}

	/// Reject all pending LLM tag suggestions
	#[graphql(guard = "PermissionGuard::one(UserPermission::EditMetadata)")]
	async fn reject_all_llm_suggestions(&self, ctx: &Context<'_>) -> Result<u32> {
		let conn = ctx.data::<CoreContext>()?.conn.as_ref();

		let pending = llm_tag_suggestion::Entity::find()
			.filter(
				llm_tag_suggestion::Column::Status.eq(LlmTagSuggestionStatus::Suggested),
			)
			.all(conn)
			.await?;

		let count = pending.len() as u32;
		let tx = conn.begin().await?;

		for record in pending {
			let mut active = record.into_active_model();
			active.status = Set(LlmTagSuggestionStatus::Rejected);
			active.update(&tx).await?;
		}

		tx.commit().await?;

		Ok(count)
	}

	/// Start a background job which requests tag suggestions from the
	/// configured LLM for the media in this library
	#[graphql(guard = "PermissionGuard::one(UserPermission::MetadataFetchRecordManage)")]
	async fn run_llm_tagging(
		&self,
		ctx: &Context<'_>,
		id: ID,
		#[graphql(default = false)] force_refetch: bool,
	) -> Result<bool> {
		let AuthContext { user, .. } = ctx.data::<AuthContext>()?;
		let core = ctx.data::<CoreContext>()?;

		library::Entity::find_for_user(user)
			.filter(library::Column::Id.eq(id.to_string()))
			.one(core.conn.as_ref())
			.await?
			.ok_or("Library not found")?;

		if !is_llm_configured(core.conn.as_ref()).await? {
			return Ok(false);
		}

		core.enqueue(stump_core::job::StumpJob::llm_tag(
			stump_core::llm_tagging::LlmTagJobParams::new(
				stump_core::metadata::provider::MetadataFetchScope::MediaInLibrary(
					id.to_string(),
				),
				force_refetch,
			),
		))
		.await?;

		Ok(true)
	}

	/// Start a background job which analyzes the whole library in batches,
	/// building a global tag vocabulary and per-book assignment suggestions
	#[graphql(guard = "PermissionGuard::one(UserPermission::MetadataFetchRecordManage)")]
	async fn run_llm_library_tag_analysis(
		&self,
		ctx: &Context<'_>,
		id: ID,
		#[graphql(default = false)] _force_refetch: bool,
	) -> Result<bool> {
		let AuthContext { user, .. } = ctx.data::<AuthContext>()?;
		let core = ctx.data::<CoreContext>()?;

		library::Entity::find_for_user(user)
			.filter(library::Column::Id.eq(id.to_string()))
			.one(core.conn.as_ref())
			.await?
			.ok_or("Library not found")?;

		if !is_llm_configured(core.conn.as_ref()).await? {
			return Ok(false);
		}

		core.enqueue(stump_core::job::StumpJob::llm_library_tag(
			stump_core::llm_tagging::LlmLibraryTagJobParams::new(
				id.to_string(),
				_force_refetch,
			),
		))
		.await?;

		Ok(true)
	}

	/// Apply the tag assignments suggested by a library tag analysis draft to
	/// the given books (or all of them when `mediaIds` is omitted). The
	/// default `MERGE_ONLY` strategy only ever adds tags; it never removes
	/// existing ones.
	#[graphql(guard = "PermissionGuard::one(UserPermission::EditMetadata)")]
	async fn apply_library_tag_suggestions(
		&self,
		ctx: &Context<'_>,
		draft_id: i32,
		media_ids: Option<Vec<ID>>,
		strategy: Option<LlmApplyStrategy>,
	) -> Result<u32> {
		match strategy.unwrap_or_default() {
			LlmApplyStrategy::MergeOnly => {},
		}

		let conn = ctx.data::<CoreContext>()?.conn.as_ref();

		let draft = llm_library_tag_draft::Entity::find_by_id(draft_id)
			.one(conn)
			.await?
			.ok_or("LLM library tag draft not found")?;

		if !matches!(
			draft.status,
			LlmLibraryTagDraftStatus::AwaitingReview | LlmLibraryTagDraftStatus::Applied
		) {
			return Err("LLM library tag draft is not awaiting review".into());
		}

		let assignments: Vec<models::shared::llm_tagging::LlmLibraryTagAssignment> =
			draft
				.assignments
				.as_ref()
				.and_then(|v| serde_json::from_value(v.clone()).ok())
				.unwrap_or_default();

		let filter: Option<std::collections::HashSet<String>> =
			media_ids.map(|ids| ids.into_iter().map(|id| id.to_string()).collect());

		// keep only assignments for books which still exist
		let candidate_ids: Vec<String> = assignments
			.iter()
			.filter(|a| filter.as_ref().is_none_or(|set| set.contains(&a.media_id)))
			.map(|a| a.media_id.clone())
			.collect();

		let mut existing_ids = std::collections::HashSet::new();
		for chunk in candidate_ids.chunks(stump_core::database::SQLITE_BIND_LIMIT) {
			let rows: Vec<String> = media::Entity::find()
				.select_only()
				.column(media::Column::Id)
				.filter(media::Column::Id.is_in(chunk.to_vec()))
				.into_tuple()
				.all(conn)
				.await?;
			existing_ids.extend(rows);
		}

		let tx = conn.begin().await?;
		let mut applied = 0u32;

		for assignment in assignments {
			if let Some(set) = &filter {
				if !set.contains(&assignment.media_id) {
					continue;
				}
			}
			if !existing_ids.contains(&assignment.media_id) {
				continue;
			}

			let result = stump_core::llm_tagging::apply_tags(
				&tx,
				&assignment.media_id,
				&assignment.tags,
			)
			.await;

			match result {
				Ok(()) => applied += 1,
				Err(e) => {
					tracing::error!(
						media_id = %assignment.media_id,
						error = ?e,
						"Failed to apply LLM library tag assignment"
					);
				},
			}
		}

		tx.commit().await?;

		// a full apply completes the draft; a partial one stays reviewable
		if filter.is_none() {
			let mut active = draft.into_active_model();
			active.status = Set(LlmLibraryTagDraftStatus::Applied);
			active.update(conn).await?;
		}

		Ok(applied)
	}

	/// Update the LLM tagging configuration. Missing fields fall back to
	/// their defaults and values are sanitized into safe bounds.
	#[graphql(guard = "PermissionGuard::one(UserPermission::ManageServer)")]
	async fn update_llm_tagging_config(
		&self,
		ctx: &Context<'_>,
		config: async_graphql::Json<serde_json::Value>,
	) -> Result<LlmTaggingConfig> {
		let conn = ctx.data::<CoreContext>()?.conn.as_ref();

		let parsed: LlmTaggingConfig = serde_json::from_value(config.0)
			.map_err(|e| format!("Invalid LLM tagging config: {e}"))?;
		let sanitized = parsed.sanitized();

		let existing = server_config::Entity::find()
			.one(conn)
			.await?
			.ok_or("Server configuration not found")?;

		let mut active = existing.into_active_model();
		active.llm_tagging_config = Set(Some(sanitized.to_json()));
		active.update(conn).await?;

		Ok(sanitized)
	}
}

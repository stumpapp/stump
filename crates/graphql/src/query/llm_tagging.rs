use crate::{
	data::CoreContext,
	guard::PermissionGuard,
	object::llm_tagging::{LlmLibraryTagDraft, LlmTagSuggestion},
};
use async_graphql::{Context, Object, Result, ID};
use models::{
	entity::{llm_library_tag_draft, llm_tag_suggestion},
	shared::{
		enums::{LlmLibraryTagDraftStatus, LlmTagSuggestionStatus, UserPermission},
		llm_tagging::LlmTaggingConfig,
	},
};
use sea_orm::{prelude::*, QueryOrder};

#[derive(Default)]
pub struct LlmTaggingQuery;

#[Object]
impl LlmTaggingQuery {
	/// Return all LLM tag suggestions that are awaiting user review
	#[graphql(guard = "PermissionGuard::one(UserPermission::MetadataFetchRecordRead)")]
	async fn pending_llm_tag_suggestions(
		&self,
		ctx: &Context<'_>,
	) -> Result<Vec<LlmTagSuggestion>> {
		let conn = ctx.data::<CoreContext>()?.conn.as_ref();

		let records = llm_tag_suggestion::Entity::find()
			.filter(
				llm_tag_suggestion::Column::Status.eq(LlmTagSuggestionStatus::Suggested),
			)
			.all(conn)
			.await?;

		Ok(records.into_iter().map(LlmTagSuggestion::from).collect())
	}

	/// Return the LLM library tag analysis drafts for a library, newest first
	#[graphql(guard = "PermissionGuard::one(UserPermission::MetadataFetchRecordRead)")]
	async fn llm_library_tag_drafts(
		&self,
		ctx: &Context<'_>,
		library_id: ID,
	) -> Result<Vec<LlmLibraryTagDraft>> {
		let conn = ctx.data::<CoreContext>()?.conn.as_ref();

		let drafts = llm_library_tag_draft::Entity::find()
			.filter(llm_library_tag_draft::Column::LibraryId.eq(library_id.to_string()))
			.order_by_desc(llm_library_tag_draft::Column::Id)
			.all(conn)
			.await?;

		Ok(drafts.into_iter().map(LlmLibraryTagDraft::from).collect())
	}

	/// Whether a library-wide LLM tag analysis is currently resumable
	#[graphql(guard = "PermissionGuard::one(UserPermission::MetadataFetchRecordRead)")]
	async fn llm_library_tag_draft_in_progress(
		&self,
		ctx: &Context<'_>,
		library_id: ID,
	) -> Result<Option<LlmLibraryTagDraft>> {
		let conn = ctx.data::<CoreContext>()?.conn.as_ref();

		let draft = llm_library_tag_draft::Entity::find()
			.filter(llm_library_tag_draft::Column::LibraryId.eq(library_id.to_string()))
			.filter(llm_library_tag_draft::Column::Status.is_in([
				LlmLibraryTagDraftStatus::InProgress,
				LlmLibraryTagDraftStatus::RateLimited,
			]))
			.order_by_desc(llm_library_tag_draft::Column::Id)
			.one(conn)
			.await?;

		Ok(draft.map(LlmLibraryTagDraft::from))
	}

	/// The LLM tagging configuration for the server
	#[graphql(guard = "PermissionGuard::one(UserPermission::ManageServer)")]
	async fn llm_tagging_config(&self, ctx: &Context<'_>) -> Result<LlmTaggingConfig> {
		let conn = ctx.data::<CoreContext>()?.conn.as_ref();

		let config = models::entity::server_config::Entity::find()
			.one(conn)
			.await?
			.ok_or("Server configuration not found")?;

		Ok(LlmTaggingConfig::from_json(config.llm_tagging_config.as_ref()).sanitized())
	}
}

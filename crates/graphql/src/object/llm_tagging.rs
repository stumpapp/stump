use async_graphql::{ComplexObject, Context, Result, SimpleObject};
use models::{
	entity::{llm_library_tag_draft, llm_tag_suggestion, media},
	shared::llm_tagging::{LlmLibraryTagAssignment, LlmSuggestedTag},
};

use crate::{
	data::{AuthContext, CoreContext},
	object::media::Media,
};

#[derive(Debug, SimpleObject)]
#[graphql(complex)]
pub struct LlmTagSuggestion {
	#[graphql(flatten)]
	pub model: llm_tag_suggestion::Model,
}

impl From<llm_tag_suggestion::Model> for LlmTagSuggestion {
	fn from(model: llm_tag_suggestion::Model) -> Self {
		Self { model }
	}
}

#[ComplexObject]
impl LlmTagSuggestion {
	/// The suggested tags with their confidence and reasoning
	async fn suggested_tags(&self) -> Vec<LlmSuggestedTag> {
		self.model
			.suggested_tags
			.as_ref()
			.and_then(|v| serde_json::from_value(v.clone()).ok())
			.unwrap_or_default()
	}

	/// The tag names which were actually applied, if any
	async fn applied_tags(&self) -> Vec<String> {
		self.model
			.applied_tags
			.as_ref()
			.and_then(|v| serde_json::from_value(v.clone()).ok())
			.unwrap_or_default()
	}

	/// The media item associated with this suggestion, if any
	async fn media(&self, ctx: &Context<'_>) -> Result<Option<Media>> {
		let conn = ctx.data::<CoreContext>()?.conn.as_ref();
		let AuthContext { user, .. } = ctx.data::<AuthContext>()?;

		// Note: same access caveat as metadata fetch records, a user allowed
		// to review suggestions may not be able to view the book itself
		let model = media::ModelWithMetadata::find_by_id_for_user(
			self.model.media_id.clone(),
			user,
		)
		.into_model::<media::ModelWithMetadata>()
		.one(conn)
		.await?;

		Ok(model.map(|m| m.into()))
	}
}

#[derive(Debug, SimpleObject)]
#[graphql(complex)]
pub struct LlmLibraryTagDraft {
	#[graphql(flatten)]
	pub model: llm_library_tag_draft::Model,
}

impl From<llm_library_tag_draft::Model> for LlmLibraryTagDraft {
	fn from(model: llm_library_tag_draft::Model) -> Self {
		Self { model }
	}
}

#[ComplexObject]
impl LlmLibraryTagDraft {
	/// The per-book tag assignments suggested by the analysis
	async fn assignments(&self) -> Vec<LlmLibraryTagAssignment> {
		self.model
			.assignments
			.as_ref()
			.and_then(|v| serde_json::from_value(v.clone()).ok())
			.unwrap_or_default()
	}
}

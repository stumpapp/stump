use async_graphql::{ComplexObject, Context, Result, SimpleObject};
use metadata_integrations::MatchCandidate;
use models::entity::{media, metadata_fetch_record, series};

use crate::{
	data::{AuthContext, CoreContext},
	object::{media::Media, series::Series},
};

#[derive(Debug, SimpleObject)]
#[graphql(complex)]
pub struct MetadataFetchRecord {
	#[graphql(flatten)]
	pub model: metadata_fetch_record::Model,
}

#[ComplexObject]
impl MetadataFetchRecord {
	async fn match_candidates(&self) -> Result<Vec<MatchCandidate>> {
		let candidates: Vec<MatchCandidate> = self
			.model
			.match_candidates
			.as_ref()
			.and_then(|v| serde_json::from_value(v.clone()).ok())
			.unwrap_or_default();
		Ok(candidates)
	}

	async fn accepted_match_candidate(&self) -> Result<Option<MatchCandidate>> {
		let candidate: Option<MatchCandidate> = self
			.model
			.accepted_match_candidate
			.as_ref()
			.and_then(|v| serde_json::from_value(v.clone()).ok());
		Ok(candidate)
	}

	/// The media item associated with this fetch record, if any
	async fn media(&self, ctx: &Context<'_>) -> Result<Option<Media>> {
		let Some(media_id) = &self.model.media_id else {
			return Ok(None);
		};
		let conn = ctx.data::<CoreContext>()?.conn.as_ref();
		let AuthContext { user, .. } = ctx.data::<AuthContext>()?;

		// Note: This is another awkward access issue where a user with permission to view these
		// fetch records might not have permission to view the associated media.
		// TODO(docs): I think this is acceptable but worth noting in the docs
		let model = media::ModelWithMetadata::find_by_id_for_user(media_id.clone(), user)
			.into_model::<media::ModelWithMetadata>()
			.one(conn)
			.await?;

		Ok(model.map(|m| m.into()))
	}

	/// The series associated with this fetch record, if any
	async fn series(&self, ctx: &Context<'_>) -> Result<Option<Series>> {
		let Some(series_id) = &self.model.series_id else {
			return Ok(None);
		};

		let conn = ctx.data::<CoreContext>()?.conn.as_ref();
		let AuthContext { user, .. } = ctx.data::<AuthContext>()?;

		// Note: This is another awkward access issue where a user with permission to view these
		// fetch records might not have permission to view the associated media.
		// TODO(docs): I think this is acceptable but worth noting in the docs
		let model =
			series::ModelWithMetadata::find_by_id_for_user(series_id.clone(), user)
				.into_model::<series::ModelWithMetadata>()
				.one(conn)
				.await?;

		Ok(model.map(|s| s.into()))
	}
}

impl From<metadata_fetch_record::Model> for MetadataFetchRecord {
	fn from(model: metadata_fetch_record::Model) -> Self {
		Self { model }
	}
}

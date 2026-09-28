use async_graphql::{
	dataloader::DataLoader, ComplexObject, Context, Result, SimpleObject,
};
use models::entity::{reading_session, reading_session::DeviceIds};

use crate::{
	data::AuthContext,
	loader::media::{MediaByIdLoaderKey, MediaLoader},
	object::media::Media,
};

#[derive(Debug, Clone, SimpleObject)]
#[graphql(complex, name = "ReadingSession")]
pub struct ReadingSession {
	#[graphql(flatten)]
	pub model: reading_session::Model,
}

#[ComplexObject]
impl ReadingSession {
	async fn device_ids(&self) -> Vec<String> {
		self.model
			.device_ids
			.as_ref()
			.map(|DeviceIds(ids)| ids.clone())
			.unwrap_or_default()
	}

	// TODO: async fn devices(&self, ctx: &Context<'_>) -> Result<Vec<RegisteredReadingDevice>>

	async fn media(&self, ctx: &Context<'_>) -> Result<Option<Media>> {
		let AuthContext { user, .. } = ctx.data::<AuthContext>()?;
		let loader = ctx.data::<DataLoader<MediaLoader>>()?;

		// TODO(reading-timeline): user id needs to be considered, realistically the only scenario this
		// protects against is user read while having permission to a book that is now
		// revoked. still valid to protect against, but will come last before merge
		let media = loader
			.load_one(MediaByIdLoaderKey {
				id: self.model.media_id.clone(),
			})
			.await?;

		Ok(media)
	}
}

impl From<reading_session::Model> for ReadingSession {
	fn from(model: reading_session::Model) -> Self {
		Self { model }
	}
}

/// a view through which a client can resolve conflicts relative to a local ancestor session
/// and any number of remote sessions which were created afterwards
#[derive(Debug, Clone, SimpleObject)]
pub struct ReadingSessionConflictResolutionView {
	/// the last session which was known to be in sync with the local client. it's possible there is no ancestor session, e.g. if
	/// the book was downloaded on the client before any reading sessions were created on the server
	pub ancestor_session: Option<ReadingSession>,
	/// all sessions created/updated on **this server** (remote) after the ancestor session, ordered
	/// by created_at ascending
	pub remote_sessions: Vec<ReadingSession>,
}

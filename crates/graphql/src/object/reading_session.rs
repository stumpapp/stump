use async_graphql::{
	dataloader::DataLoader, ComplexObject, Context, Result, SimpleObject,
};
use models::entity::{
	bookmark, media_annotation,
	reading_session::{self, DeviceIds},
};
use sea_orm::{prelude::*, QueryOrder};

use crate::{
	data::{AuthContext, CoreContext},
	loader::media::{MediaByIdLoaderKey, MediaLoader},
	object::{
		bookmark::Bookmark, media::Media, media_annotation::MediaAnnotation,
		reading_timeline::SessionEvent,
	},
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

	async fn events(&self, ctx: &Context<'_>) -> Result<Vec<SessionEvent>> {
		// TODO(reading-timeline): access control
		let AuthContext { user, .. } = ctx.data::<AuthContext>()?;
		let conn = ctx.data::<CoreContext>()?.conn.as_ref();

		let bookmarks = bookmark::Entity::find()
			.filter(bookmark::Column::SessionId.eq(self.model.id))
			.order_by_desc(bookmark::Column::CreatedAt)
			.all(conn)
			.await?;
		let annotations = media_annotation::Entity::find()
			.filter(media_annotation::Column::SessionId.eq(self.model.id))
			.order_by_desc(media_annotation::Column::CreatedAt)
			.all(conn)
			.await?;

		let events = {
			let mut events = Vec::with_capacity(bookmarks.len() + annotations.len());
			events.extend(
				bookmarks
					.into_iter()
					.map(|b| SessionEvent::Bookmark(Bookmark::from(b))),
			);
			events.extend(
				annotations
					.into_iter()
					.map(|a| SessionEvent::Annotation(MediaAnnotation::from(a))),
			);
			events.sort_by(|a, b| b.created_at().cmp(&a.created_at())); // desc
			events
		};

		Ok(events)
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

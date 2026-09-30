use async_graphql::{
	dataloader::DataLoader, ComplexObject, Context, Result, SimpleObject,
};
use models::{
	domain::readium::chapters_between_locators,
	entity::{
		bookmark,
		media::{self, MediaIdentSelect},
		media_annotation,
		reading_session::{self, DeviceIds},
	},
	shared::ordering::OrderDirection,
};
use sea_orm::{prelude::*, QueryOrder, QuerySelect};
use stump_core::readium::ReadiumManifestGenerator;
use tokio::task::spawn_blocking;

use crate::{
	data::{AuthContext, CoreContext},
	loader::media::{MediaByIdForUserLoaderKey, MediaLoader},
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

// TODO(reading-timeline): wrt access control, i'm thinking that it might just
// need to be locked down by the higher nodes (i.e., assume access check done when
// session node passed down to here). otherwise each selection will just duplicate
// a bunch of ac logic, which is inefficient as hell but really also importantly
// a terrible mess to maintain

/// A single, contiguous reading session for a given user and book. Access to this node
/// MUST be restricted by the resolvers which would return it, and resolvers within
/// this node assume as such
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

	/// The media which this session belongs to. Please note that if somehow the user loses access to the
	/// media record, e.g. via access control, then this will resolve to `None` to avoid leaking
	/// information which the user no longer has access to. It is a bit awkward, since the session itself
	/// means they have at least at some point read some portion
	async fn media(&self, ctx: &Context<'_>) -> Result<Option<Media>> {
		let AuthContext { user, .. } = ctx.data::<AuthContext>()?;
		let loader = ctx.data::<DataLoader<MediaLoader>>()?;

		let media = loader
			.load_one(MediaByIdForUserLoaderKey {
				id: self.model.media_id.clone(),
				user_id: user.id.clone(),
			})
			.await?;

		Ok(media)
	}

	async fn events(
		&self,
		ctx: &Context<'_>,
		#[graphql(default_with = "OrderDirection::Asc")] order: OrderDirection,
	) -> Result<Vec<SessionEvent>> {
		let conn = ctx.data::<CoreContext>()?.conn.as_ref();

		let bookmarks = bookmark::Entity::find()
			.filter(bookmark::Column::SessionId.eq(self.model.id))
			.order_by(bookmark::Column::CreatedAt, order.into())
			.all(conn)
			.await?;
		let annotations = media_annotation::Entity::find()
			.filter(media_annotation::Column::SessionId.eq(self.model.id))
			.order_by(media_annotation::Column::CreatedAt, order.into())
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
			events.sort_by(|a, b| match order {
				OrderDirection::Asc => a.created_at().cmp(&b.created_at()),
				OrderDirection::Desc => b.created_at().cmp(&a.created_at()),
			});
			events
		};

		Ok(events)
	}

	/// Returns the list of chapter titles read during this session, including the start
	/// and end chapters.
	///
	/// ## Important: This has some io cost and so should not necessarily be used in a list
	/// of sessions but more a detail view into a single session, etc.
	// ^ TODO: at least not until potentially storing the positions in the db
	async fn chapters_read(&self, ctx: &Context<'_>) -> Result<Vec<String>> {
		let conn = ctx.data::<CoreContext>()?.conn.as_ref();

		let selection = media::Entity::find_by_id(self.model.media_id.clone())
			.select_only()
			.columns(MediaIdentSelect::columns())
			.filter(media::Column::Extension.like("epub"))
			.into_model::<MediaIdentSelect>()
			.one(conn)
			.await?;
		let Some(book) = selection else {
			tracing::debug!(
				?self.model.media_id,
				"book is not an epub so skipping chapters_read computation"
			);
			return Ok(vec![]);
		};

		let generator =
			ReadiumManifestGenerator::new(book.path, "internal://".to_string());
		// TODO(optimize): should generate positions once at ingestion and store in db
		let positions = spawn_blocking(move || generator.generate_positions()).await??;

		match (&self.model.start_locator, &self.model.end_locator) {
			(Some(start), Some(end)) => Ok(chapters_between_locators(
				start,
				end,
				positions.positions.as_slice(),
			)),
			_ => Ok(vec![]),
		}
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

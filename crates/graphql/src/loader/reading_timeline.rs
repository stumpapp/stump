use std::{
	collections::{HashMap, HashSet},
	sync::Arc,
};

use async_graphql::dataloader::Loader;
use models::{
	entity::{bookmark, media_annotation, reading_session},
	shared::ordering::OrderDirection,
};
use sea_orm::{prelude::*, DatabaseConnection, QueryOrder};

use crate::object::{
	bookmark::Bookmark,
	media_annotation::MediaAnnotation,
	reading_session::ReadingSession,
	reading_timeline::{BookReadingTimeline, SessionEvent, SessionWithEvents},
};

pub struct ReadingTimelineLoader {
	pub conn: Arc<DatabaseConnection>,
}

impl ReadingTimelineLoader {
	pub fn new(conn: Arc<DatabaseConnection>) -> Self {
		Self { conn }
	}
}

// TODO: originally i put book-specific timeline here thinking it would
// be used for global potentially, but perhaps not? if it is a one-time thing
// then perhaps it should be moved to somewhere else??
// really the only thing i can think of is for book clubs, and i think at that point it would be a custom query
// resolver so this should be moved. i'll do it another time

/// Loader key for a book-specific timeline, not intended to be paginated
#[derive(Debug, Clone, PartialEq, Eq, Hash)]
pub struct BookReadingTimelineLoaderKey {
	pub user_id: String,
	pub media_id: String,
}

impl Loader<BookReadingTimelineLoaderKey> for ReadingTimelineLoader {
	type Value = BookReadingTimeline;
	type Error = Arc<sea_orm::DbErr>;

	async fn load(
		&self,
		keys: &[BookReadingTimelineLoaderKey],
	) -> Result<HashMap<BookReadingTimelineLoaderKey, Self::Value>, Self::Error> {
		if keys.is_empty() {
			return Ok(HashMap::new());
		}

		let user_ids = keys.iter().map(|k| k.user_id.clone()).collect::<Vec<_>>();
		let media_ids = keys.iter().map(|k| k.media_id.clone()).collect::<Vec<_>>();

		let sessions = reading_session::Entity::find()
			.filter(
				reading_session::Column::UserId
					.is_in(user_ids.clone())
					.and(reading_session::Column::MediaId.is_in(media_ids.clone())),
			)
			.order_by_desc(reading_session::Column::ReadthroughNumber)
			.order_by_desc(reading_session::Column::CreatedAt)
			// ^ the ui will present most recent activity at the top
			.all(self.conn.as_ref())
			.await?;
		let session_ids = sessions.iter().map(|s| s.id).collect::<Vec<_>>();

		// TODO: need to figure out, part of how i approach this depends on whether
		// there can actually truly exist annotations/bookmarks etc without a session.
		// if they can, then the simplified filters ive done here are not sufficient since
		// it would exlucde those events.

		let mut session_id_to_bookmarks = bookmark::Entity::find()
			.filter(bookmark::Column::SessionId.is_in(session_ids.clone()))
			// ^ we don't need to filter by user/media since the sessions themselves
			// have already been filtered as such
			.order_by_desc(bookmark::Column::CreatedAt)
			.all(self.conn.as_ref())
			.await?
			.into_iter()
			.fold(HashMap::new(), |mut acc, bookmark| {
				if let Some(session_id) = bookmark.session_id {
					acc.entry(session_id)
						.or_insert_with(Vec::new)
						.push(bookmark);
				}
				acc
			});

		let mut session_id_to_annotations = media_annotation::Entity::find()
			.filter(media_annotation::Column::SessionId.is_in(session_ids.clone()))
			.order_by_desc(models::entity::media_annotation::Column::CreatedAt)
			.all(self.conn.as_ref())
			.await?
			.into_iter()
			.fold(HashMap::new(), |mut acc, annotation| {
				if let Some(session_id) = annotation.session_id {
					acc.entry(session_id)
						.or_insert_with(Vec::new)
						.push(annotation);
				}
				acc
			});

		let unique_set = sessions
			.iter()
			.map(|session| (session.user_id.clone(), session.media_id.clone()))
			.collect::<HashSet<_>>();

		let sessions_with_events = sessions
			.into_iter()
			.map(|session| SessionWithEvents {
				session: ReadingSession::from(session.clone()),
				events: {
					let mut events = Vec::new();
					if let Some(bookmarks) = session_id_to_bookmarks.remove(&session.id) {
						events.extend(
							bookmarks
								.into_iter()
								.map(|b| SessionEvent::Bookmark(Bookmark::from(b))),
						);
					}
					if let Some(annotations) =
						session_id_to_annotations.remove(&session.id)
					{
						events.extend(
							annotations.into_iter().map(|a| {
								SessionEvent::Annotation(MediaAnnotation::from(a))
							}),
						);
					}
					events.sort_by(|a, b| b.created_at().cmp(&a.created_at())); // desc
					events
				},
			})
			.collect::<Vec<_>>();

		let mut result = HashMap::new();

		for key in keys {
			let Some(pair) = unique_set.get(&(key.user_id.clone(), key.media_id.clone()))
			else {
				continue;
				// ^ mostly to avoid filtering for sm that doesn't exist, and therefore
				// excluding it from the result set
			};

			let pair_sessions_with_events = sessions_with_events
				.iter()
				.filter(|swe| {
					swe.session.model.user_id == pair.0
						&& swe.session.model.media_id == pair.1
				})
				.cloned()
				.collect::<Vec<_>>();

			let book_timeline =
				BookReadingTimeline::new(pair_sessions_with_events, OrderDirection::Desc);

			result.insert(
				BookReadingTimelineLoaderKey {
					user_id: pair.0.clone(),
					media_id: pair.1.clone(),
				},
				book_timeline,
			);
		}

		Ok(result)
	}
}

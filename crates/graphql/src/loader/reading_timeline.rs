use std::{
	collections::{HashMap, HashSet},
	sync::Arc,
};

use async_graphql::dataloader::Loader;
use chrono::Utc;
use models::{
	domain::reading_progress::calculate_logical_date,
	entity::{bookmark, media_annotation, reading_session, user_preferences},
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

		let bookmarks = bookmark::Entity::find()
			.filter(
				bookmark::Column::UserId
					.is_in(user_ids.clone())
					.and(bookmark::Column::MediaId.is_in(media_ids.clone())),
			)
			.order_by_desc(bookmark::Column::CreatedAt)
			.all(self.conn.as_ref())
			.await?;

		let annotations = models::entity::media_annotation::Entity::find()
			.filter(
				models::entity::media_annotation::Column::UserId
					.is_in(user_ids.clone())
					.and(
						models::entity::media_annotation::Column::MediaId
							.is_in(media_ids.clone()),
					),
			)
			.order_by_desc(models::entity::media_annotation::Column::CreatedAt)
			.all(self.conn.as_ref())
			.await?;

		let users_preferences = user_preferences::Entity::find()
			.filter(user_preferences::Column::UserId.is_in(user_ids.clone()))
			.all(self.conn.as_ref())
			.await?;

		let user_to_day_reset_preference = users_preferences
			.into_iter()
			.map(|pref| {
				(
					pref.user_id.clone().unwrap_or_default(), // well that is annoying
					pref.day_reset_hour_offset,
				)
			})
			.collect::<HashMap<_, _>>();

		let unique_set = sessions
			.iter()
			.map(|session| (session.user_id.clone(), session.media_id.clone()))
			.collect::<HashSet<_>>();

		let mut result = HashMap::new();

		for key in keys {
			let Some(pair) = unique_set.get(&(key.user_id.clone(), key.media_id.clone()))
			else {
				continue;
				// ^ mostly to avoid filtering for sm that doesn't exist, and therefore
				// excluding it from the result set
			};

			let day_reset_hour_offset = user_to_day_reset_preference
				.get(&pair.0)
				.cloned()
				.unwrap_or(0);

			let pair_sessions = sessions
				.iter()
				.filter(|s| s.user_id == pair.0 && s.media_id == pair.1)
				.collect::<Vec<_>>();

			let pair_bookmarks = bookmarks
				.iter()
				.filter(|b| b.user_id == pair.0 && b.media_id == pair.1)
				.collect::<Vec<_>>();

			let pair_annotations = annotations
				.iter()
				.filter(|a| a.user_id == pair.0 && a.media_id == pair.1)
				.collect::<Vec<_>>();

			todo!("figure out how to group this shit together")
			// ^ should not be all that difficult, sessions provide a start/end window
			// but it just might be a bit inefficient
		}

		Ok(result)
	}
}

// this is all quite annoying honestly, makes me think shoving a fk to the session on the events would be a lot
// easier...

/// Assigns the various events (bookmarks, annotations) to the appropriate session based on
/// timestamps. Assumes all data provided is scoped to a specific user
fn assign_events_to_sessions(
	sessions: Vec<reading_session::Model>,
	bookmarks: Vec<bookmark::Model>,
	annotations: Vec<media_annotation::Model>,
	day_reset_hour_offset: i32,
) -> Vec<SessionWithEvents> {
	// each iter of events will require a lookup to push into the session, so
	// i have a basic map to avoid exploding the complexity
	let mut session_date_to_index = sessions
		.iter()
		.enumerate()
		.map(|(i, session)| (session.session_date, i))
		.collect::<HashMap<_, _>>();

	let mut session_with_events = sessions
		.into_iter()
		.map(|session| SessionWithEvents {
			session: ReadingSession::from(session),
			events: vec![],
		})
		.collect::<Vec<_>>();

	for bookmark in bookmarks {
		let date = calculate_logical_date(
			// TODO: make bookmark stamps DateTimeWithTimeZone and avoid this conversion
			// should be a simple swap but will inflate the diff so leaving for now
			bookmark.created_at.with_timezone(&Utc),
			day_reset_hour_offset,
		);
		match session_date_to_index.get(&date) {
			// TODO: prolly can't do this separately (the loops) since events is meant to be
			// chronological, and by splitting i have broken that rule already. when i log
			// back on ig i'll rethink >:(
			// ^ or just sort after and let my life be easier lol yeah maybe
			Some(&idx) => session_with_events[idx]
				.events
				.push(SessionEvent::Bookmark(Bookmark::from(bookmark))),
			None => todo!("wtf do i do here?"),
		}
	}

	for annotation in annotations {
		let date = calculate_logical_date(
			// TODO: same as bookmark above
			annotation.created_at.with_timezone(&Utc),
			day_reset_hour_offset,
		);
		match session_date_to_index.get(&date) {
			Some(&idx) => session_with_events[idx]
				.events
				.push(SessionEvent::Annotation(MediaAnnotation::from(annotation))),
			None => todo!("wtf do i do here?"),
		}
	}

	unimplemented!()
}

// TODO: non-book-specific loader

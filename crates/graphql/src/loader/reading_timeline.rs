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
	reading_timeline::{
		BookReadingTimeline, ReadthroughTimeline, SessionEvent, SessionWithEvents,
	},
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

			let sessions_with_events = assign_events_to_sessions(
				pair_sessions.into_iter().cloned().collect(),
				pair_bookmarks.into_iter().cloned().collect(),
				pair_annotations.into_iter().cloned().collect(),
				day_reset_hour_offset,
			);

			let book_timeline = organize_sessions_into_timeline(sessions_with_events);

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

// this is all quite annoying honestly, makes me think shoving a fk to the session on the events would be a lot
// easier...
// thhis wouldn't help much with readthroughs ig, but associating event with sessions
// would entirely fold into a join. would not be great for pre-this-change data which
// is annoying, but maybe this can be a fallback or one-off migration? selfishly i want
// my data but it isn't the end of the world

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
	let session_date_to_index = sessions
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
			Some(&idx) => session_with_events[idx]
				.events
				.push(SessionEvent::Bookmark(Bookmark::from(bookmark))),
			None => todo!("wtf do i do here?"),
			// ^ this feels like a bit of a weird edge case, unless someone programmatically
			// created a bookmark it should always be associated with a session. I may just
			// skip it and log it, hoping if it happens someone reports it and i can take it
			// from there. or i just add fks and rm this entire function basically
		}
	}

	for annotation in annotations {
		let date = calculate_logical_date(
			annotation.created_at.with_timezone(&Utc),
			day_reset_hour_offset,
		);
		match session_date_to_index.get(&date) {
			Some(&idx) => session_with_events[idx]
				.events
				.push(SessionEvent::Annotation(MediaAnnotation::from(annotation))),
			None => todo!("wtf do i do here?"),
			// TODO: same as above
		}
	}

	for session in &mut session_with_events {
		session
			.events
			.sort_by(|a, b| b.created_at().cmp(&a.created_at())); // desc
	}

	unimplemented!()
}

fn organize_sessions_into_timeline(
	sessions_with_events: Vec<SessionWithEvents>,
) -> BookReadingTimeline {
	let mut readthroughs_map: HashMap<i32, ReadthroughTimeline> = HashMap::new();

	for swe in sessions_with_events {
		let readthrough_number = swe.session.model.readthrough_number;

		let entry =
			readthroughs_map
				.entry(readthrough_number)
				.or_insert(ReadthroughTimeline {
					readthrough_number,
					started_at: swe.session.model.created_at,
					finished_at: None,
					status: swe.session.model.status.clone(),
					total_elapsed_seconds: 0,
					sessions: vec![],
				});
		// ^ some of the more aggregate values will have to be computed in a separate
		// iteration

		entry.total_elapsed_seconds += swe.session.model.elapsed_seconds.unwrap_or(0);
		entry.sessions.push(swe);
	}

	let mut readthroughs = readthroughs_map
		.into_iter()
		.map(|(_, rt)| rt)
		.collect::<Vec<_>>();
	// TODO: double check unstable is ideal here
	readthroughs.sort_unstable_by(|a, b| b.started_at.cmp(&a.started_at));
	// ^ desc

	let readthroughs = readthroughs
		.into_iter()
		.map(|readthrough| {
			let started_at = readthrough
				.sessions
				.iter()
				.map(|s| s.session.model.created_at)
				.min();

			let (status, finished_at) = readthrough
				.sessions
				.iter()
				.filter(|s| s.session.model.is_finalized())
				.map(|s| (s.session.model.status.clone(), s.session.model.updated_at))
				.last()
				.unwrap_or((readthrough.status.clone(), None));

			let total_elapsed_seconds = readthrough
				.sessions
				.iter()
				.map(|s| s.session.model.elapsed_seconds.unwrap_or(0))
				.sum();

			ReadthroughTimeline {
				readthrough_number: readthrough.readthrough_number,
				started_at: started_at.unwrap_or(readthrough.started_at),
				finished_at,
				status,
				total_elapsed_seconds,
				sessions: readthrough.sessions,
			}
		})
		.collect::<Vec<_>>();

	let total_elapsed_seconds =
		readthroughs.iter().map(|rt| rt.total_elapsed_seconds).sum();

	BookReadingTimeline {
		readthroughs,
		total_elapsed_seconds,
	}
}

// TODO: non-book-specific loader

use std::collections::HashMap;

use async_graphql::{SimpleObject, Union};
use chrono::{DateTime, FixedOffset, Utc};
use models::{
	services::reading_timeline::ServiceSessionWithEvents,
	shared::{enums::ReadingStatus, ordering::OrderDirection},
};

use crate::object::{
	bookmark::Bookmark, media_annotation::MediaAnnotation,
	reading_session::ReadingSession,
};

#[derive(Clone, Union)]
pub enum SessionEvent {
	Bookmark(Bookmark),
	Annotation(MediaAnnotation),
	// TODO(reading-timeline):
	// - reviews
	// - journal entries
	// - synthetic events? may not be feasible for the paginated variant of timeline
}

impl SessionEvent {
	pub fn created_at(&self) -> DateTime<Utc> {
		match self {
			SessionEvent::Bookmark(b) => b.model.created_at,
			SessionEvent::Annotation(a) => a.model.created_at,
		}
	}
}

#[derive(Clone, SimpleObject)]
pub struct SessionWithEvents {
	pub session: ReadingSession,
	pub events: Vec<SessionEvent>,
}

impl SessionWithEvents {
	/// Construct a gql `SessionWithEvents` from the service repr `ServiceSessionWithEvents`, and
	/// sort the events by the given order direction
	pub fn from_service(
		(session, bookmarks, annotations): ServiceSessionWithEvents,
		order: OrderDirection,
	) -> Self {
		Self {
			session: ReadingSession { model: session },
			events: {
				let mut events =
					bookmarks
						.into_iter()
						.map(|b| SessionEvent::Bookmark(Bookmark { model: b }))
						.chain(annotations.into_iter().map(|a| {
							SessionEvent::Annotation(MediaAnnotation { model: a })
						}))
						.collect::<Vec<_>>();

				events.sort_by(|a, b| match order {
					OrderDirection::Asc => a.created_at().cmp(&b.created_at()),
					_ => b.created_at().cmp(&a.created_at()),
				});

				events
			},
		}
	}
}

/// The timeline of events for a specific readthrough of a book
#[derive(Clone, SimpleObject)]
pub struct ReadthroughTimeline {
	pub readthrough_number: i32,
	pub started_at: DateTime<FixedOffset>,
	pub finished_at: Option<DateTime<FixedOffset>>,
	pub status: ReadingStatus,
	pub total_elapsed_seconds: i64,
	pub sessions: Vec<SessionWithEvents>,
}

/// The full timeline of events for a book, including all readthroughs and their sessions
#[derive(Clone, SimpleObject)]
pub struct BookReadingTimeline {
	pub readthroughs: Vec<ReadthroughTimeline>,
	pub total_elapsed_seconds: i64,
}

impl BookReadingTimeline {
	pub fn new(
		sessions_with_events: Vec<SessionWithEvents>,
		order: OrderDirection,
	) -> BookReadingTimeline {
		let mut readthroughs_map: HashMap<i32, ReadthroughTimeline> = HashMap::new();

		for swe in sessions_with_events {
			let readthrough_number = swe.session.model.readthrough_number;

			let entry = readthroughs_map.entry(readthrough_number).or_insert(
				ReadthroughTimeline {
					readthrough_number,
					started_at: swe.session.model.created_at,
					finished_at: None,
					status: swe.session.model.status,
					total_elapsed_seconds: 0,
					sessions: vec![],
				},
			);
			// ^ some of the more aggregate values will have to be computed in a separate
			// iteration (below)

			entry.total_elapsed_seconds += swe.session.model.elapsed_seconds.unwrap_or(0);
			entry.sessions.push(swe);
		}

		let mut readthroughs = readthroughs_map.into_values().collect::<Vec<_>>();
		// TODO: double check unstable is ideal here
		readthroughs.sort_unstable_by(|a, b| match order {
			OrderDirection::Asc => a.started_at.cmp(&b.started_at),
			_ => b.started_at.cmp(&a.started_at),
		});

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
					.map(|s| (s.session.model.status, s.session.model.updated_at))
					.next_back()
					.unwrap_or((readthrough.status, None));
				// ^ the thought here that we only can assign a finished_at to a readthrough if there
				// is a finalizing session (i.e., finished or abandoned)

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
}

/// A node in the global reading timeline, which is more of a flat list of sessions with their
/// corresponding events instead of being grouped by readthroughs
#[derive(Clone, SimpleObject)]
pub struct GlobalReadingTimelineNode {
	pub media_id: String,
	pub session: SessionWithEvents,
}

impl From<SessionWithEvents> for GlobalReadingTimelineNode {
	fn from(session_with_events: SessionWithEvents) -> Self {
		Self {
			media_id: session_with_events.session.model.media_id.clone(),
			session: session_with_events,
		}
	}
}

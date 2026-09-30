use async_graphql::{ComplexObject, SimpleObject, Union};
use chrono::{DateTime, FixedOffset, Utc};
use models::shared::enums::ReadingStatus;

use crate::object::{
	bookmark::Bookmark, media_annotation::MediaAnnotation,
	reading_session::ReadingSession,
};

// this is really tricky to get started because there are two flavors of timelines:
// 1. see progression events for a specific book (unpaginated by me, e.g. books/bookId/reading-timeline)
// 2. see progression events between time window for all books (paginated, by me, e.g. /reading-timeline)
// and then separately i imagine a world where eventually i want to reuse this for book club features,
// e.g. "show me all of the members' progression who have opted-in to sharing the currently-reading book"
// which also means i think i'll need to rely on reusable fns in models
//
// this to say very much a wip draft all of this

#[derive(Clone, Union)]
pub enum SessionEvent {
	Bookmark(Bookmark),
	Annotation(MediaAnnotation),
	// reviews, etc
	// TODO: could also have synthetic events if the explicit
	// grouping i drafted in BookReadingTimeline turns out stinky,
	// e.g. lke "readthrough started" but we'd have to compute that
	// from _first_/_last_ sessions relative to readthrough and that
	// feels like an annoying amount of work for potentially not much convenience
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

/// the timeline of events for a specific readthrough of a book
#[derive(Clone, SimpleObject)]
pub struct ReadthroughTimeline {
	pub readthrough_number: i32,
	pub started_at: DateTime<FixedOffset>,
	pub finished_at: Option<DateTime<FixedOffset>>,
	pub status: ReadingStatus,
	pub total_elapsed_seconds: i64,
	pub sessions: Vec<SessionWithEvents>,
}

#[derive(Clone, SimpleObject)]
pub struct BookReadingTimeline {
	pub readthroughs: Vec<ReadthroughTimeline>,
	pub total_elapsed_seconds: i64,
}

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

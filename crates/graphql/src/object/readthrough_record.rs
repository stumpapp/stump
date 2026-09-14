use async_graphql::SimpleObject;
use sea_orm::prelude::*;

// TODO: i kinda like and kinda hate this name... is FinishedReadingSession just a better name?
// UGH naming is hard
/// a completed readthrough of a book, aggregated across all sessions that
/// share the same `readthrough_number`
#[derive(Debug, Clone, SimpleObject)]
pub struct ReadthroughRecord {
	pub readthrough_number: i32,
	pub started_at: DateTimeWithTimeZone,
	pub completed_at: DateTimeWithTimeZone,
	pub elapsed_seconds: i64,
	pub dnf: bool,
}

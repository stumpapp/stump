use async_graphql::SimpleObject;
use models::shared::readium::ReadiumLocator;
use sea_orm::prelude::*;

/// the current reading position for a book, derived from the latest session
/// with the highest `readthrough_number`
#[derive(Debug, Clone, SimpleObject)]
pub struct ResumeReadingCursor {
	pub readthrough_number: i32,
	pub page: Option<i32>,
	pub locator: Option<ReadiumLocator>,
	pub percentage_completed: Option<Decimal>,
	pub epubcfi: Option<String>,
	/// total reading time across all sessions in the current readthrough
	pub elapsed_seconds: i64,
	/// when the very first session in the current readthrough started
	pub started_at: Option<DateTimeWithTimeZone>,
	// the last time the latest session in the current readthrough was updated
	pub updated_at: Option<DateTimeWithTimeZone>,
}

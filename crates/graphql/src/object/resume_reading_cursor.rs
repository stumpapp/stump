use async_graphql::SimpleObject;
use models::shared::readium::ReadiumLocator;
use sea_orm::prelude::*;

/// the current reading position for a book, derived from the latest session
/// with the highest `readthrough_number`
#[derive(Debug, Clone, SimpleObject)]
pub struct ResumeReadingCursor {
	pub readthrough_number: i32,
	pub end_page: Option<i32>,
	pub end_locator: Option<ReadiumLocator>,
	pub end_percentage: Option<Decimal>,
	pub epubcfi: Option<String>,
	/// total reading time across all sessions in the current readthrough
	pub total_elapsed_seconds: i64,
	pub updated_at: Option<DateTimeWithTimeZone>,
}

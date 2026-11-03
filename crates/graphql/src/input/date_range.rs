use async_graphql::{InputObject, SimpleObject};
use chrono::NaiveDate;

/// An input for specifying a date range:
/// - `start = null` means from the beginning of the user's history
/// - `end = null` resolves to the current logical day (per user prefs)
#[derive(Debug, Default, InputObject)]
pub struct DateRangeInput {
	pub start: Option<NaiveDate>,
	pub end: Option<NaiveDate>,
}

impl DateRangeInput {
	pub fn resolve(self, today: NaiveDate) -> ResolvedDateRange {
		ResolvedDateRange {
			start: self.start,
			end: self.end.unwrap_or(today),
		}
	}
}

/// A `DateRangeInput` where `end` is always set
#[derive(Debug, Clone, Copy, SimpleObject)]
pub struct ResolvedDateRange {
	pub start: Option<NaiveDate>,
	pub end: NaiveDate,
}
// ^ realistically this isn't needed, but for consistency in the
// end fallback i went this route

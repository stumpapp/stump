use async_graphql::{Context, Object, Result};
use models::services::reading_stats::{
	self, DailyActivity, ReadingTotals, SessionStats, TimeToFinishStat, WeekdayActivity,
};

use crate::{data::CoreContext, input::date_range::ResolvedDateRange};

/// A view into various aggregated reading statistics, for a specific
/// user and time range
///
/// Note: pretty much most things are computed in memory, so the caller will
/// load the sessions for the range and create this struct, which can then
/// be used for the various selections available here
pub struct ReadingStats {
	user_id: String,
	range: ResolvedDateRange,
	sessions: SessionStats,
}

impl ReadingStats {
	pub fn new(
		user_id: String,
		range: ResolvedDateRange,
		sessions: SessionStats,
	) -> Self {
		Self {
			user_id,
			range,
			sessions,
		}
	}
}

#[Object]
impl ReadingStats {
	async fn range(&self) -> ResolvedDateRange {
		self.range
	}

	async fn totals(&self) -> ReadingTotals {
		self.sessions.totals()
	}

	/// One entry per day with at least one session
	async fn daily_activity(&self) -> Vec<DailyActivity> {
		self.sessions.daily_activity()
	}

	// TODO: would be fun to have a "your preferred day / time of day" kinda stat too

	/// Average reading time for each weekday
	async fn day_of_week(&self) -> Vec<WeekdayActivity> {
		self.sessions.day_of_week()
	}

	/// Median active time and days to finish a book per library type
	async fn time_to_finish(&self, ctx: &Context<'_>) -> Result<Vec<TimeToFinishStat>> {
		let conn = ctx.data::<CoreContext>()?.conn.as_ref();
		Ok(reading_stats::time_to_finish(
			conn,
			&self.user_id,
			self.range.start,
			self.range.end,
		)
		.await?)
	}
}

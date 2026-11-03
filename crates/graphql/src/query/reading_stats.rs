use async_graphql::{Context, Object, Result};
use models::{
	domain::reading_progress::logical_today,
	services::reading_stats::{streaks_for_user, ReadingStreaks, SessionStats},
};

use crate::{
	data::{AuthContext, CoreContext},
	input::date_range::DateRangeInput,
	object::reading_stats::ReadingStats,
};

#[derive(Default)]
pub struct ReadingStatsQuery;

#[Object]
impl ReadingStatsQuery {
	/// Reading stats for the authenticated user within the provided range
	async fn my_reading_stats(
		&self,
		ctx: &Context<'_>,
		#[graphql(default)] range: DateRangeInput,
	) -> Result<ReadingStats> {
		let AuthContext { user, .. } = ctx.data::<AuthContext>()?;
		let conn = ctx.data::<CoreContext>()?.conn.as_ref();

		let range = range.resolve(logical_today(user));
		let sessions = SessionStats::load(conn, &user.id, range.start, range.end).await?;

		Ok(ReadingStats::new(user.id.clone(), range, sessions))
	}

	// TODO: this is very explicitly reading streaks, but i think it would be
	// very cool to allow things like custom goals, e.g.:
	// "made a journal entry X days in a row, towards your every day this year goal"
	// ^ that kinda thing, though that will be way further down the road since while
	// deeply related to stats a goals mechanism is an entire thing

	/// The current streaks held for the authenticated user
	async fn my_reading_streaks(&self, ctx: &Context<'_>) -> Result<ReadingStreaks> {
		let AuthContext { user, .. } = ctx.data::<AuthContext>()?;
		let conn = ctx.data::<CoreContext>()?.conn.as_ref();

		Ok(streaks_for_user(conn, user).await?)
	}
}

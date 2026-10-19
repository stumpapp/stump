// TODO(reading-stats): top genres

use std::collections::{BTreeMap, BTreeSet, HashMap, HashSet};

use async_graphql::SimpleObject;
use chrono::Datelike;
use sea_orm::strum::IntoEnumIterator;
use sea_orm::{prelude::*, FromQueryResult, QuerySelect, Statement};

use crate::{
	domain::reading_progress::logical_today,
	entity::{reading_session, user::AuthUser},
	shared::enums::{LibraryType, ReadingStatus},
};

/// A reading session row with just the columns needed for various aggregations
#[derive(Debug, FromQueryResult)]
struct SessionRow {
	media_id: String,
	readthrough_number: i32,
	session_date: Date,
	elapsed_seconds: Option<i64>,
	status: ReadingStatus,
}

/// The summed stats relative to the aggregation range
#[derive(Debug, SimpleObject)]
pub struct ReadingTotals {
	pub total_seconds: i64,
	pub session_count: i64,
	pub finished_count: i64,
	pub dnf_count: i64,
	pub active_day_count: i64,
}

/// The reading activity (time, number of unique sessions) for a specific date
#[derive(Debug, SimpleObject)]
pub struct DailyActivity {
	pub date: Date,
	pub total_seconds: i64,
	pub session_count: i64,
}

// TODO: i dislike the name, it kinda reads like it computes stats at load
// but really the computation is lazily done when requested
// - SessionRange ?

/// A user's sessions within a range
pub struct SessionStats {
	rows: Vec<SessionRow>,
	start: Option<Date>,
	end: Date,
}

impl SessionStats {
	pub async fn load(
		conn: &DatabaseConnection,
		user_id: &str,
		start: Option<Date>,
		end: Date,
	) -> Result<Self, DbErr> {
		Ok(Self {
			rows: load_sessions(conn, user_id, start, end).await?,
			start,
			end,
		})
	}

	pub fn totals(&self) -> ReadingTotals {
		let mut finished = HashSet::new();
		let mut dnfed = HashSet::new();
		let mut days = HashSet::new();
		let mut seconds = 0;

		for row in &self.rows {
			seconds += row.elapsed_seconds.unwrap_or(0);
			days.insert(row.session_date);
			if row.status == ReadingStatus::Finished {
				finished.insert((&row.media_id, row.readthrough_number));
			} else if row.status == ReadingStatus::Abandoned {
				dnfed.insert((&row.media_id, row.readthrough_number));
			}
		}

		ReadingTotals {
			total_seconds: seconds,
			session_count: self.rows.len() as i64,
			finished_count: finished.len() as i64,
			dnf_count: dnfed.len() as i64,
			active_day_count: days.len() as i64,
		}
	}

	pub fn daily_activity(&self) -> Vec<DailyActivity> {
		let mut by_date: BTreeMap<Date, (i64, i64)> = BTreeMap::new();

		for row in &self.rows {
			let entry = by_date.entry(row.session_date).or_default();
			entry.0 += row.elapsed_seconds.unwrap_or(0);
			entry.1 += 1;
		}

		by_date
			.into_iter()
			.map(|(date, (total_seconds, session_count))| DailyActivity {
				date,
				total_seconds,
				session_count,
			})
			.collect()
	}

	pub fn day_of_week(&self) -> Vec<WeekdayActivity> {
		let start = self.start.clone();
		let end = self.end.clone();
		let mut totals = [0; 7];

		for row in &self.rows {
			let index = row.session_date.weekday().num_days_from_monday() as usize;
			totals[index] += row.elapsed_seconds.unwrap_or(0).max(0);
		}

		let mut occurrences = [0; 7];
		if let Some(start) =
			start.or_else(|| self.rows.iter().map(|r| r.session_date).min())
		{
			for day in start.iter_days().take_while(|day| *day <= end) {
				occurrences[day.weekday().num_days_from_monday() as usize] += 1;
			}
		}

		(0..7)
			.map(|index| WeekdayActivity {
				iso_weekday: index as u32 + 1,
				total_seconds: totals[index],
				average_seconds: totals[index] / occurrences[index].max(1),
				// ^ max -> don't divide by 0
			})
			.collect()
	}
}

async fn load_sessions(
	conn: &DatabaseConnection,
	user_id: &str,
	start: Option<Date>,
	end: Date,
) -> Result<Vec<SessionRow>, DbErr> {
	let mut query = reading_session::Entity::find()
		.filter(reading_session::Column::UserId.eq(user_id))
		.filter(reading_session::Column::SessionDate.lte(end));

	if let Some(start) = start {
		query = query.filter(reading_session::Column::SessionDate.gte(start));
	}

	query
		.select_only()
		.columns([
			reading_session::Column::MediaId,
			reading_session::Column::ReadthroughNumber,
			reading_session::Column::SessionDate,
			reading_session::Column::ElapsedSeconds,
			reading_session::Column::Status,
		])
		.into_model::<SessionRow>()
		.all(conn)
		.await
}

#[derive(Debug, Clone, SimpleObject)]
pub struct WeekdayActivity {
	/// 1 (Monday) -> 7 (Sunday)
	pub iso_weekday: u32,
	pub total_seconds: i64,
	/// Total seconds divided by the number of times this weekday occurs in the range
	pub average_seconds: i64,
}

// TODO: prob support a user preference for this
/// The min total reading time in secs for a day to count towards a streak
const STREAK_DAY_MIN_SECS: i64 = 60;

// TODO: prob support a user preference for this
/// The min total reading time in secs for a finished readthrough to count towards
/// time-to-finish stats, so things like a mark as completed action are excluded
/// unless you add your reading data manually
const READTHROUGH_MIN_SECS: i64 = 60;

#[derive(Debug, SimpleObject)]
pub struct ReadingStreaks {
	pub current_days: i64,
	pub longest_days: i64,
}

// TODO: worth storing longest? and upserting as current passes it? i guess
// depends on if there is ever a badge/achievement kinda thing for it?

pub async fn streaks_for_user(
	conn: &DatabaseConnection,
	user: &AuthUser,
) -> Result<ReadingStreaks, DbErr> {
	let today = logical_today(user);

	let session_stats = SessionStats::load(conn, &user.id, None, today).await?;

	let days = session_stats
		.daily_activity()
		.into_iter()
		.filter(|day| day.total_seconds >= STREAK_DAY_MIN_SECS)
		.map(|day| day.date)
		.collect::<BTreeSet<_>>();

	let mut longest = 0;
	let mut run = 0;
	let mut previous: Option<Date> = None;

	for &day in &days {
		run = match previous {
			Some(prev) if prev.succ_opt() == Some(day) => run + 1,
			// ^ if previous' tomorrow is today, then we incr
			_ => 1,
		};
		longest = longest.max(run);
		previous = Some(day);
	}

	let anchor = if days.contains(&today) {
		Some(today)
	} else {
		today
			.pred_opt()
			.filter(|yesterday| days.contains(yesterday))
	};
	// ^ we start from either today or yesterday (okay if haven't read yet today, the
	// streak only breaks if day between)

	let mut current = 0;
	let mut cursor = anchor;
	while let Some(day) = cursor.filter(|day| days.contains(day)) {
		current += 1;
		cursor = day.pred_opt();
	}
	// ^ we keep going backwards until the list doesn't contain the date

	Ok(ReadingStreaks {
		current_days: current,
		longest_days: longest,
	})
}

#[derive(Debug, FromQueryResult)]
struct FinishedReadthrough {
	library_type: LibraryType,
	pages: i32,
	first_date: Date,
	last_date: Date,
	active_seconds: i64,
}

/// Median active time and calendar days to finish a book, per library type
pub async fn time_to_finish(
	conn: &DatabaseConnection,
	user_id: &str,
	start: Option<Date>,
	end: Date,
) -> Result<Vec<TimeToFinishStat>, DbErr> {
	let finished_readthroughs =
		load_finished_readthroughs(conn, user_id, start, end).await?;
	Ok(TimeToFinishStat::vec_from(finished_readthroughs))
}

async fn load_finished_readthroughs(
	conn: &DatabaseConnection,
	user_id: &str,
	start: Option<Date>,
	end: Date,
) -> Result<Vec<FinishedReadthrough>, DbErr> {
	// the range filters the date the readthrough was finished, but first_date
	// is from all its sessions as to not be truncated
	let sql = r#"
		SELECT
			lc.library_type,
			m.pages,
			MIN(rs.session_date) AS first_date,
			MAX(CASE WHEN rs.status = 'FINISHED' THEN rs.session_date END) AS last_date,
			COALESCE(SUM(rs.elapsed_seconds), 0) AS active_seconds
		FROM reading_sessions rs
		INNER JOIN media m ON m.id = rs.media_id
		INNER JOIN series s ON s.id = m.series_id
		INNER JOIN libraries l ON l.id = s.library_id
		INNER JOIN library_configs lc ON lc.id = l.config_id
		WHERE rs.user_id = $1
		GROUP BY rs.media_id, rs.readthrough_number, lc.library_type, m.pages
		HAVING MAX(CASE WHEN rs.status = 'FINISHED' THEN rs.session_date END) IS NOT NULL
			AND ($2 IS NULL OR MAX(CASE WHEN rs.status = 'FINISHED' THEN rs.session_date END) >= $2)
			AND MAX(CASE WHEN rs.status = 'FINISHED' THEN rs.session_date END) <= $3
	"#;

	let statement = Statement::from_sql_and_values(
		conn.get_database_backend(),
		sql,
		[user_id.into(), start.into(), end.into()],
	);

	let query_result = conn.query_all_raw(statement).await?;

	query_result
		.iter()
		.map(|res| FinishedReadthrough::from_query_result(res, ""))
		.collect()
}

#[derive(Debug, SimpleObject)]
pub struct TimeToFinishStat {
	pub library_type: LibraryType,
	pub sample_size: i64,
	pub median_active_seconds: i64,
	pub median_calendar_days: f64,
	pub median_seconds_per_page: Option<f64>,
}

impl TimeToFinishStat {
	fn vec_from(data: Vec<FinishedReadthrough>) -> Vec<TimeToFinishStat> {
		let mut by_type: HashMap<LibraryType, Vec<FinishedReadthrough>> = HashMap::new();

		for rt in data {
			if rt.active_seconds >= READTHROUGH_MIN_SECS {
				by_type.entry(rt.library_type).or_default().push(rt);
			}
		}

		LibraryType::iter()
			.filter_map(|library_type| {
				let readthroughs = by_type.remove(&library_type)?;

				let mut active_seconds = readthroughs
					.iter()
					.map(|s| s.active_seconds as f64)
					.collect::<Vec<_>>();
				active_seconds.sort_by(|a, b| a.total_cmp(b));

				let mut calendar_days = readthroughs
					.iter()
					.map(|s| (s.last_date - s.first_date).num_days() as f64)
					.collect::<Vec<_>>();
				calendar_days.sort_by(|a, b| a.total_cmp(b));

				let mut seconds_per_page = readthroughs
					.iter()
					.filter_map(|s| {
						(s.pages > 0).then(|| s.active_seconds as f64 / s.pages as f64)
					})
					.collect::<Vec<_>>();
				seconds_per_page.sort_by(|a, b| a.total_cmp(b));

				Some(TimeToFinishStat {
					library_type,
					sample_size: readthroughs.len() as i64,
					median_active_seconds: median(&active_seconds).round() as i64,
					median_calendar_days: median(&calendar_days),
					median_seconds_per_page: (!seconds_per_page.is_empty())
						.then(|| median(&seconds_per_page)),
				})
			})
			.collect()
	}
}

// it has been so long since i have had to think about medians and that makes me happy
// i just followed https://en.wikipedia.org/wiki/Median

fn median(sorted: &[f64]) -> f64 {
	let mid = sorted.len() / 2;
	if sorted.len() % 2 == 1 {
		sorted[mid] // exactly middle so take it
	} else {
		(sorted[mid - 1] + sorted[mid]) / 2.0
	}
}

// TODO(chore): write tests before release

#[cfg(test)]
mod tests {
	use chrono::{Days, Utc};

	use super::*;

	fn row(
		date: Date,
		media_id: &str,
		readthrough: i32,
		elapsed_seconds: i64,
		status: ReadingStatus,
	) -> SessionRow {
		SessionRow {
			media_id: media_id.to_string(),
			readthrough_number: readthrough,
			session_date: date,
			elapsed_seconds: Some(elapsed_seconds),
			status,
		}
	}

	fn stats(rows: Vec<SessionRow>) -> SessionStats {
		let start = rows
			.iter()
			.min_by_key(|row| row.session_date)
			.map(|row| row.session_date.clone());
		let end = rows
			.iter()
			.max_by_key(|row| row.session_date)
			.clone()
			.map(|row| row.session_date)
			.unwrap_or_else(|| Utc::now().date_naive());
		SessionStats { rows, start, end }
	}

	fn days_before_today(days: u64) -> Date {
		let date = Utc::now().date_naive();
		let adjusted = date
			.checked_sub_days(Days::new(days))
			.expect("should have subtracted fine");
		adjusted
	}

	fn today() -> Date {
		Utc::now().date_naive()
	}

	#[test]
	fn test_session_stats_totals() {
		let rows = vec![
			// rt 1
			row(days_before_today(3), "m1", 1, 600, ReadingStatus::Reading),
			row(days_before_today(3), "m1", 1, 400, ReadingStatus::Finished),
			// rt 2
			row(days_before_today(2), "m1", 2, 400, ReadingStatus::Reading),
			row(days_before_today(2), "m1", 2, 600, ReadingStatus::Reading),
			row(days_before_today(1), "m1", 2, 1000, ReadingStatus::Finished),
			// rt 3 dnf
			row(today(), "m1", 2, 400, ReadingStatus::Reading),
			row(today(), "m1", 2, 600, ReadingStatus::Abandoned),
		];

		let totals = stats(rows).totals();

		assert_eq!(totals.total_seconds, 4000);
		assert_eq!(totals.session_count, 7);
		assert_eq!(totals.finished_count, 2);
		assert_eq!(totals.dnf_count, 1);
		assert_eq!(totals.active_day_count, 4);
	}

	#[test]
	fn test_daily_activity_groups_and_sums_by_date() {
		let rows = vec![
			row(days_before_today(3), "m1", 1, 300, ReadingStatus::Reading),
			row(days_before_today(2), "m2", 1, 100, ReadingStatus::Reading),
			row(days_before_today(3), "m3", 1, 200, ReadingStatus::Reading),
		];

		let activity = stats(rows).daily_activity();
		assert_eq!(activity.len(), 2);

		let three_days_ago = activity
			.iter()
			.find(|d| d.date == days_before_today(3))
			.expect("should have 3 days ago in here");
		assert_eq!(three_days_ago.total_seconds, 500);
		assert_eq!(three_days_ago.session_count, 2);

		let two_days_ago = activity
			.iter()
			.find(|d| d.date == days_before_today(2))
			.expect("should have 2 days ago in here");
		assert_eq!(two_days_ago.total_seconds, 100);
		assert_eq!(two_days_ago.session_count, 1);
	}

	/// oct 19 2026 is monday
	fn anchor_date() -> Date {
		Date::parse_from_str("2026-10-19", "%Y-%m-%d").unwrap()
	}

	fn days_before_anchor(days: u64) -> Date {
		let date = anchor_date();
		let adjusted = date
			.checked_sub_days(Days::new(days))
			.expect("should have subtracted fine");
		adjusted
	}

	#[test]
	fn test_day_of_week_averages_over_weekdays() {
		let rows = vec![
			// mondays
			row(days_before_anchor(7), "m1", 1, 600, ReadingStatus::Reading),
			row(days_before_anchor(7), "m2", 1, 200, ReadingStatus::Reading),
			row(anchor_date(), "m1", 1, 200, ReadingStatus::Reading),
			// tuesday
			row(days_before_anchor(6), "m1", 1, 400, ReadingStatus::Reading),
			// friday
			row(days_before_anchor(3), "m2", 1, 200, ReadingStatus::Reading),
		];

		let weekdays = stats(rows).day_of_week();

		assert_eq!(weekdays.len(), 7); // always 7, sanity check

		let monday = weekdays[0].clone();
		assert_eq!(monday.iso_weekday, 1);
		assert_eq!(monday.total_seconds, 1000);
		assert_eq!(monday.average_seconds, 1000 / 2);

		let tuesday = weekdays[1].clone();
		assert_eq!(tuesday.iso_weekday, 2);
		assert_eq!(tuesday.total_seconds, 400);
		assert_eq!(tuesday.average_seconds, 400 / 1);

		let friday = weekdays[4].clone();
		assert_eq!(friday.iso_weekday, 5);
		assert_eq!(friday.total_seconds, 200);
		assert_eq!(friday.average_seconds, 200 / 1);
	}

	// #[tokio::test]
	// async fn test_streaks_properly_counts_runs() {
	// 	// TODO: no time now, but either use fake_data OR move the logical parts to a separate
	// 	// fn and just test that
	// }

	// TODO: TimeToFinishStat tests
}

use chrono::Utc;
use sea_orm::{
	prelude::Decimal, sea_query::Expr, ActiveModelTrait, ActiveValue::Set, ColumnTrait,
	ConnectionTrait, EntityTrait, IntoActiveModel, QueryFilter, QueryOrder, QuerySelect,
};

use crate::{
	domain::reading_progress::{calculate_logical_date, should_extend_session},
	entity::{media, reading_session, user::AuthUser},
	shared::{enums::ReadingStatus, readium::ReadiumLocator},
};

/// normalized porgression info derived from a [`MediaProgressInput`]
#[derive(Debug, Default)]
pub struct NormalizedProgression {
	pub page: Option<i32>,
	pub locator: Option<ReadiumLocator>,
	pub percentage: Option<Decimal>,
	pub elapsed_seconds_delta: Option<i64>,
	pub did_complete: bool,
	pub device_id: Option<String>,
	pub reset_elapsed_seconds: bool,
}

impl NormalizedProgression {
	fn apply(&self, session: reading_session::Model) -> reading_session::ActiveModel {
		let new_elapsed = session.elapsed_seconds.unwrap_or(0)
			+ self.elapsed_seconds_delta.unwrap_or(0).max(0);

		let preserved_end_page = session.end_page;
		let preserved_end_locator = session.end_locator.clone();
		let preserved_end_percentage = session.end_percentage;

		let mut active = session.into_active_model();

		active.end_locator = Set(self.locator.clone().or(preserved_end_locator));

		active.end_page = match self.page {
			Some(page) => Set(Some(page)),
			None => Set(preserved_end_page),
		};
		active.end_percentage = match self.percentage {
			Some(percentage) => Set(Some(percentage)),
			None => Set(preserved_end_percentage),
		};
		if self.did_complete {
			active.status = Set(ReadingStatus::Finished);
		} else {
			active.status = Set(ReadingStatus::Reading);
		}
		active.elapsed_seconds = Set(Some(new_elapsed));
		if let Some(incoming) = &self.device_id {
			let current = match &active.device_ids {
				sea_orm::ActiveValue::Set(v) | sea_orm::ActiveValue::Unchanged(v) => {
					v.as_ref()
				},
				sea_orm::ActiveValue::NotSet => None,
			};
			let mut ids = current
				.map(|reading_session::DeviceIds(v)| v.clone())
				.unwrap_or_default();
			if !ids.contains(incoming) {
				ids.push(incoming.clone());
				active.device_ids = Set(Some(reading_session::DeviceIds(ids)));
			}
		}
		active
	}
}

/// creates a [`reading_session`] record or extends the most recent one if it falls within
/// the same logical day and the grace period has not elapsed
pub async fn upsert_reading_session(
	txn: &impl ConnectionTrait,
	user: &AuthUser,
	media_id: &str,
	input: NormalizedProgression,
) -> Result<reading_session::Model, sea_orm::DbErr> {
	let (grace_period, day_reset_offset) = user
		.preferences
		.as_ref()
		.map(|p| (p.reading_session_grace_period_secs, p.day_reset_hour_offset))
		.unwrap_or((1800, 0));

	let logical_today = calculate_logical_date(Utc::now(), day_reset_offset);

	// important to reset _before_ fetching latest so the find below makes the
	// elapsed delta apply against a clean slate (i.e., 0)
	if input.reset_elapsed_seconds {
		reset_cumulative_elapsed_seconds(txn, &user.id, media_id).await?;
	}

	let latest = reading_session::Entity::find_latest_for_user_and_media(user, media_id)
		.one(txn)
		.await?;

	match latest {
		// so long as the status is no dnf, progression within grace period will extend the existing session.
		// this might re-open the session if it was previously marked as finished
		Some(session)
			if session.session_date == logical_today
				&& should_extend_session(&session, grace_period) =>
		{
			let active = input.apply(session);
			active.update(txn).await
		},
		_ => {
			let readthrough_number =
				derive_readthrough_number(txn, &user.id, media_id).await?;

			reading_session::ActiveModel {
				session_date: Set(logical_today),
				start_page: Set(input.page),
				end_page: Set(input.page),
				start_locator: Set(input.locator.clone()),
				end_locator: Set(input.locator),
				start_percentage: Set(input.percentage.or(Some(Decimal::new(0, 2)))),
				end_percentage: Set(input.percentage),
				// set bc there's no existing session to extend
				elapsed_seconds: Set(Some(
					input.elapsed_seconds_delta.unwrap_or(0).max(0),
				)),
				readthrough_number: Set(readthrough_number),
				status: Set(if input.did_complete {
					ReadingStatus::Finished
				} else {
					ReadingStatus::Reading
				}),
				device_ids: Set(input
					.device_id
					.map(|id| reading_session::DeviceIds(vec![id]))),
				media_id: Set(media_id.to_string()),
				user_id: Set(user.id.clone()),
				..Default::default()
			}
			.insert(txn)
			.await
		},
	}
}

/// derives the readthrough number to assign to a new session for a given user+media pair
pub async fn derive_readthrough_number(
	db: &impl ConnectionTrait,
	user_id: &str,
	media_id: &str,
) -> Result<i32, sea_orm::DbErr> {
	let latest = reading_session::Entity::find()
		.filter(reading_session::Column::UserId.eq(user_id))
		.filter(reading_session::Column::MediaId.eq(media_id))
		.order_by_desc(reading_session::Column::CreatedAt)
		.one(db)
		.await?;

	Ok(match latest {
		// no existing session = first read
		None => 1,
		// existing session that was completed/dnf = increment readthrough number, new readthrough
		Some(session) if session.is_finalized() => session.readthrough_number + 1,
		Some(session) => session.readthrough_number,
	})
}

/// get the number of pages in a book
pub async fn get_book_pages(
	book_id: String,
	conn: &impl ConnectionTrait,
) -> Result<i32, sea_orm::DbErr> {
	let pages: i32 = media::Entity::find_by_id(book_id.clone())
		.select_only()
		.column(media::Column::Pages)
		.into_tuple()
		.one(conn)
		.await?
		.ok_or_else(|| {
			sea_orm::DbErr::RecordNotFound(format!("Media with id {} not found", book_id))
		})?;
	Ok(pages)
}

#[tracing::instrument(skip(tx))]
pub async fn reset_cumulative_elapsed_seconds(
	tx: &impl ConnectionTrait,
	user_id: &str,
	media_id: &str,
) -> Result<bool, sea_orm::DbErr> {
	let current_session = reading_session::Entity::find()
		.filter(
			reading_session::Column::UserId
				.eq(user_id)
				.and(reading_session::Column::MediaId.eq(media_id)),
		)
		.order_by_desc(reading_session::Column::CreatedAt)
		.one(tx)
		.await?;

	let Some(session) = current_session else {
		// no active session = no work to do
		return Ok(false);
	};

	let affected_rows = reading_session::Entity::update_many()
		.col_expr(reading_session::Column::ElapsedSeconds, Expr::value(0))
		.filter(
			reading_session::Column::UserId
				.eq(user_id)
				.and(reading_session::Column::MediaId.eq(media_id)),
		)
		.filter(reading_session::Column::ReadthroughNumber.eq(session.readthrough_number))
		.exec(tx)
		.await?
		.rows_affected;

	tracing::debug!(
		?affected_rows,
		readthrough_number = session.readthrough_number,
		"Reset elapsed seconds in all reading sessions of the book's current readthrough"
	);

	Ok(affected_rows > 0)
}

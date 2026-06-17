use chrono::Utc;
use sea_orm::{
	prelude::*, sea_query::Func, ActiveValue::Set, ColumnTrait, EntityTrait,
	IntoActiveModel, JoinType, QueryFilter, QuerySelect,
};

use crate::{
	entity::{media, reading_session, user_series_state},
	shared::enums::ReadingStatus,
};

pub async fn get(
	db: &impl ConnectionTrait,
	user_id: &str,
	series_id: &str,
) -> Result<Option<user_series_state::Model>, DbErr> {
	user_series_state::Entity::find()
		.filter(user_series_state::Column::UserId.eq(user_id))
		.filter(user_series_state::Column::SeriesId.eq(series_id))
		.one(db)
		.await
}

/// return the existing series state for a given user+series pair, or create one if
/// none exist
async fn get_or_create(
	db: &impl ConnectionTrait,
	user_id: &str,
	series_id: &str,
) -> Result<user_series_state::Model, DbErr> {
	if let Some(existing) = get(db, user_id, series_id).await? {
		return Ok(existing);
	}

	user_series_state::ActiveModel {
		user_id: Set(user_id.to_string()),
		series_id: Set(series_id.to_string()),
		..Default::default()
	}
	.insert(db)
	.await
}

/// marks a series as dropped
pub async fn drop_series(
	db: &impl ConnectionTrait,
	user_id: &str,
	series_id: &str,
) -> Result<user_series_state::Model, DbErr> {
	let existing = get_or_create(db, user_id, series_id).await?;
	let mut active = existing.into_active_model();
	active.dropped_at = Set(Some(DateTimeWithTimeZone::from(Utc::now())));
	active.update(db).await
}

/// unmarks a series as dropped
pub async fn undrop_series(
	db: &impl ConnectionTrait,
	user_id: &str,
	series_id: &str,
) -> Result<user_series_state::Model, DbErr> {
	let existing = get_or_create(db, user_id, series_id).await?;
	let mut active = existing.into_active_model();
	active.dropped_at = Set(None);
	active.update(db).await
}

/// set the intent to stop a re-read, which will cause on deck to stop showing books in the current
/// readthrough and instead only show unread books beyond the highest position ever reached.
///
/// the stop timestamp is set to the actual last-read date so any book finished after this
/// point will advance last_read_date past the stop timestamp and autoresumt
pub async fn stop_series_reread(
	db: &impl ConnectionTrait,
	user_id: &str,
	series_id: &str,
) -> Result<user_series_state::Model, DbErr> {
	let stop_at: Option<DateTimeWithTimeZone> = reading_session::Entity::find()
		.select_only()
		.expr(Func::max(
			Expr::col((reading_session::Entity, reading_session::Column::UpdatedAt))
				.if_null(Expr::col((
					reading_session::Entity,
					reading_session::Column::CreatedAt,
				))),
		))
		.join(
			JoinType::InnerJoin,
			reading_session::Entity::belongs_to(media::Entity)
				.from(reading_session::Column::MediaId)
				.to(media::Column::Id)
				.into(),
		)
		.filter(reading_session::Column::UserId.eq(user_id))
		.filter(reading_session::Column::Status.eq(ReadingStatus::Finished))
		.filter(media::Column::SeriesId.eq(series_id))
		.into_tuple()
		.one(db)
		.await?;

	let stop_at = stop_at.unwrap_or_else(|| DateTimeWithTimeZone::from(Utc::now()));

	let existing = get_or_create(db, user_id, series_id).await?;
	let mut active = existing.into_active_model();
	active.stopped_readthrough_at = Set(Some(stop_at));
	active.update(db).await
}

/// clears the stopped re-read so on deck resumes showing the next book
/// in the whatever the current readthrough is
pub async fn resume_series_reread(
	db: &impl ConnectionTrait,
	user_id: &str,
	series_id: &str,
) -> Result<user_series_state::Model, DbErr> {
	let existing = get_or_create(db, user_id, series_id).await?;
	let mut active = existing.into_active_model();
	active.stopped_readthrough_at = Set(None);
	active.update(db).await
}

// TODO: add tests, spent so much time adding gql tests that fuck if i am doing that now

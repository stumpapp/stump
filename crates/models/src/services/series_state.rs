use chrono::Utc;
use sea_orm::{
	prelude::*, ActiveValue::Set, ColumnTrait, EntityTrait, IntoActiveModel, QueryFilter,
	QueryOrder, QuerySelect,
};

use crate::entity::{reading_session, user_series_state};

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

// TODO: this is semantically really confusing but the best i could land on for now

/// set the intent to stop a re-read, which will cause on deck to stop showing books in the current
/// readthrough and instead only show unread books
pub async fn stop_series_reread(
	db: &impl ConnectionTrait,
	user_id: &str,
	series_id: &str,
) -> Result<user_series_state::Model, DbErr> {
	let max_readthrough: Option<i32> = reading_session::Entity::find()
		.filter(reading_session::Column::UserId.eq(user_id))
		.filter(
			reading_session::Column::MediaId.in_subquery(
				sea_orm::sea_query::Query::select()
					.column(crate::entity::media::Column::Id)
					.from(crate::entity::media::Entity)
					.and_where(crate::entity::media::Column::SeriesId.eq(series_id))
					.to_owned(),
			),
		)
		.order_by_desc(reading_session::Column::ReadthroughNumber)
		.select_only()
		.column(reading_session::Column::ReadthroughNumber)
		.into_tuple()
		.one(db)
		.await?;

	let existing = get_or_create(db, user_id, series_id).await?;
	let mut active = existing.into_active_model();
	active.stopped_readthrough = Set(max_readthrough);
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
	active.stopped_readthrough = Set(None);
	active.update(db).await
}

// TODO: add tests, spent so much time adding gql tests that fuck if i am doing that now

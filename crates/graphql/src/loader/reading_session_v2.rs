use async_graphql::dataloader::Loader;
use itertools::Itertools;
use models::{entity::reading_session, shared::enums::ReadingStatus};
use sea_orm::{prelude::*, DatabaseConnection, QueryOrder};
use std::{cmp::Reverse, collections::HashMap, sync::Arc};

use crate::object::{
	readthrough_record::ReadthroughRecord, resume_reading_cursor::ResumeReadingCursor,
};

pub struct ReadingSessionV2Loader {
	pub conn: Arc<DatabaseConnection>,
}

impl ReadingSessionV2Loader {
	pub fn new(conn: Arc<DatabaseConnection>) -> Self {
		Self { conn }
	}
}

#[derive(Clone, PartialEq, Eq, Hash)]
pub struct ResumeReadingCursorLoaderKey {
	pub user_id: String,
	pub media_id: String,
}

impl Loader<ResumeReadingCursorLoaderKey> for ReadingSessionV2Loader {
	type Value = ResumeReadingCursor;
	type Error = Arc<sea_orm::error::DbErr>;

	async fn load(
		&self,
		keys: &[ResumeReadingCursorLoaderKey],
	) -> Result<HashMap<ResumeReadingCursorLoaderKey, Self::Value>, Self::Error> {
		if keys.is_empty() {
			return Ok(HashMap::new());
		}

		let media_ids: Vec<String> = keys.iter().map(|k| k.media_id.clone()).collect();
		let user_ids: Vec<String> = keys.iter().map(|k| k.user_id.clone()).collect();

		let sessions = reading_session::Entity::find()
			.filter(reading_session::Column::UserId.is_in(user_ids))
			.filter(reading_session::Column::MediaId.is_in(media_ids))
			.order_by_desc(reading_session::Column::CreatedAt)
			.all(self.conn.as_ref())
			.await?;

		let mut elapsed_by_readthrough: HashMap<(String, String, i32), i64> =
			HashMap::new();

		for s in &sessions {
			*elapsed_by_readthrough
				.entry((s.user_id.clone(), s.media_id.clone(), s.readthrough_number))
				.or_insert(0) += s.elapsed_seconds.unwrap_or(0);
		}

		let mut result = HashMap::new();
		for key in keys {
			if result.contains_key(key) {
				continue;
			}

			// sessions are already ordered newest so the first match should be the one
			let latest = sessions
				.iter()
				.find(|s| s.user_id == key.user_id && s.media_id == key.media_id);

			match latest {
				Some(s) if !s.is_finalized() => {
					let total_elapsed = elapsed_by_readthrough
						.get(&(
							s.user_id.clone(),
							s.media_id.clone(),
							s.readthrough_number,
						))
						.copied()
						.unwrap_or(0);

					result.insert(
						key.clone(),
						ResumeReadingCursor {
							readthrough_number: s.readthrough_number,
							end_page: s.end_page,
							end_locator: s.end_locator.clone(),
							end_percentage: s.end_percentage,
							epubcfi: s.epubcfi.clone(),
							total_elapsed_seconds: total_elapsed,
							updated_at: s.updated_at,
						},
					);
				},
				_ => {
					// if the latest session is a completion/dnf, we want to return None for the cursor
					// so that the client doesn't try to resume a completed readthrough
					continue;
				},
			}
		}

		Ok(result)
	}
}

#[derive(Clone, PartialEq, Eq, Hash)]
pub struct ReadthroughRecordLoaderKey {
	pub user_id: String,
	pub media_id: String,
}

impl Loader<ReadthroughRecordLoaderKey> for ReadingSessionV2Loader {
	type Value = Vec<ReadthroughRecord>;
	type Error = Arc<sea_orm::error::DbErr>;

	async fn load(
		&self,
		keys: &[ReadthroughRecordLoaderKey],
	) -> Result<HashMap<ReadthroughRecordLoaderKey, Self::Value>, Self::Error> {
		if keys.is_empty() {
			return Ok(HashMap::new());
		}

		let media_ids: Vec<String> = keys.iter().map(|k| k.media_id.clone()).collect();
		let user_ids: Vec<String> = keys.iter().map(|k| k.user_id.clone()).collect();

		// ordered asc so sessions.first() is the earliest in each readthrough
		let sessions = reading_session::Entity::find()
			.filter(reading_session::Column::UserId.is_in(user_ids))
			.filter(reading_session::Column::MediaId.is_in(media_ids))
			.order_by_asc(reading_session::Column::CreatedAt)
			.all(self.conn.as_ref())
			.await?;

		// group sessions by (user_id, media_id, readthrough_number)
		let mut groups: HashMap<(String, String, i32), Vec<reading_session::Model>> =
			HashMap::new();
		for s in sessions {
			groups
				.entry((s.user_id.clone(), s.media_id.clone(), s.readthrough_number))
				.or_default()
				.push(s);
		}

		let mut result = HashMap::new();
		for key in keys {
			if result.contains_key(key) {
				continue;
			}

			let records: Vec<ReadthroughRecord> = groups
				.iter()
				.filter(|((uid, mid, _), _)| uid == &key.user_id && mid == &key.media_id)
				.filter_map(|(_, group)| {
					let completing = group.iter().find(|s| s.is_finalized())?;
					let first = group.first()?;
					let total_elapsed =
						group.iter().map(|s| s.elapsed_seconds.unwrap_or(0)).sum();
					Some(ReadthroughRecord {
						readthrough_number: completing.readthrough_number,
						started_at: first.created_at,
						completed_at: completing
							.updated_at
							.unwrap_or(completing.created_at),
						total_elapsed_seconds: total_elapsed,
						dnf: completing.status == ReadingStatus::Abandoned,
					})
				})
				.sorted_unstable_by_key(|r| Reverse(r.readthrough_number))
				.collect();

			if !records.is_empty() {
				result.insert(key.clone(), records);
			}
		}

		Ok(result)
	}
}

use std::collections::{HashMap, HashSet};

use chrono::Utc;
use futures_util::{stream, StreamExt};
use models::entity::{
	kobo_sync_media, kobo_sync_session,
	media::{self},
	reading_progress_reset, reading_session,
	user::AuthUser,
};
use sea_orm::Set;

use sea_orm::prelude::*;
use sea_orm::query::*;

use crate::routers::kobo::kepub;
use crate::routers::kobo::sync_token::SyncState;
use stump_core::{
	config::StumpConfig,
	kobo::{entity::MediaWithMetadataAndReadingSessions, sync_types::*},
};

const KEPUB_PREPARE_CONCURRENCY: usize = 4;

pub struct KoboSync {
	model: kobo_sync_session::Model,
}

impl KoboSync {
	async fn find<T: Into<String>>(
		db: &DatabaseConnection,
		user: &AuthUser,
		id: T,
	) -> Option<Self> {
		kobo_sync_session::Entity::find_by_id(id)
			.one(db)
			.await
			.ok()?
			.and_then(|m| {
				if m.user_id != user.id {
					tracing::warn!(
						authed_user = user.id,
						token_user = m.user_id,
						"Attempted to use another user's Kobo sync token"
					);
					None
				} else {
					Some(KoboSync { model: m })
				}
			})
	}

	/// Delete Kobo sync sessions that are no longer relevant.
	/// These database rows can be relatively large, and they're not very useful once the
	/// session has been completed.
	async fn prune_sync_sessions(
		db: &DatabaseConnection,
		user: &AuthUser,
		device_id: Option<&str>,
		keep_sessions: &[String],
	) {
		let Some(device_id) = device_id else {
			return;
		};

		let res = kobo_sync_session::Entity::delete_many()
			.filter(kobo_sync_session::Column::UserId.eq(user.id.clone()))
			.filter(kobo_sync_session::Column::DeviceId.eq(device_id))
			.filter(kobo_sync_session::Column::Id.is_not_in(keep_sessions))
			.exec(db)
			.await;

		match res {
			Ok(res) => {
				if res.rows_affected != 0 {
					tracing::debug!(
						rows_affected = res.rows_affected,
						"Pruned Kobo sync sessions"
					);
				}
			},
			Err(e) => {
				tracing::error!(?e, "Failed to prune Kobo sync sessions");
			},
		}
	}

	async fn begin_new_sync(
		db: &DatabaseConnection,
		user: &AuthUser,
		device_id: Option<&str>,
		device_metadata: serde_json::Value,
		previous_sync_at: Option<DateTimeWithTimeZone>,
	) -> Result<Self, sea_orm::DbErr> {
		// This cursor must precede every query below so a concurrent write is either
		// included now or remains visible to the next incremental sync.
		let sync_started_at: DateTimeWithTimeZone = Utc::now().into();
		let visible_epubs = || {
			media::Entity::find_for_user(user)
				.filter(media::Entity::epub_filter())
				.filter(media::Column::DeletedAt.is_null())
		};

		let media_ids = if let Some(previous_sync_at) = previous_sync_at {
			let mut changed_ids: HashSet<String> = visible_epubs()
				.filter(
					Condition::any()
						.add(media::Column::CreatedAt.gte(previous_sync_at))
						.add(media::Column::ModifiedAt.gte(previous_sync_at)),
				)
				.select_only()
				.column(media::Column::Id)
				.into_tuple()
				.all(db)
				.await?
				.into_iter()
				.collect();

			changed_ids.extend(
				kobo_sync_media::Entity::find()
					.filter(kobo_sync_media::Column::UserId.eq(&user.id))
					.filter(kobo_sync_media::Column::UpdatedAt.gte(previous_sync_at))
					.select_only()
					.column(kobo_sync_media::Column::MediaId)
					.into_tuple::<String>()
					.all(db)
					.await?,
			);

			changed_ids.extend(
				reading_session::Entity::find()
					.filter(reading_session::Column::UserId.eq(&user.id))
					.filter(
						Condition::any()
							.add(reading_session::Column::CreatedAt.gte(previous_sync_at))
							.add(
								reading_session::Column::UpdatedAt.gte(previous_sync_at),
							),
					)
					.select_only()
					.column(reading_session::Column::MediaId)
					.into_tuple::<String>()
					.all(db)
					.await?,
			);

			changed_ids.extend(
				reading_progress_reset::Entity::find()
					.filter(reading_progress_reset::Column::UserId.eq(&user.id))
					.filter(reading_progress_reset::Column::ResetAt.gte(previous_sync_at))
					.select_only()
					.column(reading_progress_reset::Column::MediaId)
					.into_tuple::<String>()
					.all(db)
					.await?,
			);

			if changed_ids.is_empty() {
				vec![]
			} else {
				visible_epubs()
					.filter(media::Column::Id.is_in(changed_ids))
					.order_by_asc(media::Column::Id)
					.select_only()
					.column(media::Column::Id)
					.into_tuple()
					.all(db)
					.await?
			}
		} else {
			visible_epubs()
				.order_by_asc(media::Column::Id)
				.select_only()
				.column(media::Column::Id)
				.into_tuple()
				.all(db)
				.await?
		};

		let sync_session = kobo_sync_session::ActiveModel {
			user_id: Set(user.id.clone()),
			media_ids: Set(kobo_sync_session::MediaIds(media_ids)),
			device_id: Set(device_id.unwrap_or("").to_string()),
			device_metadata: Set(device_metadata),
			previous_sync_at: Set(previous_sync_at),
			created_at: Set(sync_started_at),
			..Default::default()
		};
		let sync_session = sync_session.insert(db).await?;

		tracing::debug!(
			?previous_sync_at,
			to_sync_media_count = sync_session.media_ids.0.len(),
			sync_id = sync_session.id,
			"Beginning new Kobo sync session"
		);

		Ok(Self {
			model: sync_session,
		})
	}

	pub async fn next_page<'a>(
		db: &'a DatabaseConnection,
		user: &'a AuthUser,
		device_id: Option<&str>,
		device_metadata: serde_json::Value,
		client_sync_state: Option<&SyncState>,
		limit: usize,
	) -> Result<SyncPage<'a>, sea_orm::DbErr> {
		// there are 3 possibilities here:
		// 1. the client did not provide a sync token (or did not provide a valid sync token)
		//    -> we should begin a new session, and sync the entire library.
		// 2. the client provided a "Completed" sync token, acknowledging the completion of a session
		//    -> we should begin a new session, syncing things that changed since the completed session.
		// 3. the client provided an "Incomplete" sync token
		//    -> we should continue the session referenced in the token.
		let sync_id = client_sync_state.map(|state| state.sync_id().to_string());

		let prev_sync_session = match sync_id {
			Some(ref sync_id) => KoboSync::find(db, user, sync_id).await,
			None => None,
		};

		let (session, offset) = match (client_sync_state, prev_sync_session) {
			(Some(SyncState::IncompleteV1 { next_offset, .. }), Some(session)) => {
				// we're continuing an existing sync session
				(session, *next_offset)
			},
			(_, prev_sync_session) => {
				// there was no previous sync session, or the previous session completed
				let previous_sync_began_at =
					prev_sync_session.map(|s| s.model.created_at.fixed_offset());

				// once the device has acknowledged session N (prev_sync_session) we no longer need session N-1.
				let keep_sessions: Vec<String> = sync_id.into_iter().collect();
				KoboSync::prune_sync_sessions(db, user, device_id, &keep_sessions).await;

				let session = KoboSync::begin_new_sync(
					db,
					user,
					device_id,
					device_metadata,
					previous_sync_began_at,
				)
				.await?;

				(session, 0)
			},
		};

		Ok(SyncPage::new(
			db,
			user,
			session.model.id.clone(),
			&session.model.media_ids.0,
			offset,
			limit,
			session.model.previous_sync_at,
		))
	}
}

/// a page of library sync results.
pub struct SyncPage<'a> {
	db: &'a DatabaseConnection,
	user: &'a AuthUser,

	/// an offset from the beginning of all the updates in this session.
	offset: usize,

	/// the maximum number of updates to return in this page.
	limit: usize,

	/// the time that the sync prior to this one began.
	/// used to determine what has changed with each piece of media since the last sync.
	previous_sync_at: Option<DateTimeWithTimeZone>,

	/// IDs of database media objects that should be returned in this page.
	media_ids: Vec<String>,

	/// are there more pages to retrieve in this sync session?
	pub should_continue: bool,

	/// a token representing the state of the current sync session.
	/// this will be returned to the client, and the client will use it in its next sync request.
	pub sync_state: SyncState,
}

impl<'a> SyncPage<'a> {
	fn new(
		db: &'a DatabaseConnection,
		user: &'a AuthUser,
		sync_id: String,
		media_ids: &[String],
		offset: usize,
		limit: usize,
		previous_sync_at: Option<DateTimeWithTimeZone>,
	) -> SyncPage<'a> {
		let len = media_ids.len();
		let start = offset.min(len);
		let next_offset = (offset + limit).min(len);

		let should_continue = next_offset < len;

		SyncPage {
			db,
			user,

			offset,
			limit,
			previous_sync_at,

			media_ids: media_ids[start..next_offset].to_vec(),
			should_continue,

			sync_state: SyncState::new(sync_id, !should_continue, next_offset),
		}
	}

	pub async fn sync_items(
		&self,
		config: &StumpConfig,
		kobo_api_base_url: &str,
	) -> Result<Vec<SyncItem>, DbErr> {
		let items: Vec<MediaWithMetadataAndReadingSessions> =
			MediaWithMetadataAndReadingSessions::find_by_ids_for_user(
				&self.media_ids,
				self.user,
			)
			.filter(media::Entity::epub_filter())
			.filter(media::Column::DeletedAt.is_null())
			.into_model::<MediaWithMetadataAndReadingSessions>()
			.all(self.db)
			.await?;

		let mut selections: HashMap<String, kobo_sync_media::Model> =
			kobo_sync_media::Entity::find()
				.filter(kobo_sync_media::Column::UserId.eq(&self.user.id))
				.filter(kobo_sync_media::Column::MediaId.is_in(&self.media_ids))
				.all(self.db)
				.await?
				.into_iter()
				.map(|selection| (selection.media_id.clone(), selection))
				.collect();
		let preparations = items
			.iter()
			.filter(|m| {
				selections
					.get(&m.media.id)
					.is_none_or(|row| row.is_selected)
			})
			.map(|m| async move {
				let has_progress = m.reading_session.is_some()
					|| m.finished_reading_session_count > 0
					|| m.reading_progress_reset_at.is_some();
				let download = kepub::prepare_download(config, &m.media)
					.await
					.map_err(|error| DbErr::Custom(error.to_string()))?;
				let positions = if has_progress {
					kepub::position_map(config, &download, &m.media.id).await
				} else {
					None
				};
				Ok::<_, DbErr>((m.media.id.clone(), (download.content, positions)))
			})
			.collect::<Vec<_>>();
		let mut prepared: HashMap<String, (kepub::KoboContentInfo, Option<_>)> =
			stream::iter(preparations)
				.buffered(KEPUB_PREPARE_CONCURRENCY)
				.collect::<Vec<_>>()
				.await
				.into_iter()
				.collect::<Result<_, _>>()?;

		let mut sync_items = Vec::new();
		for m in items {
			let selection = selections.remove(&m.media.id);
			let is_selected = selection.as_ref().is_none_or(|row| row.is_selected);
			let selection_changed = self.previous_sync_at.is_some_and(|previous| {
				selection
					.as_ref()
					.is_some_and(|row| row.updated_at >= previous)
			});
			let created_since_last_sync = self
				.previous_sync_at
				.is_none_or(|previous| m.media.created_at >= previous);
			let source_changed = self.previous_sync_at.is_some_and(|previous| {
				m.media
					.modified_at
					.is_some_and(|modified| modified >= previous)
			});
			let progress_changed = self.previous_sync_at.is_some_and(|previous| {
				m.reading_session.as_ref().is_some_and(|session| {
					session.created_at >= previous
						|| session
							.updated_at
							.is_some_and(|updated| updated >= previous)
				}) || m
					.reading_progress_reset_at
					.is_some_and(|reset| reset >= previous)
					|| m.finished_reading_session_last_completed_at
						.is_some_and(|finished| finished >= previous)
			});

			if !is_selected && !created_since_last_sync && !selection_changed {
				continue;
			}

			let book_url =
				format!("{}/v1/books/{}/file/epub", kobo_api_base_url, m.media.id);
			let has_progress = m.reading_session.is_some()
				|| m.finished_reading_session_count > 0
				|| m.reading_progress_reset_at.is_some();
			let (content, positions) = if is_selected {
				prepared
					.remove(&m.media.id)
					.expect("selected Kobo books are prepared above")
			} else {
				(kepub::content_info(config, &m.media).await, None)
			};

			let entitlement_changed = !created_since_last_sync
				&& is_selected
				&& (selection_changed || source_changed);
			let progress_state = (is_selected
				&& (progress_changed || (entitlement_changed && has_progress)))
				.then(|| ReadingState::from_media(&m, positions.as_ref()));
			let changed_metadata =
				(is_selected && !created_since_last_sync && source_changed).then(|| {
					let mut metadata = BookMetadata::from_media(&m, book_url.clone());
					content.apply_to_metadata(&mut metadata);
					metadata
				});
			let mut entitlement = BookEntitlementContainer::from_media_with_positions(
				m,
				book_url,
				positions.as_ref(),
			);
			content.apply_to_entitlement(&mut entitlement);
			if let Some(selection) = selection.as_ref() {
				entitlement.book_entitlement.last_modified = entitlement
					.book_entitlement
					.last_modified
					.max(selection.updated_at.to_utc());
			}

			if !is_selected {
				entitlement.book_entitlement.is_removed = true;
				entitlement.book_entitlement.status = "Inactive".to_string();
				entitlement.book_entitlement.last_modified = selection
					.expect("an unselected book has an explicit selection row")
					.updated_at
					.to_utc();
				entitlement.reading_state = None;
				sync_items.push(SyncItem::ChangedEntitlement(entitlement));
				continue;
			}

			if created_since_last_sync {
				sync_items.push(SyncItem::NewEntitlement(entitlement));
			} else if entitlement_changed {
				sync_items.push(SyncItem::ChangedEntitlement(entitlement));
			}
			if let Some(metadata) = changed_metadata {
				sync_items.push(SyncItem::ChangedProductMetadata(metadata));
			}

			// Kobo ignores ReadingState nested in entitlement changes, so send both.
			if let Some(reading_state) = progress_state {
				sync_items.push(SyncItem::ChangedReadingState(ReadingStateContainer {
					reading_state,
				}));
			}
		}

		tracing::debug!(
			?self.offset,
			?self.limit,
			item_count = sync_items.len(),
			"Generated a page of Kobo sync items"
		);

		Ok(sync_items)
	}
}

#[cfg(test)]
mod tests {
	use chrono::{Days, Utc};
	use models::entity::{kobo_sync_media, kobo_sync_session, user};
	use sea_orm::prelude::DateTimeWithTimeZone;
	use sea_orm::query::*;
	use sea_orm::{ActiveModelTrait, EntityTrait, Set};
	use tests::db::test_database;
	use tests::fake_data;

	use crate::routers::kobo::{
		sync::{KoboSync, SyncPage},
		sync_token::SyncState,
	};
	use stump_core::config::StumpConfig;
	use stump_core::kobo::sync_types::SyncItem;

	#[tokio::test]
	async fn test_first_sync() {
		let db = test_database().await;

		let user = fake_data::User::new("ishmael").insert(&db).await;
		let series = fake_data::Series::default().insert(&db).await;

		fake_data::Media {
			series_id: series.id.clone(),
			id: Some("don-quixote".to_string()),
			name: Some("Don Quixote".to_string()),
			created_at: Some("1605-01-16T00:00:00Z".parse().unwrap()),
			..Default::default()
		}
		.insert(&db)
		.await;

		fake_data::Media {
			series_id: series.id.clone(),
			id: Some("robinson-crusoe".to_string()),
			name: Some("Robinson Crusoe".to_string()),
			created_at: Some("1719-04-25T00:00:00Z".parse().unwrap()),
			..Default::default()
		}
		.insert(&db)
		.await;

		fake_data::Media {
			series_id: series.id.clone(),
			id: Some("the-count-of-monte-cristo".to_string()),
			name: Some("The Count of Monte Cristo".to_string()),
			created_at: Some("1846-01-15T00:00:00Z".parse().unwrap()),
			..Default::default()
		}
		.insert(&db)
		.await;

		let user = user::AuthUser {
			id: user.id,
			permissions: vec![],
			..Default::default()
		};
		let sync_page = KoboSync::next_page(
			&db,
			&user,
			Some("kobo-1"),
			serde_json::json!({}),
			None,
			10,
		)
		.await
		.expect("failed to initiate sync");

		assert_eq!(
			vec![
				"don-quixote",
				"robinson-crusoe",
				"the-count-of-monte-cristo"
			],
			sync_page.media_ids,
		);
	}

	#[tokio::test]
	async fn test_pagination() {
		let db = test_database().await;

		let user = fake_data::User::new("ishmael").insert(&db).await;
		let series = fake_data::Series::default().insert(&db).await;

		for i in 1..=5 {
			fake_data::Media {
				series_id: series.id.clone(),
				id: Some(format!("book-{i}")),
				..Default::default()
			}
			.insert(&db)
			.await;
		}

		let user = user::AuthUser {
			id: user.id,
			permissions: vec![],
			..Default::default()
		};
		let first_page = KoboSync::next_page(
			&db,
			&user,
			Some("kobo-1"),
			serde_json::json!({}),
			None,
			3,
		)
		.await
		.expect("failed to initiate sync");

		assert_eq!(vec!["book-1", "book-2", "book-3"], first_page.media_ids);

		let SyncState::IncompleteV1 { next_offset, .. } = &first_page.sync_state else {
			panic!("expected an sync token with a next page")
		};

		assert_eq!(3, *next_offset);
		assert!(first_page.should_continue);

		let second_page = KoboSync::next_page(
			&db,
			&user,
			Some("kobo-1"),
			serde_json::json!({}),
			Some(&first_page.sync_state),
			3,
		)
		.await
		.expect("failed to continue sync");
		assert_eq!(vec!["book-4", "book-5"], second_page.media_ids);
		assert!(!second_page.should_continue);
	}

	#[tokio::test]
	async fn test_incremental_sync() {
		let db = test_database().await;

		let user = fake_data::User::new("ishmael").insert(&db).await;
		let series = fake_data::Series::default().insert(&db).await;

		for i in 1..=2 {
			fake_data::Media {
				series_id: series.id.clone(),
				id: Some(format!("book-{i}")),
				..Default::default()
			}
			.insert(&db)
			.await;
		}

		let user = user::AuthUser {
			id: user.id,
			permissions: vec![],
			..Default::default()
		};

		// the client syncs all the media that is initially available
		let sync_page = KoboSync::next_page(
			&db,
			&user,
			Some("kobo-1"),
			serde_json::json!({}),
			None,
			5,
		)
		.await
		.expect("failed to initiate sync");

		assert_eq!(vec!["book-1", "book-2"], sync_page.media_ids);
		assert!(!sync_page.should_continue);

		// after the first sync more media was added.
		for i in 3..=4 {
			fake_data::Media {
				series_id: series.id.clone(),
				id: Some(format!("book-{i}")),
				..Default::default()
			}
			.insert(&db)
			.await;
		}

		// in the second sync the client passes the token of the first sync.
		// this sync retrieves the new media.
		let sync_page = KoboSync::next_page(
			&db,
			&user,
			Some("kobo-1"),
			serde_json::json!({}),
			Some(&sync_page.sync_state),
			5,
		)
		.await
		.expect("failed to initiate sync");

		assert_eq!(vec!["book-3", "book-4"], sync_page.media_ids);
		assert!(!sync_page.should_continue);
	}

	#[tokio::test]
	async fn test_represent_new_entitlement() {
		let db = test_database().await;

		let user = fake_data::User::new("ishmael").insert(&db).await;
		let user = user::AuthUser {
			id: user.id,
			permissions: vec![],
			..Default::default()
		};

		let previous_sync_at: DateTimeWithTimeZone =
			"2026-01-01T00:00:00Z".parse().unwrap();

		let series = fake_data::Series::default().insert(&db).await;

		// a newly created book.
		let new_book = fake_data::Media {
			series_id: series.id.clone(),
			id: Some("new-book".to_string()),
			created_at: Some(previous_sync_at.checked_add_days(Days::new(1)).unwrap()),
			..Default::default()
		}
		.insert(&db)
		.await;

		let sync_page = SyncPage::new(
			&db,
			&user,
			"sync_1234".to_string(),
			std::slice::from_ref(&new_book.id),
			0,
			10,
			Some(previous_sync_at),
		);
		let config = StumpConfig::debug();
		let sync_items = sync_page
			.sync_items(&config, "https://stump.example.org/")
			.await
			.expect("failed to retrieve sync items");

		let SyncItem::NewEntitlement(ref ent) = sync_items[0] else {
			panic!("expected a NewEntitlement")
		};

		assert_eq!(new_book.id, ent.book_entitlement.id);
	}

	#[tokio::test]
	async fn test_full_sync_represents_deselection() {
		let db = test_database().await;
		let user = fake_data::User::new("ishmael").insert(&db).await;
		let user = user::AuthUser {
			id: user.id,
			permissions: vec![],
			..Default::default()
		};
		let series = fake_data::Series::default().insert(&db).await;
		let book = fake_data::Media {
			series_id: series.id,
			id: Some("removed-book".to_string()),
			..Default::default()
		}
		.insert(&db)
		.await;
		kobo_sync_media::ActiveModel {
			user_id: Set(user.id.clone()),
			media_id: Set(book.id.clone()),
			is_selected: Set(false),
			updated_at: Set(Utc::now().into()),
		}
		.insert(&db)
		.await
		.unwrap();

		let page = SyncPage::new(
			&db,
			&user,
			"sync_1234".to_string(),
			std::slice::from_ref(&book.id),
			0,
			10,
			None,
		);
		let items = page
			.sync_items(&StumpConfig::debug(), "https://stump.example.org")
			.await
			.unwrap();

		let SyncItem::ChangedEntitlement(entitlement) = &items[0] else {
			panic!("expected a removed ChangedEntitlement")
		};
		assert!(entitlement.book_entitlement.is_removed);
		assert_eq!(entitlement.book_entitlement.status, "Inactive");
	}

	#[tokio::test]
	async fn test_represent_changed_entitlement() {
		let db = test_database().await;

		let user = fake_data::User::new("ishmael").insert(&db).await;
		let user = user::AuthUser {
			id: user.id,
			permissions: vec![],
			..Default::default()
		};

		let previous_sync_at: DateTimeWithTimeZone =
			"2026-01-01T00:00:00Z".parse().unwrap();

		let series = fake_data::Series::default().insert(&db).await;

		// a book that was modified since the last sync.
		let new_book = fake_data::Media {
			series_id: series.id.clone(),
			id: Some("new-book".to_string()),
			created_at: Some(previous_sync_at.checked_sub_days(Days::new(1)).unwrap()),
			modified_at: Some(previous_sync_at.checked_add_days(Days::new(1)).unwrap()),
			..Default::default()
		}
		.insert(&db)
		.await;

		let sync_page = SyncPage::new(
			&db,
			&user,
			"sync_1234".to_string(),
			std::slice::from_ref(&new_book.id),
			0,
			10,
			Some(previous_sync_at),
		);
		let config = StumpConfig::debug();
		let sync_items = sync_page
			.sync_items(&config, "https://stump.example.org/")
			.await
			.expect("failed to retrieve sync items");

		let SyncItem::ChangedEntitlement(ref ent) = sync_items[0] else {
			panic!("expected a ChangedEntitlement")
		};

		assert_eq!(new_book.id, ent.book_entitlement.id);
		let SyncItem::ChangedProductMetadata(ref metadata) = sync_items[1] else {
			panic!("expected ChangedProductMetadata")
		};
		assert_eq!(new_book.id, metadata.entitlement_id);
	}

	#[tokio::test]
	async fn test_progress_changes_emit_separate_sync_items() {
		let db = test_database().await;
		let user = fake_data::User::new("ishmael").insert(&db).await;
		let user = user::AuthUser {
			id: user.id,
			permissions: vec![],
			..Default::default()
		};
		let previous_sync_at: DateTimeWithTimeZone =
			"2026-01-01T00:00:00Z".parse().unwrap();
		let series = fake_data::Series::default().insert(&db).await;
		let progress_only = fake_data::Media {
			series_id: series.id.clone(),
			id: Some("progress-only".to_string()),
			created_at: Some(previous_sync_at.checked_sub_days(Days::new(1)).unwrap()),
			..Default::default()
		}
		.insert(&db)
		.await;
		let changed = fake_data::Media {
			series_id: series.id,
			id: Some("content-and-progress".to_string()),
			created_at: Some(previous_sync_at.checked_sub_days(Days::new(1)).unwrap()),
			modified_at: Some(previous_sync_at.checked_add_days(Days::new(1)).unwrap()),
			..Default::default()
		}
		.insert(&db)
		.await;
		for media_id in [&progress_only.id, &changed.id] {
			fake_data::ReadingSession {
				media_id: media_id.clone(),
				user_id: user.id.clone(),
				created_at: Some(
					previous_sync_at.checked_add_days(Days::new(1)).unwrap(),
				),
				..Default::default()
			}
			.insert(&db)
			.await;
		}

		let page = SyncPage::new(
			&db,
			&user,
			"sync_1234".to_string(),
			&[progress_only.id, changed.id],
			0,
			10,
			Some(previous_sync_at),
		);
		let items = page
			.sync_items(&StumpConfig::debug(), "https://stump.example.org")
			.await
			.unwrap();

		assert_eq!(
			items
				.iter()
				.filter(|item| matches!(item, SyncItem::ChangedReadingState(_)))
				.count(),
			2
		);
		assert_eq!(
			items
				.iter()
				.filter(|item| matches!(item, SyncItem::ChangedEntitlement(_)))
				.count(),
			1
		);
	}

	#[tokio::test]
	async fn test_sync_pruning() {
		let db = test_database().await;

		let user = fake_data::User::new("ishmael").insert(&db).await;

		let user = user::AuthUser {
			id: user.id,
			permissions: vec![],
			..Default::default()
		};

		// do 5 successive syncs.
		let mut sync_state: Option<SyncState> = None;
		let mut sync_ids = vec![];
		for _ in 1..=5 {
			let sync_page = KoboSync::next_page(
				&db,
				&user,
				Some("kobo-1"),
				serde_json::json!({}),
				sync_state.as_ref(),
				10,
			)
			.await
			.expect("failed to initiate sync");

			let SyncState::CompletedV1 { sync_id } = &sync_page.sync_state else {
				panic!("expected an sync token without a next page")
			};

			sync_ids.push(sync_id.clone());
			sync_state = Some(sync_page.sync_state);
		}

		let sessions_in_db: Vec<String> = kobo_sync_session::Entity::find()
			.column(kobo_sync_session::Column::Id)
			.into_tuple()
			.all(&db)
			.await
			.expect("could not load Kobo sync sessions from database");

		// the database should only contain the last 2 syncs.
		assert_eq!(sync_ids[3..], sessions_in_db)
	}

	#[tokio::test]
	async fn test_only_includes_epubs() {
		let db = test_database().await;

		let user = fake_data::User::new("ishmael").insert(&db).await;
		let series = fake_data::Series::default().insert(&db).await;

		fake_data::Media {
			series_id: series.id.clone(),
			id: Some("don-quixote".to_string()),
			name: Some("Don Quixote".to_string()),
			created_at: Some("1605-01-16T00:00:00Z".parse().unwrap()),
			extension: Some("EPUB".to_string()),
			..Default::default()
		}
		.insert(&db)
		.await;

		fake_data::Media {
			series_id: series.id.clone(),
			id: Some("action-comics-i".to_string()),
			name: Some("Action Comics #1".to_string()),
			created_at: Some("1938-04-18T00:00:00Z".parse().unwrap()),
			extension: Some("cbz".to_string()),
			..Default::default()
		}
		.insert(&db)
		.await;

		fake_data::Media {
			series_id: series.id.clone(),
			id: Some("voynich-manuscript".to_string()),
			name: Some("Voynich Manuscript".to_string()),
			created_at: Some("1400-01-01T00:00:00Z".parse().unwrap()),
			extension: Some("pdf".to_string()),
			..Default::default()
		}
		.insert(&db)
		.await;

		let user = user::AuthUser {
			id: user.id,
			permissions: vec![],
			..Default::default()
		};
		let sync_page = KoboSync::next_page(
			&db,
			&user,
			Some("kobo-1"),
			serde_json::json!({}),
			None,
			10,
		)
		.await
		.expect("failed to initiate sync");

		// we don't include CBZs or PDFs
		assert_eq!(vec!["don-quixote",], sync_page.media_ids,);
	}
}

// structs for managing the state of the sync process.
use std::collections::HashMap;

use models::entity::{
	kobo_sync_session,
	media::{self, ModelWithMetadata},
	reading_session,
	user::AuthUser,
};
use sea_orm::Set;

use sea_orm::prelude::*;
use sea_orm::query::*;

use crate::routers::kobo::sync_token::SyncToken;
use stump_core::kobo::sync_types::*;

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
		let query = match previous_sync_at {
			// load things created or modified since the last sync session
			Some(previous_sync_at) => media::Entity::find_for_user(user)
				.filter(media::Column::Extension.eq("epub"))
				.filter(
					sea_orm::Condition::any()
						.add(media::Column::CreatedAt.gte(previous_sync_at))
						.add(media::Column::ModifiedAt.gte(previous_sync_at)),
				),
			// we're starting from scratch, load absolutely everything
			None => media::Entity::find_for_user(user)
				.filter(media::Column::Extension.eq("epub")),
		};

		let media_ids = query.column(media::Column::Id).into_tuple().all(db).await?;

		let sync_session = kobo_sync_session::ActiveModel {
			user_id: Set(user.id.clone()),
			media_ids: Set(kobo_sync_session::MediaIds(media_ids)),
			device_id: Set(device_id.unwrap_or("").to_string()),
			device_metadata: Set(device_metadata),
			previous_sync_at: Set(previous_sync_at),
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
		client_sync_token: Option<&SyncToken>,
		limit: usize,
	) -> Result<SyncPage<'a>, sea_orm::DbErr> {
		// there are 3 possibilities here:
		// 1. the client did not provide a sync token (or did not provide a valid sync token)
		//    -> we should begin a new session, and sync the entire library.
		// 2. the client provided a "Completed" sync token, acknowledging the completion of a session
		//    -> we should begin a new session, syncing things that changed since the completed session.
		// 3. the client provided an "Incomplete" sync token
		//    -> we should continue the session referenced in the token.
		let sync_id = client_sync_token.map(|token| match token {
			SyncToken::IncompleteV1 { sync_id, .. }
			| SyncToken::CompletedV1 { sync_id, .. } => sync_id.to_string(),
		});

		let prev_sync_session = match sync_id {
			Some(ref sync_id) => KoboSync::find(db, user, sync_id).await,
			None => None,
		};

		let (session, offset) = match (client_sync_token, prev_sync_session) {
			(Some(SyncToken::IncompleteV1 { next_offset, .. }), Some(session)) => {
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
	pub sync_token: SyncToken,
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

			sync_token: SyncToken::new(sync_id, !should_continue, next_offset),
		}
	}

	pub async fn sync_items(
		&self,
		kobo_api_base_url: &str,
	) -> Result<Vec<SyncItem>, DbErr> {
		let items: Vec<media::ModelWithMetadata> =
			ModelWithMetadata::find_by_ids_for_user(&self.media_ids, self.user)
				.filter(media::Column::Extension.eq("epub"))
				.into_model::<media::ModelWithMetadata>()
				.all(self.db)
				.await?;

		let reading_sessions = reading_session::Entity::find()
			.filter(reading_session::Column::UserId.eq(self.user.id.clone()))
			.filter(reading_session::Column::MediaId.is_in(&self.media_ids))
			.all(self.db)
			.await?;

		// TODO: this is not the correct way to do this!
		// we should be able to do this in a single query.
		// also, we need to properly handle cases where there are multiple sessions for a single
		// piece of media.
		let mut reading_sessions_by_media_id = HashMap::new();
		for rs in reading_sessions {
			reading_sessions_by_media_id.insert(rs.media_id.clone(), rs);
		}

		let sync_items: Vec<SyncItem> = items
			.into_iter()
			.map(|m| {
				let book_url =
					format!("{}/v1/books/{}/file/epub", kobo_api_base_url, m.media.id);

				let rs = reading_sessions_by_media_id.get(&m.media.id);

				let created_since_last_sync = self
					.previous_sync_at
					.is_none_or(|ps| m.media.created_at >= ps);

				if created_since_last_sync {
					SyncItem::NewEntitlement(BookEntitlementContainer::from_media(
						m, rs, book_url,
					))
				} else {
					SyncItem::ChangedProductMetadata(BookMetadata::from_media(
						&m, book_url,
					))
				}
			})
			.collect();

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
	use chrono::Days;
	use models::{
		entity::{
			kobo_sync_session, library, library_exclusion, media, media_metadata,
			reading_session, series, series_metadata, user, user_preferences,
		},
		shared::enums::FileStatus,
	};
	use rand::distr::SampleString;
	use sea_orm::query::*;
	use sea_orm::EntityTrait;
	use sea_orm::{
		prelude::DateTimeWithTimeZone, ActiveModelTrait, ActiveValue, ConnectionTrait,
		Database, DbBackend, DbConn, DbErr, Schema,
	};
	use uuid::Uuid;

	use crate::routers::kobo::{
		sync::{KoboSync, SyncPage},
		sync_token::SyncToken,
	};
	use stump_core::kobo::sync_types::SyncItem;

	async fn test_database() -> DbConn {
		let db = Database::connect("sqlite::memory:")
			.await
			.expect("failed to connect to test database");

		create_database_tables(&db)
			.await
			.expect("failed to create test database tables");

		db
	}

	async fn create_database_tables(db: &DbConn) -> Result<(), DbErr> {
		let schema = Schema::new(DbBackend::Sqlite);

		let tables = [
			schema.create_table_from_entity(media::Entity),
			schema.create_table_from_entity(media_metadata::Entity),
			schema.create_table_from_entity(series::Entity),
			schema.create_table_from_entity(series_metadata::Entity),
			schema.create_table_from_entity(library_exclusion::Entity),
			schema.create_table_from_entity(kobo_sync_session::Entity),
			schema.create_table_from_entity(user::Entity),
			schema.create_table_from_entity(user_preferences::Entity),
			schema.create_table_from_entity(library::Entity),
			schema.create_table_from_entity(reading_session::Entity),
		];

		for stmt in tables {
			db.execute(db.get_database_backend().build(&stmt)).await?;
		}

		Ok(())
	}

	// note that None here means "use some default", not necessarily "set the value to None".
	// that may make it impossible to set some values to None. I'm not sure how to avoid that while
	// keeping good ergonomics.
	#[derive(Default)]
	struct ExampleMedia {
		series_id: String,
		id: Option<String>,
		name: Option<String>,
		extension: Option<String>,
		created_at: Option<DateTimeWithTimeZone>,
		modified_at: Option<DateTimeWithTimeZone>,
		deleted_at: Option<DateTimeWithTimeZone>,
	}

	impl ExampleMedia {
		async fn insert(&self, db: &DbConn) -> media::Model {
			let id = self
				.id
				.clone()
				.unwrap_or_else(|| Uuid::new_v4().to_string());

			let name = self
				.name
				.clone()
				.unwrap_or_else(|| format!("Test Book {id}"));
			let extension = self.extension.clone().unwrap_or("epub".to_string());

			let model = media::ActiveModel {
				series_id: ActiveValue::Set(Some(self.series_id.clone())),
				id: ActiveValue::Set(id.clone()),
				name: ActiveValue::Set(name.clone()),
				size: ActiveValue::Set(1234),
				extension: sea_orm::Set(extension.clone()),
				pages: ActiveValue::Set(940),
				modified_at: self
					.modified_at
					.map_or(ActiveValue::default(), |t| ActiveValue::Set(Some(t))),
				deleted_at: self
					.deleted_at
					.map_or(ActiveValue::default(), |t| ActiveValue::Set(Some(t))),
				path: sea_orm::Set(format!("{name}.{extension}").to_string()),
				status: sea_orm::Set(FileStatus::Ready),
				..Default::default()
			};

			let insert_result = model.insert(db).await.expect("could not insert media");

			// "created_at" is overridden by the ActiveModelBehavior, so we need to update it explicitly.
			match self.created_at {
				Some(t) => {
					let mut model: media::ActiveModel = insert_result.into();
					model.created_at = ActiveValue::Set(t);
					model.update(db).await.expect("could not update media")
				},
				None => insert_result,
			}
		}
	}

	#[derive(Default)]
	struct ExampleUser {
		username: String,
		hashed_password: Option<String>,
	}

	impl ExampleUser {
		fn new<T: ToString>(username: T) -> Self {
			ExampleUser {
				username: username.to_string(),
				..Default::default()
			}
		}

		async fn insert(&self, db: &DbConn) -> user::Model {
			let model = user::ActiveModel {
				username: sea_orm::Set(self.username.clone()),
				hashed_password: sea_orm::Set(
					self.hashed_password.clone().unwrap_or("".to_string()),
				),
				is_server_owner: sea_orm::Set(true),
				is_locked: sea_orm::Set(false),
				..Default::default()
			};

			model.insert(db).await.expect("could not insert user")
		}
	}

	#[derive(Default)]
	struct ExampleSeries {
		name: Option<String>,
		path: Option<String>,
	}

	impl ExampleSeries {
		async fn insert(&self, db: &DbConn) -> series::Model {
			let name = self.name.clone().unwrap_or_else(|| {
				rand::distr::Alphabetic.sample_string(&mut rand::rng(), 16)
			});

			let path = self.path.clone().unwrap_or_else(|| format!("/tmp/{name}"));

			let model = series::ActiveModel {
				name: sea_orm::Set(name),
				path: sea_orm::Set(path),
				..Default::default()
			};

			model.insert(db).await.expect("could not insert series")
		}
	}

	#[tokio::test]
	async fn test_first_sync() {
		let db = test_database().await;

		let user = ExampleUser::new("ishmael").insert(&db).await;
		let series = ExampleSeries::default().insert(&db).await;

		ExampleMedia {
			series_id: series.id.clone(),
			id: Some("don-quixote".to_string()),
			name: Some("Don Quixote".to_string()),
			created_at: Some("1605-01-16T00:00:00Z".parse().unwrap()),
			..Default::default()
		}
		.insert(&db)
		.await;

		ExampleMedia {
			series_id: series.id.clone(),
			id: Some("robinson-crusoe".to_string()),
			name: Some("Robinson Crusoe".to_string()),
			created_at: Some("1719-04-25T00:00:00Z".parse().unwrap()),
			..Default::default()
		}
		.insert(&db)
		.await;

		ExampleMedia {
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

		// TODO: test ignoring non-epubs
	}

	#[tokio::test]
	async fn test_pagination() {
		let db = test_database().await;

		let user = ExampleUser::new("ishmael").insert(&db).await;
		let series = ExampleSeries::default().insert(&db).await;

		for i in 1..=5 {
			ExampleMedia {
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

		let SyncToken::IncompleteV1 { next_offset, .. } = first_page.sync_token else {
			panic!("expected an sync token with a next page")
		};

		assert_eq!(3, next_offset);
		assert!(first_page.should_continue);

		let second_page = KoboSync::next_page(
			&db,
			&user,
			Some("kobo-1"),
			serde_json::json!({}),
			Some(&first_page.sync_token),
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

		let user = ExampleUser::new("ishmael").insert(&db).await;
		let series = ExampleSeries::default().insert(&db).await;

		for i in 1..=2 {
			ExampleMedia {
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
			ExampleMedia {
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
			Some(&sync_page.sync_token),
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

		let user = ExampleUser::new("ishmael").insert(&db).await;
		let user = user::AuthUser {
			id: user.id,
			permissions: vec![],
			..Default::default()
		};

		let previous_sync_at: DateTimeWithTimeZone =
			"2026-01-01T00:00:00Z".parse().unwrap();

		let series = ExampleSeries::default().insert(&db).await;

		// a newly created book.
		let new_book = ExampleMedia {
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
		let sync_items = sync_page
			.sync_items("https://stump.example.org/")
			.await
			.expect("failed to retrieve sync items");

		let SyncItem::NewEntitlement(ref ent) = sync_items[0] else {
			panic!("expected a NewEntitlement")
		};

		assert_eq!(new_book.id, ent.book_entitlement.id);
	}

	#[tokio::test]
	async fn test_represent_changed_product_metadata() {
		let db = test_database().await;

		let user = ExampleUser::new("ishmael").insert(&db).await;
		let user = user::AuthUser {
			id: user.id,
			permissions: vec![],
			..Default::default()
		};

		let previous_sync_at: DateTimeWithTimeZone =
			"2026-01-01T00:00:00Z".parse().unwrap();

		let series = ExampleSeries::default().insert(&db).await;

		// a book that was modified since the last sync.
		let new_book = ExampleMedia {
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
		let sync_items = sync_page
			.sync_items("https://stump.example.org/")
			.await
			.expect("failed to retrieve sync items");

		let SyncItem::ChangedProductMetadata(ref ent) = sync_items[0] else {
			panic!("expected a ChangedProductMetadata")
		};

		assert_eq!(new_book.id, ent.entitlement_id);
	}

	#[tokio::test]
	async fn test_sync_pruning() {
		let db = test_database().await;

		let user = ExampleUser::new("ishmael").insert(&db).await;

		let user = user::AuthUser {
			id: user.id,
			permissions: vec![],
			..Default::default()
		};

		// do 5 successive syncs.
		let mut sync_token: Option<SyncToken> = None;
		let mut sync_ids = vec![];
		for _ in 1..=5 {
			let sync_page = KoboSync::next_page(
				&db,
				&user,
				Some("kobo-1"),
				serde_json::json!({}),
				sync_token.as_ref(),
				10,
			)
			.await
			.expect("failed to initiate sync");

			let SyncToken::CompletedV1 { ref sync_id, .. } = sync_page.sync_token else {
				panic!("expected an sync token without a next page")
			};

			sync_ids.push(sync_id.clone());
			sync_token = Some(sync_page.sync_token);
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
}

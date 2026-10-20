use std::collections::HashMap;

use chrono::{DateTime, Duration, NaiveDate, Utc};
use sea_orm::{FromQueryResult, Statement};
use sea_orm_migration::prelude::*;

#[derive(DeriveMigrationName)]
pub struct Migration;

#[async_trait::async_trait]
impl MigrationTrait for Migration {
	async fn up(&self, manager: &SchemaManager) -> Result<(), DbErr> {
		let conn = manager.get_connection();
		let db_backend = manager.get_database_backend();

		// Sqlite does not support modification of foreign key constraints to existing tables
		// >:( so we just rebuild the tables with the new fks
		conn.execute(Statement::from_string(
			db_backend,
			r#"alter table "bookmarks" rename to "bookmarks_legacy""#.to_owned(),
		))
		.await?;

		manager
			.create_table(
				Table::create()
					.table(Bookmarks::Table)
					.col(
						ColumnDef::new(Bookmarks::Id)
							.text()
							.not_null()
							.primary_key(),
					)
					.col(ColumnDef::new(Bookmarks::PreviewContent).text().null())
					.col(ColumnDef::new(Bookmarks::Locator).json().null())
					.col(ColumnDef::new(Bookmarks::Page).integer().null())
					.col(ColumnDef::new(Bookmarks::MediaId).text().not_null())
					.col(ColumnDef::new(Bookmarks::UserId).text().not_null())
					.col(
						ColumnDef::new(Bookmarks::CreatedAt)
							.timestamp_with_time_zone()
							.not_null()
							.default(Expr::current_timestamp()),
					)
					.col(ColumnDef::new(Bookmarks::SessionId).integer().null())
					.foreign_key(
						ForeignKey::create()
							.name("fk-bookmarks-media")
							.from(Bookmarks::Table, Bookmarks::MediaId)
							.to(Media::Table, Media::Id)
							.on_delete(ForeignKeyAction::Cascade)
							.on_update(ForeignKeyAction::Cascade),
					)
					.foreign_key(
						ForeignKey::create()
							.name("fk-bookmarks-user")
							.from(Bookmarks::Table, Bookmarks::UserId)
							.to(Users::Table, Users::Id)
							.on_delete(ForeignKeyAction::Cascade)
							.on_update(ForeignKeyAction::Cascade),
					)
					.foreign_key(
						ForeignKey::create()
							.name("fk-bookmarks-session")
							.from(Bookmarks::Table, Bookmarks::SessionId)
							.to(ReadingSessions::Table, ReadingSessions::Id)
							.on_delete(ForeignKeyAction::SetNull),
						// ^ no delete bookmarks when a session is deleted
					)
					.to_owned(),
			)
			.await?;

		conn.execute(Statement::from_string(
			db_backend,
			r#"insert into "bookmarks"("id", "preview_content", "locator", "page", "media_id", "user_id", "created_at")
			select
			    "id",
                "preview_content",
                "locator",
                "page",
                "media_id",
                "user_id",
                "created_at"
			from "bookmarks_legacy""#
				.to_owned(),
		))
		.await?;

		conn.execute(Statement::from_string(
			db_backend,
			r#"drop table "bookmarks_legacy""#.to_owned(),
		))
		.await?;

		conn.execute(Statement::from_string(
			db_backend,
			r#"alter table "media_annotations" rename to "media_annotations_legacy""#
				.to_owned(),
		))
		.await?;

		manager
			.create_table(
				Table::create()
					.table(MediaAnnotations::Table)
					.col(
						ColumnDef::new(MediaAnnotations::Id)
							.string()
							.not_null()
							.primary_key(),
					)
					.col(ColumnDef::new(MediaAnnotations::Locator).json().not_null())
					.col(
						ColumnDef::new(MediaAnnotations::AnnotationText)
							.string()
							.null(),
					)
					.col(
						ColumnDef::new(MediaAnnotations::MediaId)
							.string()
							.not_null(),
					)
					.col(ColumnDef::new(MediaAnnotations::UserId).string().not_null())
					.col(
						ColumnDef::new(MediaAnnotations::CreatedAt)
							.timestamp_with_time_zone()
							.not_null()
							.default(Expr::current_timestamp()),
					)
					.col(
						ColumnDef::new(MediaAnnotations::UpdatedAt)
							.timestamp_with_time_zone()
							.not_null()
							.default(Expr::current_timestamp()),
					)
					.col(ColumnDef::new(MediaAnnotations::SessionId).integer().null())
					.foreign_key(
						ForeignKey::create()
							.name("fk_media_annotations_media_id")
							.from(MediaAnnotations::Table, MediaAnnotations::MediaId)
							.to(Media::Table, Media::Id)
							.on_delete(ForeignKeyAction::Cascade)
							.on_update(ForeignKeyAction::Cascade),
					)
					.foreign_key(
						ForeignKey::create()
							.name("fk_media_annotations_user_id")
							.from(MediaAnnotations::Table, MediaAnnotations::UserId)
							.to(Users::Table, Users::Id)
							.on_delete(ForeignKeyAction::Cascade)
							.on_update(ForeignKeyAction::Cascade),
					)
					.foreign_key(
						ForeignKey::create()
							.name("fk-media_annotations-session")
							.from(MediaAnnotations::Table, MediaAnnotations::SessionId)
							.to(ReadingSessions::Table, ReadingSessions::Id)
							.on_delete(ForeignKeyAction::SetNull),
						// ^ no delete annotations when a session is deleted
					)
					.to_owned(),
			)
			.await?;

		conn.execute(Statement::from_string(
			db_backend,
			r#"insert into "media_annotations"("id", "locator", "annotation_text", "media_id", "user_id", "created_at", "updated_at")
			select
			    "id",
                "locator",
                "annotation_text",
                "media_id",
                "user_id",
                "created_at",
                "updated_at"
			from "media_annotations_legacy""#
				.to_owned(),
		))
		.await?;

		conn.execute(Statement::from_string(
			db_backend,
			r#"drop table "media_annotations_legacy""#.to_owned(),
		))
		.await?;

		conn.execute(Statement::from_string(
			db_backend,
			r#"drop index if exists "idx_media_annotations_user_media""#.to_owned(),
		))
		.await?;

		manager
			.create_index(
				Index::create()
					.name("idx_media_annotations_user_media")
					.table(MediaAnnotations::Table)
					.col(MediaAnnotations::UserId)
					.col(MediaAnnotations::MediaId)
					.to_owned(),
			)
			.await?;

		match backfill(conn).await {
			Ok(_) => (),
			Err(error) => {
				tracing::warn!(
					?error,
					"Failed to backfill session_id for bookmarks and annotations"
				);
				// ^ best effort, no guarantee for data integrity
			},
		}

		Ok(())
	}

	async fn down(&self, manager: &SchemaManager) -> Result<(), DbErr> {
		let conn = manager.get_connection();
		let db_backend = manager.get_database_backend();

		conn.execute(Statement::from_string(
			db_backend,
			r#"alter table "bookmarks" rename to "bookmarks_legacy""#.to_owned(),
		))
		.await?;

		manager
			.create_table(
				Table::create()
					.table(Bookmarks::Table)
					.col(
						ColumnDef::new(Bookmarks::Id)
							.text()
							.not_null()
							.primary_key(),
					)
					.col(ColumnDef::new(Bookmarks::PreviewContent).text().null())
					.col(ColumnDef::new(Bookmarks::Locator).json().null())
					.col(ColumnDef::new(Bookmarks::Page).integer().null())
					.col(ColumnDef::new(Bookmarks::MediaId).text().not_null())
					.col(ColumnDef::new(Bookmarks::UserId).text().not_null())
					.col(
						ColumnDef::new(Bookmarks::CreatedAt)
							.timestamp_with_time_zone()
							.not_null()
							.default(Expr::current_timestamp()),
					)
					.foreign_key(
						ForeignKey::create()
							.name("fk-bookmarks-media")
							.from(Bookmarks::Table, Bookmarks::MediaId)
							.to(Media::Table, Media::Id)
							.on_delete(ForeignKeyAction::Cascade)
							.on_update(ForeignKeyAction::Cascade),
					)
					.foreign_key(
						ForeignKey::create()
							.name("fk-bookmarks-user")
							.from(Bookmarks::Table, Bookmarks::UserId)
							.to(Users::Table, Users::Id)
							.on_delete(ForeignKeyAction::Cascade)
							.on_update(ForeignKeyAction::Cascade),
					)
					.to_owned(),
			)
			.await?;

		conn.execute(Statement::from_string(
			db_backend,
			r#"insert into "bookmarks"("id", "preview_content", "locator", "page", "media_id", "user_id", "created_at")SELECT "id",
                "preview_content",
                "locator",
                "page",
                "media_id",
                "user_id",
                "created_at"
			from "bookmarks_legacy""#
				.to_owned(),
		))
		.await?;

		conn.execute(Statement::from_string(
			db_backend,
			r#"drop table "bookmarks_legacy""#.to_owned(),
		))
		.await?;

		conn.execute(Statement::from_string(
			db_backend,
			r#"alter table "media_annotations" rename to "media_annotations_legacy""#
				.to_owned(),
		))
		.await?;

		manager
			.create_table(
				Table::create()
					.table(MediaAnnotations::Table)
					.col(
						ColumnDef::new(MediaAnnotations::Id)
							.string()
							.not_null()
							.primary_key(),
					)
					.col(ColumnDef::new(MediaAnnotations::Locator).json().not_null())
					.col(
						ColumnDef::new(MediaAnnotations::AnnotationText)
							.string()
							.null(),
					)
					.col(
						ColumnDef::new(MediaAnnotations::MediaId)
							.string()
							.not_null(),
					)
					.col(ColumnDef::new(MediaAnnotations::UserId).string().not_null())
					.col(
						ColumnDef::new(MediaAnnotations::CreatedAt)
							.timestamp_with_time_zone()
							.not_null()
							.default(Expr::current_timestamp()),
					)
					.col(
						ColumnDef::new(MediaAnnotations::UpdatedAt)
							.timestamp_with_time_zone()
							.not_null()
							.default(Expr::current_timestamp()),
					)
					.foreign_key(
						ForeignKey::create()
							.name("fk_media_annotations_media_id")
							.from(MediaAnnotations::Table, MediaAnnotations::MediaId)
							.to(Media::Table, Media::Id)
							.on_delete(ForeignKeyAction::Cascade)
							.on_update(ForeignKeyAction::Cascade),
					)
					.foreign_key(
						ForeignKey::create()
							.name("fk_media_annotations_user_id")
							.from(MediaAnnotations::Table, MediaAnnotations::UserId)
							.to(Users::Table, Users::Id)
							.on_delete(ForeignKeyAction::Cascade)
							.on_update(ForeignKeyAction::Cascade),
					)
					.to_owned(),
			)
			.await?;

		conn.execute(Statement::from_string(
			db_backend,
			r#"insert into "media_annotations"("id", "locator", "annotation_text", "media_id", "user_id", "created_at", "updated_at")
			select
    			"id",
                "locator",
                "annotation_text",
                "media_id",
                "user_id",
                "created_at",
                "updated_at"
			from "media_annotations_legacy""#
				.to_owned(),
		))
		.await?;

		conn.execute(Statement::from_string(
			db_backend,
			r#"drop table "media_annotations_legacy""#.to_owned(),
		))
		.await?;

		conn.execute(Statement::from_string(
			db_backend,
			r#"drop index if exists "idx_media_annotations_user_media""#.to_owned(),
		))
		.await?;

		manager
			.create_index(
				Index::create()
					.name("idx_media_annotations_user_media")
					.table(MediaAnnotations::Table)
					.col(MediaAnnotations::UserId)
					.col(MediaAnnotations::MediaId)
					.to_owned(),
			)
			.await?;

		Ok(())
	}
}

#[derive(DeriveIden)]
enum Bookmarks {
	Table,
	Id,
	PreviewContent,
	Locator,
	Page,
	MediaId,
	UserId,
	CreatedAt,
	SessionId,
}

#[derive(DeriveIden)]
enum MediaAnnotations {
	Table,
	Id,
	Locator,
	AnnotationText,
	MediaId,
	UserId,
	CreatedAt,
	UpdatedAt,
	SessionId,
}

#[derive(DeriveIden)]
enum ReadingSessions {
	Table,
	Id,
}

#[derive(DeriveIden)]
enum Media {
	Table,
	Id,
}

#[derive(DeriveIden)]
enum Users {
	Table,
	Id,
}

#[derive(Debug, Clone, FromQueryResult)]
struct SessionRecord {
	id: i32,
	updated_at: Option<DateTime<Utc>>,
}

#[derive(Debug, Clone, FromQueryResult)]
struct UserPreferencesRecord {
	user_id: String,
	day_reset_hour_offset: Option<i32>,
}

#[derive(Debug, Clone, FromQueryResult)]
struct BookmarkRecord {
	id: String,
	user_id: String,
	media_id: String,
	created_at: DateTime<Utc>,
}

#[derive(Debug, Clone, FromQueryResult)]
struct AnnotationRecord {
	id: String,
	user_id: String,
	media_id: String,
	created_at: DateTime<Utc>,
}

async fn backfill(conn: &impl ConnectionTrait) -> Result<(), DbErr> {
	let backend = conn.get_database_backend();

	let user_preferences_records =
		UserPreferencesRecord::find_by_statement(Statement::from_string(
			backend,
			"select user_id, day_reset_hour_offset from user_preferences",
		))
		.all(conn)
		.await?;

	let offset_by_user_id = user_preferences_records
		.into_iter()
		.map(|r| (r.user_id, r.day_reset_hour_offset.unwrap_or(0)))
		.collect::<HashMap<_, _>>();

	let bookmark_records = BookmarkRecord::find_by_statement(Statement::from_string(
		backend,
		"select id, user_id, media_id, created_at from bookmarks",
	))
	.all(conn)
	.await?;

	let annotation_records = AnnotationRecord::find_by_statement(Statement::from_string(
		backend,
		"select id, user_id, media_id, created_at from media_annotations",
	))
	.all(conn)
	.await?;

	for bookmark in bookmark_records {
		let offset = offset_by_user_id
			.get(&bookmark.user_id)
			.copied()
			.unwrap_or(0);
		let logical_date = calculate_logical_date(bookmark.created_at, offset);

		let candidate_sessions =
			SessionRecord::find_by_statement(Statement::from_sql_and_values(
				backend,
				"select id, updated_at from reading_sessions \
	             where user_id = ? and media_id = ? and session_date = ?",
				vec![
					bookmark.user_id.clone().into(),
					bookmark.media_id.clone().into(),
					logical_date.to_string().into(),
				],
			))
			.all(conn)
			.await?;

		if candidate_sessions.is_empty() {
			tracing::warn!(?bookmark, "No candidate session for bookmark");
			continue;
		}

		let closest_match =
			determine_approximate_session_id(bookmark.created_at, &candidate_sessions);

		if let Some(session_id) = closest_match {
			conn.execute(Statement::from_sql_and_values(
				backend,
				"update bookmarks set session_id = ? where id = ?",
				vec![session_id.into(), bookmark.id.clone().into()],
			))
			.await?;
		} else {
			tracing::warn!(
				?bookmark,
				"Failed to determine closest session for bookmark"
			);
		}
	}

	for annotation in annotation_records {
		let offset = offset_by_user_id
			.get(&annotation.user_id)
			.copied()
			.unwrap_or(0);
		let logical_date = calculate_logical_date(annotation.created_at, offset);

		let candidate_sessions =
			SessionRecord::find_by_statement(Statement::from_sql_and_values(
				backend,
				"select id, updated_at from reading_sessions \
	             where user_id = ? and media_id = ? and session_date = ?",
				vec![
					annotation.user_id.clone().into(),
					annotation.media_id.clone().into(),
					logical_date.to_string().into(),
				],
			))
			.all(conn)
			.await?;

		if candidate_sessions.is_empty() {
			tracing::warn!(?annotation, "No candidate session for annotation");
			continue;
		}

		let closest_match =
			determine_approximate_session_id(annotation.created_at, &candidate_sessions);

		if let Some(session_id) = closest_match {
			conn.execute(Statement::from_sql_and_values(
				backend,
				"update media_annotations set session_id = ? where id = ?",
				vec![session_id.into(), annotation.id.clone().into()],
			))
			.await?;
		} else {
			tracing::warn!(
				?annotation,
				"Failed to determine closest session for annotation"
			);
		}
	}

	Ok(())
}

fn calculate_logical_date(now: DateTime<Utc>, offset_hours: i32) -> NaiveDate {
	(now - Duration::hours(offset_hours as i64)).date_naive()
}

/// Aims to pick the most likely session for a given event based on the time it was
/// created (closest but not after session.updated_at)
fn determine_approximate_session_id(
	event_created_at: DateTime<Utc>,
	candidate_sessions: &[SessionRecord],
) -> Option<i32> {
	let best = candidate_sessions
		.iter()
		.filter_map(|s| {
			let updated_at = s.updated_at?;
			let diff = (updated_at - event_created_at).num_seconds();
			if diff >= 0 {
				Some((diff, s))
			} else {
				None
			}
		})
		.min_by_key(|(diff, _)| *diff)
		.map(|(_, s)| s);

	if let Some(session) = best {
		return Some(session.id);
	}

	candidate_sessions.iter().map(|s| s.id).max()
}

#[cfg(test)]
mod tests {
	use super::*;
	use chrono::TimeZone;
	use sea_orm::{Database, DatabaseConnection, Statement};

	// i hate manually creating these but migrations tests are meant to be isolated so
	// cannot e.g. pull in from fake_data etc
	async fn setup_db() -> DatabaseConnection {
		let db = Database::connect("sqlite::memory:")
			.await
			.expect("should connect to in-memory sqlite");
		let backend = db.get_database_backend();

		// not fully accurate, like user_id fields not fks nor is there a
		// users table, but i think sufficient. better than nothing!
		let stmts = [
			r#"CREATE TABLE user_preferences (
				user_id TEXT NOT NULL PRIMARY KEY,
				day_reset_hour_offset INTEGER
			)"#,
			r#"CREATE TABLE reading_sessions (
				id INTEGER PRIMARY KEY AUTOINCREMENT,
				user_id TEXT NOT NULL,
				media_id TEXT NOT NULL,
				session_date TEXT NOT NULL,
				updated_at DATETIME
			)"#,
			r#"CREATE TABLE bookmarks (
				id TEXT NOT NULL PRIMARY KEY,
				user_id TEXT NOT NULL,
				media_id TEXT NOT NULL,
				created_at DATETIME NOT NULL,
				session_id INTEGER
			)"#,
			r#"CREATE TABLE media_annotations (
				id TEXT NOT NULL PRIMARY KEY,
				user_id TEXT NOT NULL,
				media_id TEXT NOT NULL,
				created_at DATETIME NOT NULL,
				updated_at DATETIME NOT NULL,
				session_id INTEGER
			)"#,
		];

		for stmt in &stmts {
			db.execute(Statement::from_string(backend, ToString::to_string(stmt)))
				.await
				.expect("should create table");
		}

		db
	}

	#[derive(Debug, FromQueryResult)]
	struct SessionIdRow {
		session_id: Option<i32>,
	}

	async fn get_bookmark_session_id(
		db: &DatabaseConnection,
		bookmark_id: &str,
	) -> Option<i32> {
		SessionIdRow::find_by_statement(Statement::from_sql_and_values(
			db.get_database_backend(),
			"select session_id from bookmarks where id = ?",
			vec![bookmark_id.into()],
		))
		.one(db)
		.await
		.expect("query should succeed")
		.expect("bookmark should exist")
		.session_id
	}

	async fn get_annotation_session_id(
		db: &DatabaseConnection,
		annotation_id: &str,
	) -> Option<i32> {
		SessionIdRow::find_by_statement(Statement::from_sql_and_values(
			db.get_database_backend(),
			"select session_id from media_annotations where id = ?",
			vec![annotation_id.into()],
		))
		.one(db)
		.await
		.expect("query should succeed")
		.expect("annotation should exist")
		.session_id
	}

	#[test]
	fn test_picks_closest_session_after_event() {
		let event_at = Utc.with_ymd_and_hms(2026, 10, 3, 10, 0, 0).unwrap();
		let sessions = vec![
			SessionRecord {
				id: 1,
				updated_at: Some(Utc.with_ymd_and_hms(2026, 10, 3, 10, 30, 0).unwrap()),
			},
			SessionRecord {
				id: 2,
				updated_at: Some(Utc.with_ymd_and_hms(2026, 10, 3, 12, 0, 0).unwrap()),
			},
		];
		assert_eq!(
			determine_approximate_session_id(event_at, &sessions),
			Some(1)
		);
	}

	#[test]
	fn test_falls_back_to_max_id_when_all_sessions_precede_event() {
		let event_at = Utc.with_ymd_and_hms(2026, 10, 3, 14, 0, 0).unwrap();
		let sessions = vec![
			SessionRecord {
				id: 1,
				updated_at: Some(Utc.with_ymd_and_hms(2026, 10, 3, 10, 0, 0).unwrap()),
			},
			SessionRecord {
				id: 3,
				updated_at: Some(Utc.with_ymd_and_hms(2026, 10, 3, 11, 0, 0).unwrap()),
			},
			SessionRecord {
				id: 2,
				updated_at: Some(Utc.with_ymd_and_hms(2026, 10, 3, 12, 0, 0).unwrap()),
			},
		];
		assert_eq!(
			determine_approximate_session_id(event_at, &sessions),
			Some(3)
		);
	}

	#[test]
	fn test_falls_back_to_max_id_when_updated_at_is_null() {
		let event_at = Utc.with_ymd_and_hms(2026, 10, 3, 10, 0, 0).unwrap();
		let sessions = vec![
			SessionRecord {
				id: 2,
				updated_at: None,
			},
			SessionRecord {
				id: 5,
				updated_at: None,
			},
			SessionRecord {
				id: 3,
				updated_at: None,
			},
		];
		assert_eq!(
			determine_approximate_session_id(event_at, &sessions),
			Some(5)
		);
	}

	#[tokio::test]
	async fn test_backfill_assigns_session_to_bookmark() {
		let db = setup_db().await;
		let backend = db.get_database_backend();

		db.execute(Statement::from_sql_and_values(
			backend,
			"insert into reading_sessions (user_id, media_id, session_date, updated_at) values (?, ?, ?, ?)",
			vec!["user-1".into(), "media-1".into(), "2026-10-03".into(), "2026-10-03 12:00:00".into()],
		))
		.await
		.expect("should insert reading session");

		db.execute(Statement::from_sql_and_values(
			backend,
			"insert into bookmarks (id, user_id, media_id, created_at) values (?, ?, ?, ?)",
			vec!["bm-1".into(), "user-1".into(), "media-1".into(), "2026-10-03 11:30:00".into()],
		))
		.await
		.expect("should insert reading session");

		backfill(&db).await.expect("backfill should succeed");

		assert!(get_bookmark_session_id(&db, "bm-1").await.is_some());
	}

	#[tokio::test]
	async fn test_backfill_assigns_session_to_annotation() {
		let db = setup_db().await;
		let backend = db.get_database_backend();

		db.execute(Statement::from_sql_and_values(
			backend,
			"insert into reading_sessions (user_id, media_id, session_date, updated_at) values (?, ?, ?, ?)",
			vec!["user-1".into(), "media-1".into(), "2026-10-03".into(), "2026-10-03 15:00:00".into()],
		))
		.await
		.expect("should insert reading session");

		db.execute(Statement::from_sql_and_values(
			backend,
			"insert into media_annotations (id, user_id, media_id, created_at, updated_at) values (?, ?, ?, ?, ?)",
			vec!["ann-1".into(), "user-1".into(), "media-1".into(), "2026-10-03 14:00:00".into(), "2026-10-03 14:00:00".into()],
		))
		.await
		.expect("should insert annotation");

		backfill(&db).await.expect("backfill should succeed");

		assert!(get_annotation_session_id(&db, "ann-1").await.is_some());
	}

	/// when multiple sessions are on the same day it should link whichever is closest but not before
	/// the bookmark's created_at stamp
	#[tokio::test]
	async fn test_backfill_picks_closest_session_for_bookmark() {
		let db = setup_db().await;
		let backend = db.get_database_backend();

		for updated_at in [
			"2026-10-03 10:30:00", // ends at 10:30
			"2026-10-03 14:00:00", // ends at 2:30
		] {
			db.execute(Statement::from_sql_and_values(
				backend,
				"insert into reading_sessions (user_id, media_id, session_date, updated_at) values (?, ?, ?, ?)",
				vec!["user-1".into(), "media-1".into(), "2026-10-03".into(), updated_at.into()],
			))
			.await
			.expect("should insert reading session");
		}

		db.execute(Statement::from_sql_and_values(
			backend,
			"insert into bookmarks (id, user_id, media_id, created_at) values (?, ?, ?, ?)",
			vec!["bm-1".into(), "user-1".into(), "media-1".into(), "2026-10-03 10:00:00".into()],
		))
		.await
		.expect("should insert bookmark");
		// ^ bookmarked at 10 so should match with 10:30

		backfill(&db).await.expect("backfill should succeed");

		assert_eq!(get_bookmark_session_id(&db, "bm-1").await, Some(1));
	}

	#[tokio::test]
	async fn test_backfill_leaves_session_null_when_no_session_exists() {
		let db = setup_db().await;
		let backend = db.get_database_backend();

		db.execute(Statement::from_sql_and_values(
			backend,
			"insert into bookmarks (id, user_id, media_id, created_at) values (?, ?, ?, ?)",
			vec!["bm-1".into(), "user-1".into(), "media-1".into(), "2026-10-03 10:00:00".into()],
		))
		.await
		.expect("should insert bookmark");

		backfill(&db).await.expect("backfill should succeed");

		assert_eq!(get_bookmark_session_id(&db, "bm-1").await, None);
	}

	/// non-zero offset will shift when the logical date starts/ends and so the linkage needs to
	/// account for and respect that
	#[tokio::test]
	async fn test_backfill_respects_day_reset_hour_offset() {
		let db = setup_db().await;
		let backend = db.get_database_backend();

		db.execute(Statement::from_sql_and_values(
			backend,
			"insert into user_preferences (user_id, day_reset_hour_offset) values (?, ?)",
			vec!["user-1".into(), 4.into()], // offset=4 -> logical day starts at 4am
		))
		.await
		.expect("should insert user preferences");

		db.execute(Statement::from_sql_and_values(
			backend,
			"insert into reading_sessions (user_id, media_id, session_date, updated_at) values (?, ?, ?, ?)",
			vec!["user-1".into(), "media-1".into(), "2026-10-02".into(), "2026-10-03 03:00:00".into()],
		))
		.await
		.expect("should insert reading session");
		// ^ session is on 2nd and ends at 3am, thus is still part of 2nd logical day

		db.execute(Statement::from_sql_and_values(
			backend,
			"insert into bookmarks (id, user_id, media_id, created_at) values (?, ?, ?, ?)",
			vec!["bm-1".into(), "user-1".into(), "media-1".into(), "2026-10-03 01:00:00".into()],
		))
		.await
		.expect("should insert bookmark");

		backfill(&db).await.expect("backfill should succeed");

		assert!(get_bookmark_session_id(&db, "bm-1").await.is_some());
	}
}

use sea_orm::{DbBackend, Statement, TransactionTrait};
use sea_orm_migration::prelude::*;

#[derive(DeriveMigrationName)]
pub struct Migration;

#[async_trait::async_trait]
impl MigrationTrait for Migration {
	async fn up(&self, manager: &SchemaManager) -> Result<(), DbErr> {
		let conn = manager.get_connection();
		let backend = conn.get_database_backend();
		let txn = conn.begin().await?;
		let orphans = txn
			.query_all(Statement::from_string(
				backend,
				"SELECT media.id FROM media
				 LEFT JOIN series ON series.id = media.series_id
				 LEFT JOIN libraries ON libraries.id = series.library_id
				 WHERE libraries.id IS NULL ORDER BY media.id",
			))
			.await?
			.iter()
			.map(|orphan| orphan.try_get::<String>("", "id"))
			.collect::<Result<Vec<_>, _>>()?;
		if !orphans.is_empty() {
			return Err(DbErr::Custom(format!(
				"Cannot backfill library ownership for books {}: repair their series/library relations before retrying migration",
				orphans.join(", "),
			)));
		}

		let add_column = match backend {
			DbBackend::Sqlite => "ALTER TABLE media ADD COLUMN library_id TEXT REFERENCES libraries(id) ON DELETE CASCADE ON UPDATE CASCADE",
			DbBackend::Postgres => "ALTER TABLE media ADD COLUMN library_id TEXT CONSTRAINT fk_media_library REFERENCES libraries(id) ON DELETE CASCADE ON UPDATE CASCADE",
			_ => return Err(DbErr::Custom("Unsupported database backend".into())),
		};
		txn.execute(Statement::from_string(backend, add_column))
			.await?;
		txn.execute(Statement::from_string(
			backend,
			"UPDATE media SET library_id = (SELECT library_id FROM series WHERE series.id = media.series_id)",
		))
		.await?;
		txn.execute(Statement::from_string(
			backend,
			"CREATE INDEX idx_media_library_id ON media(library_id)",
		))
		.await?;

		match backend {
			DbBackend::Postgres => {
				for sql in [
					"ALTER TABLE media ALTER COLUMN library_id SET NOT NULL",
					"CREATE UNIQUE INDEX idx_series_id_library_id ON series(id, library_id)",
					"ALTER TABLE media ADD CONSTRAINT fk_media_series_library FOREIGN KEY (series_id, library_id) REFERENCES series(id, library_id)",
				] {
					txn.execute(Statement::from_string(backend, sql)).await?;
				}
			},
			DbBackend::Sqlite => {
				for (name, event, cascade_guard) in [
					("insert", "INSERT", ""),
					("update", "UPDATE OF library_id, series_id",
					 "AND EXISTS (SELECT 1 FROM libraries WHERE id = OLD.library_id)"),
				] {
					txn.execute(Statement::from_string(backend, format!(
						"CREATE TRIGGER media_library_{name} BEFORE {event} ON media
						 WHEN NEW.library_id IS NULL OR
						 (NEW.series_id IS NOT NULL {cascade_guard} AND NOT EXISTS
						  (SELECT 1 FROM series WHERE id = NEW.series_id AND library_id = NEW.library_id))
						 BEGIN SELECT RAISE(ABORT, 'Book must belong to a library and its series must belong to that library'); END",
					))).await?;
				}
				txn.execute(Statement::from_string(
					backend,
					"CREATE TRIGGER series_media_library_update BEFORE UPDATE OF library_id ON series
					 WHEN EXISTS (SELECT 1 FROM libraries WHERE id = OLD.library_id)
					 AND EXISTS (SELECT 1 FROM media WHERE series_id = OLD.id
					 AND (NEW.library_id IS NULL OR library_id != NEW.library_id))
					 BEGIN SELECT RAISE(ABORT, 'Series and its books must belong to the same library'); END",
				)).await?;
			},
			_ => unreachable!(),
		}
		txn.commit().await
	}

	async fn down(&self, manager: &SchemaManager) -> Result<(), DbErr> {
		let conn = manager.get_connection();
		let backend = conn.get_database_backend();
		let txn = conn.begin().await?;
		if txn
			.query_one(Statement::from_string(
				backend,
				"SELECT id FROM media WHERE series_id IS NULL LIMIT 1",
			))
			.await?
			.is_some()
		{
			return Err(DbErr::Custom(
				"Cannot remove direct library ownership while standalone books exist"
					.into(),
			));
		}
		match backend {
			DbBackend::Sqlite => {
				for sql in [
					"DROP TRIGGER media_library_insert",
					"DROP TRIGGER media_library_update",
					"DROP TRIGGER series_media_library_update",
				] {
					txn.execute(Statement::from_string(backend, sql)).await?;
				}
			},
			DbBackend::Postgres => {
				for sql in [
					"ALTER TABLE media DROP CONSTRAINT fk_media_series_library",
					"DROP INDEX idx_series_id_library_id",
				] {
					txn.execute(Statement::from_string(backend, sql)).await?;
				}
			},
			_ => return Err(DbErr::Custom("Unsupported database backend".into())),
		}
		txn.execute(Statement::from_string(
			backend,
			"DROP INDEX idx_media_library_id",
		))
		.await?;
		txn.execute(Statement::from_string(
			backend,
			"ALTER TABLE media DROP COLUMN library_id",
		))
		.await?;
		txn.commit().await
	}
}

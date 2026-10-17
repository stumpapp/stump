use sea_orm::{DatabaseTransaction, DbBackend, Statement, TransactionTrait};
use sea_orm_migration::prelude::*;

#[derive(DeriveMigrationName)]
pub struct Migration;

#[async_trait::async_trait]
impl MigrationTrait for Migration {
	async fn up(&self, manager: &SchemaManager) -> Result<(), DbErr> {
		let conn = manager.get_connection();
		let backend = conn.get_database_backend();
		let txn = conn.begin().await?;
		match backend {
			DbBackend::Sqlite => set_sqlite_path_nullable(&txn, true).await?,
			DbBackend::Postgres => {
				txn.execute_unprepared(
					"ALTER TABLE series ALTER COLUMN path DROP NOT NULL",
				)
				.await?;
			},
			_ => return Err(DbErr::Custom("Unsupported database backend".into())),
		}
		txn.execute_unprepared(
			"ALTER TABLE series ADD COLUMN kind TEXT NOT NULL DEFAULT 'FILESYSTEM'
			 CHECK ((kind = 'FILESYSTEM' AND path IS NOT NULL) OR
			        (kind = 'VIRTUAL' AND path IS NULL AND library_id IS NOT NULL AND is_oneshot = FALSE))",
		).await?;
		txn.execute_unprepared(
			"CREATE UNIQUE INDEX idx_virtual_series_library_name ON series(library_id, name) WHERE kind = 'VIRTUAL'",
		).await?;
		txn.commit().await
	}

	async fn down(&self, manager: &SchemaManager) -> Result<(), DbErr> {
		let conn = manager.get_connection();
		let backend = conn.get_database_backend();
		let txn = conn.begin().await?;
		if txn
			.query_one(Statement::from_string(
				backend,
				"SELECT id FROM series WHERE kind = 'VIRTUAL' LIMIT 1",
			))
			.await?
			.is_some()
		{
			return Err(DbErr::Custom(
				"Cannot remove virtual series support while virtual series exist".into(),
			));
		}
		txn.execute_unprepared("DROP INDEX idx_virtual_series_library_name")
			.await?;
		txn.execute_unprepared("ALTER TABLE series DROP COLUMN kind")
			.await?;
		match backend {
			DbBackend::Sqlite => set_sqlite_path_nullable(&txn, false).await?,
			DbBackend::Postgres => {
				txn.execute_unprepared(
					"ALTER TABLE series ALTER COLUMN path SET NOT NULL",
				)
				.await?;
			},
			_ => return Err(DbErr::Custom("Unsupported database backend".into())),
		}
		txn.commit().await
	}
}

async fn set_sqlite_path_nullable(
	txn: &DatabaseTransaction,
	nullable: bool,
) -> Result<(), DbErr> {
	let mut schema = txn
		.query_one(Statement::from_string(
			DbBackend::Sqlite,
			"SELECT sql FROM sqlite_schema WHERE type = 'table' AND name = 'series'",
		))
		.await?
		.ok_or_else(|| DbErr::Custom("Series table is missing".into()))?
		.try_get::<String>("", "sql")?;
	let (from, to) = if nullable {
		("\"path\" text not null,", "\"path\" text,")
	} else {
		("\"path\" text,", "\"path\" text NOT NULL,")
	};
	let positions: Vec<_> = schema
		.to_ascii_lowercase()
		.match_indices(from)
		.map(|(index, _)| index)
		.collect();
	let [position] = positions.as_slice() else {
		return Err(DbErr::Custom(
			"Unexpected series path definition; refusing to change the schema".into(),
		));
	};
	schema.replace_range(*position..*position + from.len(), to);
	let version = txn
		.query_one(Statement::from_string(
			DbBackend::Sqlite,
			"PRAGMA schema_version",
		))
		.await?
		.ok_or_else(|| DbErr::Custom("Schema version is missing".into()))?
		.try_get_by_index::<i64>(0)?;
	txn.execute_unprepared("PRAGMA writable_schema=ON").await?;
	let result =
		async {
			txn.execute(Statement::from_sql_and_values(DbBackend::Sqlite,
			"UPDATE sqlite_schema SET sql = ? WHERE type = 'table' AND name = 'series'",
			[schema.into()],
		)).await?;
			txn.execute_unprepared(&format!("PRAGMA schema_version={}", version + 1))
				.await?;
			Ok::<_, DbErr>(())
		}
		.await;
	let reset = txn.execute_unprepared("PRAGMA writable_schema=OFF").await;
	result?;
	reset?;
	let integrity = txn
		.query_one(Statement::from_string(
			DbBackend::Sqlite,
			"PRAGMA integrity_check",
		))
		.await?
		.ok_or_else(|| DbErr::Custom("Schema integrity result is missing".into()))?
		.try_get_by_index::<String>(0)?;
	if integrity != "ok" {
		return Err(DbErr::Custom(format!(
			"Series schema integrity check failed: {integrity}"
		)));
	}
	Ok(())
}

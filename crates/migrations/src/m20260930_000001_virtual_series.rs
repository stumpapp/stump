use sea_orm::{Statement, TransactionTrait};
use sea_orm_migration::prelude::*;

#[derive(DeriveMigrationName)]
pub struct Migration;

#[async_trait::async_trait]
impl MigrationTrait for Migration {
	async fn up(&self, manager: &SchemaManager) -> Result<(), DbErr> {
		let conn = manager.get_connection();
		let txn = conn.begin().await?;
		txn.execute_unprepared("ALTER TABLE series ALTER COLUMN path DROP NOT NULL")
			.await?;
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
			.query_one_raw(Statement::from_string(
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
		txn.execute_unprepared("ALTER TABLE series ALTER COLUMN path SET NOT NULL")
			.await?;
		txn.commit().await
	}
}

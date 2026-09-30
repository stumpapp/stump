use sea_orm::{Statement, TransactionTrait};
use sea_orm_migration::prelude::*;

#[derive(DeriveMigrationName)]
pub struct Migration;

#[async_trait::async_trait]
impl MigrationTrait for Migration {
	async fn up(&self, manager: &SchemaManager) -> Result<(), DbErr> {
		manager.get_connection().execute_unprepared(
			"ALTER TABLE library_configs ADD COLUMN organization_mode TEXT NOT NULL DEFAULT 'FILESYSTEM'
			 CHECK (organization_mode IN ('FILESYSTEM', 'METADATA'))"
		).await?;
		Ok(())
	}

	async fn down(&self, manager: &SchemaManager) -> Result<(), DbErr> {
		let txn = manager.get_connection().begin().await?;
		if txn.query_one(Statement::from_string(txn.get_database_backend(),
			"SELECT id FROM library_configs WHERE organization_mode = 'METADATA' LIMIT 1"
		)).await?.is_some() {
			return Err(DbErr::Custom("Cannot remove organization mode while metadata libraries exist".into()));
		}
		txn.execute_unprepared(
			"ALTER TABLE library_configs DROP COLUMN organization_mode",
		)
		.await?;
		txn.commit().await
	}
}

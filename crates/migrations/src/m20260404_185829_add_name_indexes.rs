use sea_orm_migration::prelude::*;
use sea_orm_migration::sea_orm::Statement;

#[derive(DeriveMigrationName)]
pub struct Migration;

#[async_trait::async_trait]
impl MigrationTrait for Migration {
	async fn up(&self, manager: &SchemaManager) -> Result<(), DbErr> {
		let db = manager.get_connection();

		db.execute(Statement::from_string(
			db.get_database_backend(),
			"CREATE INDEX IF NOT EXISTS idx_media_name_active ON media(name) WHERE deleted_at IS NULL".to_string(),
		))
		.await?;

		db.execute(Statement::from_string(
			db.get_database_backend(),
			"CREATE INDEX IF NOT EXISTS idx_series_name_active ON series(name) WHERE deleted_at IS NULL".to_string(),
		))
		.await?;

		Ok(())
	}

	async fn down(&self, manager: &SchemaManager) -> Result<(), DbErr> {
		let db = manager.get_connection();

		db.execute(Statement::from_string(
			db.get_database_backend(),
			"DROP INDEX IF EXISTS idx_media_name_active".to_string(),
		))
		.await?;

		db.execute(Statement::from_string(
			db.get_database_backend(),
			"DROP INDEX IF EXISTS idx_series_name_active".to_string(),
		))
		.await?;

		Ok(())
	}
}

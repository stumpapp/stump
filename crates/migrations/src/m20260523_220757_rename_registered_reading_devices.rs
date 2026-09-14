use sea_orm::Statement;
use sea_orm_migration::prelude::*;

#[derive(DeriveMigrationName)]
pub struct Migration;

#[async_trait::async_trait]
impl MigrationTrait for Migration {
	async fn up(&self, manager: &SchemaManager) -> Result<(), DbErr> {
		let conn = manager.get_connection();

		conn.execute(Statement::from_string(
			conn.get_database_backend(),
			"ALTER TABLE registered_reading_devices RENAME TO reading_devices"
				.to_string(),
		))
		.await?;

		// we also added a new (optional) email column
		manager
			.alter_table(
				Table::alter()
					.table(ReadingDevices::Table)
					.add_column(ColumnDef::new(ReadingDevices::Email).text())
					.to_owned(),
			)
			.await?;

		Ok(())
	}

	async fn down(&self, manager: &SchemaManager) -> Result<(), DbErr> {
		let conn = manager.get_connection();

		// drop the new email column
		manager
			.alter_table(
				Table::alter()
					.table(ReadingDevices::Table)
					.drop_column(ReadingDevices::Email)
					.to_owned(),
			)
			.await?;

		// rename the table back to registered_reading_devices
		conn.execute(Statement::from_string(
			conn.get_database_backend(),
			"ALTER TABLE reading_devices RENAME TO registered_reading_devices"
				.to_string(),
		))
		.await?;

		Ok(())
	}
}

#[derive(DeriveIden)]
enum ReadingDevices {
	Table,
	Email,
}

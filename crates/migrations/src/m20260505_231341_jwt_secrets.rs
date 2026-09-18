use sea_orm_migration::prelude::*;

#[derive(DeriveMigrationName)]
pub struct Migration;

#[async_trait::async_trait]
impl MigrationTrait for Migration {
	async fn up(&self, manager: &SchemaManager) -> Result<(), DbErr> {
		manager
			.alter_table(
				Table::alter()
					.table(ServerConfig::Table)
					.add_column(ColumnDef::new(ServerConfig::JwtAccessSecret).text())
					.to_owned(),
			)
			.await?;

		manager
			.alter_table(
				Table::alter()
					.table(ServerConfig::Table)
					.add_column(ColumnDef::new(ServerConfig::JwtRefreshSecret).text())
					.to_owned(),
			)
			.await?;

		Ok(())
	}

	async fn down(&self, manager: &SchemaManager) -> Result<(), DbErr> {
		manager
			.alter_table(
				Table::alter()
					.table(ServerConfig::Table)
					.drop_column(ServerConfig::JwtAccessSecret)
					.to_owned(),
			)
			.await?;

		manager
			.alter_table(
				Table::alter()
					.table(ServerConfig::Table)
					.drop_column(ServerConfig::JwtRefreshSecret)
					.to_owned(),
			)
			.await?;

		Ok(())
	}
}

#[derive(DeriveIden)]
enum ServerConfig {
	Table,
	JwtAccessSecret,
	JwtRefreshSecret,
}

use sea_orm_migration::prelude::*;

#[derive(DeriveMigrationName)]
pub struct Migration;

#[async_trait::async_trait]
impl MigrationTrait for Migration {
	async fn up(&self, manager: &SchemaManager) -> Result<(), DbErr> {
		manager
			.alter_table(
				Table::alter()
					.table(UserPreferences::Table)
					.add_column(
						ColumnDef::new(UserPreferences::ThumbnailRoundness)
							.string()
							.not_null()
							.default("NORMAL"),
					)
					.to_owned(),
			)
			.await?;

		Ok(())
	}

	async fn down(&self, manager: &SchemaManager) -> Result<(), DbErr> {
		manager
			.alter_table(
				Table::alter()
					.table(UserPreferences::Table)
					.drop_column(UserPreferences::ThumbnailRoundness)
					.to_owned(),
			)
			.await?;

		Ok(())
	}
}

#[derive(DeriveIden)]
enum UserPreferences {
	Table,
	ThumbnailRoundness,
}

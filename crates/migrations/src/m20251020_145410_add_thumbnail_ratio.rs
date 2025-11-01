use sea_orm_migration::prelude::*;

#[derive(DeriveMigrationName)]
pub struct Migration;

#[async_trait::async_trait]
impl MigrationTrait for Migration {
	async fn up(&self, manager: &SchemaManager) -> Result<(), DbErr> {
		// Add thumbnail_ratio column
		manager
			.alter_table(
				Table::alter()
					.table(UserPreferences::Table)
					.add_column(
						ColumnDef::new(UserPreferences::ThumbnailRatio)
							.float()
							.not_null()
							.default(1.0 / 1.5),
					)
					.to_owned(),
			)
			.await?;

		Ok(())
	}

	async fn down(&self, manager: &SchemaManager) -> Result<(), DbErr> {
		// Drop thumbnail_ratio column
		manager
			.alter_table(
				Table::alter()
					.table(UserPreferences::Table)
					.drop_column(UserPreferences::ThumbnailRatio)
					.to_owned(),
			)
			.await?;

		Ok(())
	}
}

#[derive(DeriveIden)]
enum UserPreferences {
	Table,
	ThumbnailRatio,
}

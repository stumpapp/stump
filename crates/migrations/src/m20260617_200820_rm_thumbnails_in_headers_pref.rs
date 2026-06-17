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
					.drop_column(UserPreferences::ShowThumbnailsInHeaders)
					.to_owned(),
			)
			.await
	}

	async fn down(&self, manager: &SchemaManager) -> Result<(), DbErr> {
		manager
			.alter_table(
				Table::alter()
					.table(UserPreferences::Table)
					.add_column(
						ColumnDef::new(UserPreferences::ShowThumbnailsInHeaders)
							.boolean()
							.not_null()
							.default(false),
					)
					.to_owned(),
			)
			.await
	}
}

#[derive(DeriveIden)]
enum UserPreferences {
	Table,
	ShowThumbnailsInHeaders,
}

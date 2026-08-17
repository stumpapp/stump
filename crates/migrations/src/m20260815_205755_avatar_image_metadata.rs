use sea_orm_migration::prelude::*;

#[derive(DeriveMigrationName)]
pub struct Migration;

#[async_trait::async_trait]
impl MigrationTrait for Migration {
	async fn up(&self, manager: &SchemaManager) -> Result<(), DbErr> {
		manager
			.alter_table(
				Table::alter()
					.table(Users::Table)
					.add_column_if_not_exists(
						ColumnDef::new(Users::AvatarMeta).json().null(),
					)
					.to_owned(),
			)
			.await?;

		manager
			.alter_table(
				Table::alter()
					.table(Users::Table)
					.add_column_if_not_exists(
						ColumnDef::new(Users::AvatarUpdatedAt).timestamp_with_time_zone(),
					)
					.to_owned(),
			)
			.await?;

		// TODO: backfill those with existing as avatar_updated_at = now so we sync on app correctly

		Ok(())
	}

	async fn down(&self, manager: &SchemaManager) -> Result<(), DbErr> {
		manager
			.alter_table(
				Table::alter()
					.table(Users::Table)
					.drop_column(Users::AvatarMeta)
					.to_owned(),
			)
			.await?;

		manager
			.alter_table(
				Table::alter()
					.table(Users::Table)
					.drop_column(Users::AvatarUpdatedAt)
					.to_owned(),
			)
			.await?;

		Ok(())
	}
}

#[derive(DeriveIden)]
enum Users {
	Table,
	AvatarMeta,
	AvatarUpdatedAt,
}

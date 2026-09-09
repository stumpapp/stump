use sea_orm_migration::prelude::*;

#[derive(DeriveMigrationName)]
pub struct Migration;

#[async_trait::async_trait]
impl MigrationTrait for Migration {
	async fn up(&self, manager: &SchemaManager) -> Result<(), DbErr> {
		manager
			.alter_table(
				Table::alter()
					.table(Media::Table)
					.add_column(
						ColumnDef::new(Media::IsOneshot)
							.boolean()
							.not_null()
							.default(false),
					)
					.to_owned(),
			)
			.await?;

		manager
			.alter_table(
				Table::alter()
					.table(Series::Table)
					.add_column(
						ColumnDef::new(Series::IsOneshot)
							.boolean()
							.not_null()
							.default(false),
					)
					.to_owned(),
			)
			.await?;

		manager
			.alter_table(
				Table::alter()
					.table(LibraryConfigs::Table)
					.add_column(
						ColumnDef::new(LibraryConfigs::OneshotsDirectory).string(),
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
					.table(Media::Table)
					.drop_column(Media::IsOneshot)
					.to_owned(),
			)
			.await?;

		manager
			.alter_table(
				Table::alter()
					.table(Series::Table)
					.drop_column(Series::IsOneshot)
					.to_owned(),
			)
			.await?;

		manager
			.alter_table(
				Table::alter()
					.table(LibraryConfigs::Table)
					.drop_column(LibraryConfigs::OneshotsDirectory)
					.to_owned(),
			)
			.await?;

		Ok(())
	}
}

#[derive(DeriveIden)]
enum Media {
	Table,
	IsOneshot,
}

#[derive(DeriveIden)]
enum Series {
	Table,
	IsOneshot,
}

#[derive(DeriveIden)]
enum LibraryConfigs {
	Table,
	OneshotsDirectory,
}

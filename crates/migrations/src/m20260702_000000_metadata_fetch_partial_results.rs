use sea_orm_migration::prelude::*;

#[derive(DeriveMigrationName)]
pub struct Migration;

#[async_trait::async_trait]
impl MigrationTrait for Migration {
	async fn up(&self, manager: &SchemaManager) -> Result<(), DbErr> {
		manager
			.alter_table(
				Table::alter()
					.table(MetadataFetchRecords::Table)
					.add_column(
						ColumnDef::new(MetadataFetchRecords::HadPartialResults)
							.boolean()
							.not_null()
							.default(false),
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
					.table(MetadataFetchRecords::Table)
					.drop_column(MetadataFetchRecords::HadPartialResults)
					.to_owned(),
			)
			.await?;

		Ok(())
	}
}

#[derive(DeriveIden)]
enum MetadataFetchRecords {
	Table,
	HadPartialResults,
}

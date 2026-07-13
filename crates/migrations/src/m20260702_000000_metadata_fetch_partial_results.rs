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
						ColumnDef::new(MetadataFetchRecords::RawHits)
							.integer()
							.not_null()
							.default(0),
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
					.drop_column(MetadataFetchRecords::RawHits)
					.to_owned(),
			)
			.await?;

		Ok(())
	}
}

#[derive(DeriveIden)]
enum MetadataFetchRecords {
	Table,
	RawHits,
}

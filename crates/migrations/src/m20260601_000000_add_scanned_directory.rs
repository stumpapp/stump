use sea_orm_migration::prelude::*;

#[derive(DeriveMigrationName)]
pub struct Migration;

#[async_trait::async_trait]
impl MigrationTrait for Migration {
	async fn up(&self, manager: &SchemaManager) -> Result<(), DbErr> {
		manager
			.create_table(
				Table::create()
					.table(ScannedDirectory::Table)
					.if_not_exists()
					.col(
						ColumnDef::new(ScannedDirectory::Path)
							.text()
							.not_null()
							.primary_key(),
					)
					.col(
						ColumnDef::new(ScannedDirectory::LastMtime)
							.big_integer()
							.not_null(),
					)
					.to_owned(),
			)
			.await?;

		Ok(())
	}

	async fn down(&self, manager: &SchemaManager) -> Result<(), DbErr> {
		manager
			.drop_table(Table::drop().table(ScannedDirectory::Table).to_owned())
			.await?;

		Ok(())
	}
}

#[derive(DeriveIden)]
enum ScannedDirectory {
	#[sea_orm(iden = "scanned_directories")]
	Table,
	Path,
	LastMtime,
}

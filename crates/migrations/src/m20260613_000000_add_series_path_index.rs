use sea_orm_migration::prelude::*;

#[derive(DeriveMigrationName)]
pub struct Migration;

#[async_trait::async_trait]
impl MigrationTrait for Migration {
	async fn up(&self, manager: &SchemaManager) -> Result<(), DbErr> {
		manager
			.create_index(
				Index::create()
					.name("idx_series_path")
					.table(Series::Table)
					.col(Series::Path)
					.if_not_exists()
					.to_owned(),
			)
			.await
	}

	async fn down(&self, manager: &SchemaManager) -> Result<(), DbErr> {
		manager
			.drop_index(
				Index::drop()
					.name("idx_series_path")
					.table(Series::Table)
					.to_owned(),
			)
			.await
	}
}

#[derive(Iden)]
enum Series {
	Table,
	Path,
}

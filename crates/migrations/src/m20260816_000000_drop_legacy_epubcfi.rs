use sea_orm_migration::prelude::*;

#[derive(DeriveMigrationName)]
pub struct Migration;

#[async_trait::async_trait]
impl MigrationTrait for Migration {
	async fn up(&self, manager: &SchemaManager) -> Result<(), DbErr> {
		manager
			.alter_table(
				Table::alter()
					.table(Bookmarks::Table)
					.drop_column(Bookmarks::Epubcfi)
					.to_owned(),
			)
			.await?;
		manager
			.alter_table(
				Table::alter()
					.table(ReadingSessions::Table)
					.drop_column(ReadingSessions::Epubcfi)
					.to_owned(),
			)
			.await?;

		Ok(())
	}

	async fn down(&self, manager: &SchemaManager) -> Result<(), DbErr> {
		manager
			.alter_table(
				Table::alter()
					.table(Bookmarks::Table)
					.add_column(ColumnDef::new(Bookmarks::Epubcfi).text())
					.to_owned(),
			)
			.await?;
		manager
			.alter_table(
				Table::alter()
					.table(ReadingSessions::Table)
					.add_column(ColumnDef::new(ReadingSessions::Epubcfi).text())
					.to_owned(),
			)
			.await?;

		Ok(())
	}
}

#[derive(DeriveIden)]
enum Bookmarks {
	Table,
	Epubcfi,
}

#[derive(DeriveIden)]
enum ReadingSessions {
	Table,
	Epubcfi,
}

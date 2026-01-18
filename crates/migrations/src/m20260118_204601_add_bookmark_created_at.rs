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
					.add_column(
						ColumnDef::new(Bookmarks::CreatedAt)
							.timestamp()
							.not_null()
							.default(Expr::current_timestamp()),
					)
					.to_owned(),
			)
			.await
	}

	async fn down(&self, manager: &SchemaManager) -> Result<(), DbErr> {
		manager
			.alter_table(
				Table::alter()
					.table(Bookmarks::Table)
					.drop_column(Bookmarks::CreatedAt)
					.to_owned(),
			)
			.await
	}
}

#[derive(DeriveIden)]
enum Bookmarks {
	Table,
	CreatedAt,
}

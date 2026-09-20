use sea_orm_migration::prelude::*;

pub struct Migration;

impl MigrationName for Migration {
	fn name(&self) -> &str {
		"m20260920_000000_drop_server_owner"
	}
}

#[async_trait::async_trait]
impl MigrationTrait for Migration {
	async fn up(&self, manager: &SchemaManager) -> Result<(), DbErr> {
		manager
			.alter_table(
				Table::alter()
					.table(Users::Table)
					.drop_column(Users::IsServerOwner)
					.to_owned(),
			)
			.await
	}

	async fn down(&self, manager: &SchemaManager) -> Result<(), DbErr> {
		manager
			.alter_table(
				Table::alter()
					.table(Users::Table)
					.add_column(
						ColumnDef::new(Users::IsServerOwner)
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
enum Users {
	Table,
	IsServerOwner,
}

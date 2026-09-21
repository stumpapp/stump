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
					.drop_column(Users::IsServerOwner)
					.to_owned(),
			)
			.await
		// TODO(permissions): we need to give the server owner manage server permissions
		// as part of backfill
	}

	// Note: the down is non-recoverable wrt the server owner permission assignment, since
	// we aren't tracking who was the server owner at time of up. It's fine, the CLI can
	// be used to assign perms if needed
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

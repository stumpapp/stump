use sea_orm_migration::prelude::*;

#[derive(DeriveMigrationName)]
pub struct Migration;

#[async_trait::async_trait]
impl MigrationTrait for Migration {
	async fn up(&self, manager: &SchemaManager) -> Result<(), DbErr> {
		let permissions = vec!["MANAGE_SERVER"].join(",");
		let update_statement = Query::update()
			.table(Users::Table)
			.value(Users::Permissions, Expr::value(Some(permissions)))
			.and_where(Expr::col(Users::IsServerOwner).eq(true))
			// ^ to date, server owners had "no" permissions and the flag simply
			// gave them implicit access to everything. now, we are giving them one
			// explicit permission which should be sufficient
			.to_owned();
		manager
			.get_connection()
			.execute(manager.get_database_backend().build(&update_statement))
			.await?;

		manager
			.alter_table(
				Table::alter()
					.table(Users::Table)
					.drop_column(Users::IsServerOwner)
					.to_owned(),
			)
			.await
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
	Permissions,
}

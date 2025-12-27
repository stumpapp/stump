use sea_orm_migration::prelude::*;

#[derive(DeriveMigrationName)]
pub struct Migration;

#[async_trait::async_trait]
impl MigrationTrait for Migration {
	async fn up(&self, manager: &SchemaManager) -> Result<(), DbErr> {
		// Add OIDC issuer ID column (unique identifier from OIDC provider)
		manager
			.alter_table(
				Table::alter()
					.table(Users::Table)
					.add_column(ColumnDef::new(Users::OidcIssuerId).string().null())
					.to_owned(),
			)
			.await?;

		// Add OIDC email column
		manager
			.alter_table(
				Table::alter()
					.table(Users::Table)
					.add_column(ColumnDef::new(Users::OidcEmail).string().null())
					.to_owned(),
			)
			.await?;

		// Create unique index for OIDC issuer ID lookup
		manager
			.create_index(
				Index::create()
					.name("idx_users_oidc_issuer_id")
					.table(Users::Table)
					.col(Users::OidcIssuerId)
					.unique()
					.to_owned(),
			)
			.await?;

		Ok(())
	}

	async fn down(&self, manager: &SchemaManager) -> Result<(), DbErr> {
		// Drop index
		manager
			.drop_index(
				Index::drop()
					.name("idx_users_oidc_issuer_id")
					.table(Users::Table)
					.to_owned(),
			)
			.await?;

		// Drop OIDC columns
		manager
			.alter_table(
				Table::alter()
					.table(Users::Table)
					.drop_column(Users::OidcIssuerId)
					.drop_column(Users::OidcEmail)
					.to_owned(),
			)
			.await?;

		Ok(())
	}
}

#[derive(DeriveIden)]
enum Users {
	Table,
	OidcIssuerId,
	OidcEmail,
}

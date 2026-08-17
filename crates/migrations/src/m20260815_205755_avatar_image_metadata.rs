use sea_orm::{prelude::DateTimeWithTimeZone, sqlx::types::chrono::Utc, Statement};
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
					.add_column_if_not_exists(
						ColumnDef::new(Users::AvatarMeta).json().null(),
					)
					.to_owned(),
			)
			.await?;

		manager
			.alter_table(
				Table::alter()
					.table(Users::Table)
					.add_column_if_not_exists(
						ColumnDef::new(Users::AvatarUpdatedAt).timestamp_with_time_zone(),
					)
					.to_owned(),
			)
			.await?;

		let now: DateTimeWithTimeZone = Utc::now().into();
		let conn = manager.get_connection();

		conn.execute(Statement::from_sql_and_values(
			conn.get_database_backend(),
			r#"
				UPDATE users SET avatar_updated_at = ?
				WHERE avatar_path IS NOT NULL
			"#,
			vec![now.into()],
		))
		.await?;

		Ok(())
	}

	async fn down(&self, manager: &SchemaManager) -> Result<(), DbErr> {
		manager
			.alter_table(
				Table::alter()
					.table(Users::Table)
					.drop_column(Users::AvatarMeta)
					.to_owned(),
			)
			.await?;

		manager
			.alter_table(
				Table::alter()
					.table(Users::Table)
					.drop_column(Users::AvatarUpdatedAt)
					.to_owned(),
			)
			.await?;

		Ok(())
	}
}

#[derive(DeriveIden)]
enum Users {
	Table,
	AvatarMeta,
	AvatarUpdatedAt,
}

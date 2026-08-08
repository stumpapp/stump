use sea_orm::{DbBackend, Statement};
use sea_orm_migration::prelude::*;

#[derive(DeriveMigrationName)]
pub struct Migration;

/// converts `smart_list_access_rules.role` from text to a num so that the existing easy
/// numeric comparisons (>=) work correctly. oopsie poopsie i missed this originally,
/// but it doesn't matter since shared lists aren't exposed yet
#[async_trait::async_trait]
impl MigrationTrait for Migration {
	async fn up(&self, manager: &SchemaManager) -> Result<(), DbErr> {
		let conn = manager.get_connection();

		match conn.get_database_backend() {
			DbBackend::Postgres => {
				conn.execute(Statement::from_string(
					DbBackend::Postgres,
					r#"
						ALTER TABLE smart_list_access_rules
						ALTER COLUMN role TYPE INTEGER
						USING (CASE role
							WHEN 'READER'       THEN 1
							WHEN 'COLLABORATOR' THEN 2
							WHEN 'CO_CREATOR'   THEN 3
							ELSE 1
						END)
					"#,
				))
				.await?;
			},
			DbBackend::Sqlite => {
				conn.execute(Statement::from_string(
					DbBackend::Sqlite,
					r#"
						UPDATE smart_list_access_rules
						SET role = CASE role
							WHEN 'READER'       THEN 1
							WHEN 'COLLABORATOR' THEN 2
							WHEN 'CO_CREATOR'   THEN 3
							ELSE 1
						END
					"#,
				))
				.await?;
			},
			_ => {},
		}

		Ok(())
	}

	async fn down(&self, manager: &SchemaManager) -> Result<(), DbErr> {
		let conn = manager.get_connection();

		match conn.get_database_backend() {
			DbBackend::Postgres => {
				conn.execute(Statement::from_string(
					DbBackend::Postgres,
					r#"
						ALTER TABLE smart_list_access_rules
						ALTER COLUMN role TYPE TEXT
						USING (CASE role
							WHEN 1 THEN 'READER'
							WHEN 2 THEN 'COLLABORATOR'
							WHEN 3 THEN 'CO_CREATOR'
							ELSE 'READER'
						END)
					"#,
				))
				.await?;
			},
			DbBackend::Sqlite => {
				conn.execute(Statement::from_string(
					DbBackend::Sqlite,
					r#"
						UPDATE smart_list_access_rules
						SET role = CASE CAST(role AS INTEGER)
							WHEN 1 THEN 'READER'
							WHEN 2 THEN 'COLLABORATOR'
							WHEN 3 THEN 'CO_CREATOR'
							ELSE 'READER'
						END
					"#,
				))
				.await?;
			},
			_ => {},
		}

		Ok(())
	}
}

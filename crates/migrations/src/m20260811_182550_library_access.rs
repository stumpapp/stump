use sea_orm_migration::prelude::*;

#[derive(DeriveMigrationName)]
pub struct Migration;

/// converts library access control from a blacklist (library_exclusions) to an
/// allowlist (library_access)
#[async_trait::async_trait]
impl MigrationTrait for Migration {
	async fn up(&self, manager: &SchemaManager) -> Result<(), DbErr> {
		manager
			.create_table(
				Table::create()
					.table(LibraryAccess::Table)
					.if_not_exists()
					.col(
						ColumnDef::new(LibraryAccess::Id)
							.integer()
							.not_null()
							.auto_increment()
							.primary_key(),
					)
					.col(ColumnDef::new(LibraryAccess::UserId).text().not_null())
					.col(ColumnDef::new(LibraryAccess::LibraryId).text().not_null())
					.foreign_key(
						ForeignKey::create()
							.name("fk-library_access-library")
							.from(LibraryAccess::Table, LibraryAccess::LibraryId)
							.to(Libraries::Table, Libraries::Id)
							.on_delete(ForeignKeyAction::Cascade)
							.on_update(ForeignKeyAction::Cascade),
					)
					.foreign_key(
						ForeignKey::create()
							.name("fk-library_access-user")
							.from(LibraryAccess::Table, LibraryAccess::UserId)
							.to(Users::Table, Users::Id)
							.on_delete(ForeignKeyAction::Cascade)
							.on_update(ForeignKeyAction::Cascade),
					)
					.to_owned(),
			)
			.await?;

		// grants access to every (user, library) pair that was not in library_exclusions
		// insert into library_access (user_id, library_id)
		// select users.id, libraries.id
		// from users, libraries
		// where not exists (
		//     select 1
		//     from library_exclusions
		//     where library_exclusions.user_id = users.id
		//     and library_exclusions.library_id = libraries.id
		// )
		let backfill = Query::insert()
			.into_table(LibraryAccess::Table)
			.columns([LibraryAccess::UserId, LibraryAccess::LibraryId])
			.select_from(
				Query::select()
					.column((Users::Table, Users::Id))
					.column((Libraries::Table, Libraries::Id))
					.from(Users::Table)
					.from(Libraries::Table)
					.and_where(
						Expr::exists(
							Query::select()
								.expr(Expr::val(1))
								.from(LibraryExclusions::Table)
								.and_where(
									Expr::col((
										LibraryExclusions::Table,
										LibraryExclusions::UserId,
									))
									.eq(Expr::col((Users::Table, Users::Id))),
								)
								.and_where(
									Expr::col((
										LibraryExclusions::Table,
										LibraryExclusions::LibraryId,
									))
									.eq(Expr::col((Libraries::Table, Libraries::Id))),
								)
								.to_owned(),
						)
						.not(),
					)
					.to_owned(),
			)
			.map_err(|e| DbErr::Custom(e.to_string()))?
			.to_owned();

		manager
			.get_connection()
			.execute(manager.get_database_backend().build(&backfill))
			.await?;

		manager
			.drop_table(Table::drop().table(LibraryExclusions::Table).to_owned())
			.await?;

		Ok(())
	}

	async fn down(&self, manager: &SchemaManager) -> Result<(), DbErr> {
		manager
			.create_table(
				Table::create()
					.table(LibraryExclusions::Table)
					.if_not_exists()
					.col(
						ColumnDef::new(LibraryExclusions::Id)
							.integer()
							.not_null()
							.auto_increment()
							.primary_key(),
					)
					.col(ColumnDef::new(LibraryExclusions::UserId).text().not_null())
					.col(
						ColumnDef::new(LibraryExclusions::LibraryId)
							.text()
							.not_null(),
					)
					.foreign_key(
						ForeignKey::create()
							.name("fk-library_exclusions-library")
							.from(LibraryExclusions::Table, LibraryExclusions::LibraryId)
							.to(Libraries::Table, Libraries::Id)
							.on_delete(ForeignKeyAction::Cascade)
							.on_update(ForeignKeyAction::Cascade),
					)
					.foreign_key(
						ForeignKey::create()
							.name("fk-library_exclusions-user")
							.from(LibraryExclusions::Table, LibraryExclusions::UserId)
							.to(Users::Table, Users::Id)
							.on_delete(ForeignKeyAction::Cascade)
							.on_update(ForeignKeyAction::Cascade),
					)
					.to_owned(),
			)
			.await?;

		// exclude every (user, library) pair that was NOT in library_access
		// insert into library_exclusions (user_id, library_id)
		// select users.id, libraries.id
		// from users, libraries
		// where not exists (
		//     select 1
		//     from library_access
		//     where library_access.user_id = users.id
		//     and library_access.library_id = libraries.id
		// )
		let backfill = Query::insert()
			.into_table(LibraryExclusions::Table)
			.columns([LibraryExclusions::UserId, LibraryExclusions::LibraryId])
			.select_from(
				Query::select()
					.column((Users::Table, Users::Id))
					.column((Libraries::Table, Libraries::Id))
					.from(Users::Table)
					.from(Libraries::Table)
					.and_where(
						Expr::exists(
							Query::select()
								.expr(Expr::val(1))
								.from(LibraryAccess::Table)
								.and_where(
									Expr::col((
										LibraryAccess::Table,
										LibraryAccess::UserId,
									))
									.eq(Expr::col((Users::Table, Users::Id))),
								)
								.and_where(
									Expr::col((
										LibraryAccess::Table,
										LibraryAccess::LibraryId,
									))
									.eq(Expr::col((Libraries::Table, Libraries::Id))),
								)
								.to_owned(),
						)
						.not(),
					)
					.to_owned(),
			)
			.map_err(|e| DbErr::Custom(e.to_string()))?
			.to_owned();

		manager
			.get_connection()
			.execute(manager.get_database_backend().build(&backfill))
			.await?;

		manager
			.drop_table(Table::drop().table(LibraryAccess::Table).to_owned())
			.await?;

		Ok(())
	}
}

#[derive(DeriveIden)]
enum LibraryAccess {
	Table,
	Id,
	UserId,
	LibraryId,
}

#[derive(DeriveIden)]
enum LibraryExclusions {
	Table,
	Id,
	UserId,
	LibraryId,
}

#[derive(DeriveIden)]
enum Libraries {
	Table,
	Id,
}

#[derive(DeriveIden)]
enum Users {
	Table,
	Id,
}

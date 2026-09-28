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
						ColumnDef::new(Bookmarks::SessionId)
							.integer()
							.null()
							.default(Value::Int(None)),
					)
					.add_foreign_key(
						TableForeignKey::new()
							.name("fk-bookmarks-session")
							.from_tbl(Bookmarks::Table)
							.from_col(Bookmarks::SessionId)
							.to_tbl(ReadingSessions::Table)
							.to_col(ReadingSessions::Id)
							.on_delete(ForeignKeyAction::SetNull),
						// ^ no delete bookmarks when a session is deleted
					)
					.to_owned(),
			)
			.await?;

		manager
			.alter_table(
				Table::alter()
					.table(MediaAnnotations::Table)
					.add_column(
						ColumnDef::new(MediaAnnotations::SessionId)
							.integer()
							.null()
							.default(Value::Int(None)),
					)
					.add_foreign_key(
						TableForeignKey::new()
							.name("fk-media_annotations-session")
							.from_tbl(MediaAnnotations::Table)
							.from_col(MediaAnnotations::SessionId)
							.to_tbl(ReadingSessions::Table)
							.to_col(ReadingSessions::Id)
							.on_delete(ForeignKeyAction::SetNull),
						// ^ no delete annotations when a session is deleted
					)
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
					.drop_foreign_key("fk-bookmarks-session")
					.drop_column(Bookmarks::SessionId)
					.to_owned(),
			)
			.await?;

		manager
			.alter_table(
				Table::alter()
					.table(MediaAnnotations::Table)
					.drop_foreign_key("fk-media_annotations-session")
					.drop_column(MediaAnnotations::SessionId)
					.to_owned(),
			)
			.await?;

		Ok(())
	}
}

#[derive(DeriveIden)]
enum Bookmarks {
	Table,
	SessionId,
}

#[derive(DeriveIden)]
enum MediaAnnotations {
	Table,
	SessionId,
}

#[derive(DeriveIden)]
enum ReadingSessions {
	Table,
	Id,
}

async fn backfill() -> Result<(), DbErr> {
	// for (user_id, media_id) for all bookmarks/annotations:
	//    get day_reset pref ?? 0
	//    map session_date to session_id for all pairs
	//    for each bookmark/annotation:
	//        if logical date in map, update session_id to session_id
	todo!()
}

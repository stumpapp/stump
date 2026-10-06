use sea_orm_migration::prelude::*;

#[derive(DeriveMigrationName)]
pub struct Migration;

#[async_trait::async_trait]
impl MigrationTrait for Migration {
	async fn up(&self, manager: &SchemaManager) -> Result<(), DbErr> {
		manager
			.create_table(
				Table::create()
					.table(JournalEntry::Table)
					.if_not_exists()
					.col(
						ColumnDef::new(JournalEntry::Id)
							.integer()
							.not_null()
							.auto_increment()
							.primary_key(),
					)
					.col(ColumnDef::new(JournalEntry::Content).text().not_null())
					.col(ColumnDef::new(JournalEntry::UserId).text().not_null())
					.col(ColumnDef::new(JournalEntry::MediaId).text().not_null())
					.col(ColumnDef::new(JournalEntry::SessionId).integer())
					.col(
						ColumnDef::new(JournalEntry::CreatedAt)
							.timestamp_with_time_zone()
							.not_null()
							.default(Expr::current_timestamp()),
					)
					.col(
						ColumnDef::new(JournalEntry::UpdatedAt)
							.timestamp_with_time_zone()
							.default(Expr::current_timestamp())
							.not_null(),
					)
					.foreign_key(
						ForeignKey::create()
							.name("fk-journal_entries-user")
							.from(JournalEntry::Table, JournalEntry::UserId)
							.to(Users::Table, Users::Id)
							.on_delete(ForeignKeyAction::Cascade)
							.on_update(ForeignKeyAction::Cascade),
					)
					.foreign_key(
						ForeignKey::create()
							.name("fk-journal_entries-media")
							.from(JournalEntry::Table, JournalEntry::MediaId)
							.to(Media::Table, Media::Id)
							.on_delete(ForeignKeyAction::Cascade)
							.on_update(ForeignKeyAction::Cascade),
					)
					.foreign_key(
						ForeignKey::create()
							.name("fk-journal_entries-reading_session")
							.from(JournalEntry::Table, JournalEntry::SessionId)
							.to(ReadingSessions::Table, ReadingSessions::Id)
							.on_delete(ForeignKeyAction::SetNull)
							.on_update(ForeignKeyAction::Cascade),
					)
					.to_owned(),
			)
			.await?;

		// this may change in the future, but for now a session may have just one
		// journal entry
		manager
			.create_index(
				Index::create()
					.unique()
					.name("journal_entries_session_id_idx")
					.table(JournalEntry::Table)
					.col(JournalEntry::SessionId)
					.to_owned(),
			)
			.await
	}

	async fn down(&self, manager: &SchemaManager) -> Result<(), DbErr> {
		manager
			.drop_table(Table::drop().table(JournalEntry::Table).to_owned())
			.await
	}
}

#[derive(DeriveIden)]
enum JournalEntry {
	#[sea_orm(iden = "journal_entries")]
	Table,
	Id,
	Content,
	UserId,
	MediaId,
	SessionId,
	CreatedAt,
	UpdatedAt,
}

#[derive(DeriveIden)]
enum Users {
	Table,
	Id,
}

#[derive(DeriveIden)]
enum Media {
	Table,
	Id,
}

#[derive(DeriveIden)]
enum ReadingSessions {
	Table,
	Id,
}

use sea_orm_migration::prelude::*;

#[derive(DeriveMigrationName)]
pub struct Migration;

#[async_trait::async_trait]
impl MigrationTrait for Migration {
	async fn up(&self, manager: &SchemaManager) -> Result<(), DbErr> {
		manager
			.alter_table(
				Table::alter()
					.table(ReadingSessions::Table)
					.add_column(ColumnDef::new(ReadingSessions::ReportedAt).date_time())
					.to_owned(),
			)
			.await?;

		manager
			.create_index(
				Index::create()
					.name("idx_reading_sessions_user_created_at")
					.table(ReadingSessions::Table)
					.col(ReadingSessions::UserId)
					.col(ReadingSessions::CreatedAt)
					.if_not_exists()
					.to_owned(),
			)
			.await?;

		manager
			.create_index(
				Index::create()
					.name("idx_reading_sessions_user_updated_at")
					.table(ReadingSessions::Table)
					.col(ReadingSessions::UserId)
					.col(ReadingSessions::UpdatedAt)
					.if_not_exists()
					.to_owned(),
			)
			.await?;

		manager
			.create_table(
				Table::create()
					.table(KoboSyncMedia::Table)
					.if_not_exists()
					.col(ColumnDef::new(KoboSyncMedia::UserId).text().not_null())
					.col(ColumnDef::new(KoboSyncMedia::MediaId).text().not_null())
					.col(
						ColumnDef::new(KoboSyncMedia::IsSelected)
							.boolean()
							.not_null()
							.default(true),
					)
					.col(
						ColumnDef::new(KoboSyncMedia::UpdatedAt)
							.timestamp()
							.not_null()
							.default(Expr::current_timestamp()),
					)
					.primary_key(
						Index::create()
							.name("pk-kobo-sync-media")
							.col(KoboSyncMedia::UserId)
							.col(KoboSyncMedia::MediaId),
					)
					.foreign_key(
						ForeignKey::create()
							.name("fk-kobo-sync-media-user")
							.from(KoboSyncMedia::Table, KoboSyncMedia::UserId)
							.to(Users::Table, Users::Id)
							.on_delete(ForeignKeyAction::Cascade)
							.on_update(ForeignKeyAction::Cascade),
					)
					.foreign_key(
						ForeignKey::create()
							.name("fk-kobo-sync-media-media")
							.from(KoboSyncMedia::Table, KoboSyncMedia::MediaId)
							.to(Media::Table, Media::Id)
							.on_delete(ForeignKeyAction::Cascade)
							.on_update(ForeignKeyAction::Cascade),
					)
					.to_owned(),
			)
			.await?;

		manager
			.create_index(
				Index::create()
					.name("idx_kobo_sync_media_user_updated_at")
					.table(KoboSyncMedia::Table)
					.col(KoboSyncMedia::UserId)
					.col(KoboSyncMedia::UpdatedAt)
					.if_not_exists()
					.to_owned(),
			)
			.await?;

		manager
			.create_table(
				Table::create()
					.table(ReadingProgressResets::Table)
					.if_not_exists()
					.col(
						ColumnDef::new(ReadingProgressResets::UserId)
							.text()
							.not_null(),
					)
					.col(
						ColumnDef::new(ReadingProgressResets::MediaId)
							.text()
							.not_null(),
					)
					.col(
						ColumnDef::new(ReadingProgressResets::ResetAt)
							.timestamp()
							.not_null()
							.default(Expr::current_timestamp()),
					)
					.col(ColumnDef::new(ReadingProgressResets::ReportedAt).timestamp())
					.primary_key(
						Index::create()
							.name("pk-reading-progress-resets")
							.col(ReadingProgressResets::UserId)
							.col(ReadingProgressResets::MediaId),
					)
					.foreign_key(
						ForeignKey::create()
							.name("fk-reading-progress-resets-user")
							.from(
								ReadingProgressResets::Table,
								ReadingProgressResets::UserId,
							)
							.to(Users::Table, Users::Id)
							.on_delete(ForeignKeyAction::Cascade)
							.on_update(ForeignKeyAction::Cascade),
					)
					.foreign_key(
						ForeignKey::create()
							.name("fk-reading-progress-resets-media")
							.from(
								ReadingProgressResets::Table,
								ReadingProgressResets::MediaId,
							)
							.to(Media::Table, Media::Id)
							.on_delete(ForeignKeyAction::Cascade)
							.on_update(ForeignKeyAction::Cascade),
					)
					.to_owned(),
			)
			.await?;

		manager
			.create_index(
				Index::create()
					.name("idx_reading_progress_resets_user_reset_at")
					.table(ReadingProgressResets::Table)
					.col(ReadingProgressResets::UserId)
					.col(ReadingProgressResets::ResetAt)
					.if_not_exists()
					.to_owned(),
			)
			.await
	}

	async fn down(&self, manager: &SchemaManager) -> Result<(), DbErr> {
		manager
			.drop_index(
				Index::drop()
					.name("idx_reading_sessions_user_updated_at")
					.table(ReadingSessions::Table)
					.to_owned(),
			)
			.await?;

		manager
			.drop_index(
				Index::drop()
					.name("idx_reading_sessions_user_created_at")
					.table(ReadingSessions::Table)
					.to_owned(),
			)
			.await?;

		manager
			.drop_table(Table::drop().table(ReadingProgressResets::Table).to_owned())
			.await?;

		manager
			.drop_table(Table::drop().table(KoboSyncMedia::Table).to_owned())
			.await?;

		manager
			.alter_table(
				Table::alter()
					.table(ReadingSessions::Table)
					.drop_column(ReadingSessions::ReportedAt)
					.to_owned(),
			)
			.await
	}
}

#[derive(Iden)]
enum KoboSyncMedia {
	Table,
	UserId,
	MediaId,
	IsSelected,
	UpdatedAt,
}

#[derive(Iden)]
enum ReadingProgressResets {
	Table,
	UserId,
	MediaId,
	ResetAt,
	ReportedAt,
}

#[derive(Iden)]
enum ReadingSessions {
	Table,
	ReportedAt,
	UserId,
	CreatedAt,
	UpdatedAt,
}

#[derive(Iden)]
enum Users {
	Table,
	Id,
}

#[derive(Iden)]
enum Media {
	Table,
	Id,
}

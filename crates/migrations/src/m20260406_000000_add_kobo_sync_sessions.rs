use sea_orm_migration::prelude::*;

#[derive(DeriveMigrationName)]
pub struct Migration;

#[async_trait::async_trait]
impl MigrationTrait for Migration {
	async fn up(&self, manager: &SchemaManager) -> Result<(), DbErr> {
		manager
			.create_table(
				Table::create()
					.table(KoboSyncSessions::Table)
					.if_not_exists()
					.col(
						ColumnDef::new(KoboSyncSessions::Id)
							.text()
							.not_null()
							.primary_key(),
					)
					.col(ColumnDef::new(KoboSyncSessions::UserId).text().not_null())
					.col(ColumnDef::new(KoboSyncSessions::MediaIds).json().not_null())
					.col(ColumnDef::new(KoboSyncSessions::DeviceId).text().not_null())
					.col(
						ColumnDef::new(KoboSyncSessions::DeviceMetadata)
							.json()
							.not_null(),
					)
					.col(
						ColumnDef::new(KoboSyncSessions::CreatedAt)
							.timestamp_with_time_zone()
							.not_null()
							.default(Expr::current_timestamp()),
					)
					.col(
						ColumnDef::new(KoboSyncSessions::PreviousSyncAt)
							.timestamp_with_time_zone(),
					)
					.foreign_key(
						ForeignKey::create()
							.name("fk-kobo-sync-user")
							.from(KoboSyncSessions::Table, KoboSyncSessions::UserId)
							.to(Users::Table, Users::Id)
							.on_delete(ForeignKeyAction::Cascade)
							.on_update(ForeignKeyAction::Cascade),
					)
					.to_owned(),
			)
			.await
	}

	async fn down(&self, manager: &SchemaManager) -> Result<(), DbErr> {
		manager
			.drop_table(Table::drop().table(KoboSyncSessions::Table).to_owned())
			.await
	}
}

#[derive(Iden)]
enum KoboSyncSessions {
	Table,
	Id,
	UserId,
	MediaIds,
	DeviceId,
	DeviceMetadata,
	CreatedAt,
	PreviousSyncAt,
}

#[derive(Iden)]
enum Users {
	Table,
	Id,
}

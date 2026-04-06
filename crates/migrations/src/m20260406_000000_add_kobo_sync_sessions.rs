use sea_orm_migration::prelude::*;

#[derive(DeriveMigrationName)]
pub struct Migration;

#[async_trait::async_trait]
impl MigrationTrait for Migration {
	async fn up(&self, manager: &SchemaManager) -> Result<(), DbErr> {
		manager
			.create_table(
				Table::create()
					.table(KoboSyncSession::Table)
					.if_not_exists()
					.col(
						ColumnDef::new(KoboSyncSession::Id)
							.text()
							.not_null()
							.primary_key(),
					)
					.col(ColumnDef::new(KoboSyncSession::UserId).text().not_null())
					.col(ColumnDef::new(KoboSyncSession::MediaIds).json().not_null())
					.col(ColumnDef::new(KoboSyncSession::DeviceId).text().not_null())
					.col(
						ColumnDef::new(KoboSyncSession::DeviceMetadata)
							.json()
							.not_null(),
					)
					.col(
						ColumnDef::new(KoboSyncSession::CreatedAt)
							.timestamp()
							.not_null()
							.default(Expr::current_timestamp()),
					)
					.col(ColumnDef::new(KoboSyncSession::PreviousSyncAt).timestamp())
					.foreign_key(
						ForeignKey::create()
							.name("fk-kobo-sync-user")
							.from(KoboSyncSession::Table, KoboSyncSession::UserId)
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
			.drop_table(Table::drop().table(KoboSyncSession::Table).to_owned())
			.await
	}
}

#[derive(Iden)]
enum KoboSyncSession {
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

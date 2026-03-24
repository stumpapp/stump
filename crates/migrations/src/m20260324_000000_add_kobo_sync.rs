use sea_orm_migration::prelude::*;

#[derive(DeriveMigrationName)]
pub struct Migration;

#[async_trait::async_trait]
impl MigrationTrait for Migration {
	async fn up(&self, manager: &SchemaManager) -> Result<(), DbErr> {
		manager
			.create_table(
				Table::create()
					.table(KoboSync::Table)
					.if_not_exists()
					.col(ColumnDef::new(KoboSync::Id).text().not_null().primary_key())
					.col(ColumnDef::new(KoboSync::UserId).text().not_null())
					.col(ColumnDef::new(KoboSync::MediaIds).json().not_null())
					.col(ColumnDef::new(KoboSync::DeviceId).text().not_null())
					.col(ColumnDef::new(KoboSync::DeviceMetadata).json().not_null())
					.col(
						ColumnDef::new(KoboSync::CreatedAt)
							.timestamp()
							.not_null()
							.default(Expr::current_timestamp()),
					)
					.foreign_key(
						ForeignKey::create()
							.name("fk-kobo-sync-user")
							.from(KoboSync::Table, KoboSync::UserId)
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
			.drop_table(Table::drop().table(KoboSync::Table).to_owned())
			.await
	}
}

#[derive(Iden)]
enum KoboSync {
	Table,
	Id,
	UserId,
	MediaIds,
	DeviceId,
	DeviceMetadata,
	CreatedAt,
}

#[derive(Iden)]
enum Users {
	Table,
	Id,
}

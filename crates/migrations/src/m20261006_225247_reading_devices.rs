use sea_orm_migration::prelude::*;

/// IMPORTANT: data loss is accepted for this migration since nothing used reading devices,
/// so up will drop the existing table and just recreate what we need now, and down will
/// do the exact opposite
#[derive(DeriveMigrationName)]
pub struct Migration;

#[async_trait::async_trait]
impl MigrationTrait for Migration {
	async fn up(&self, manager: &SchemaManager) -> Result<(), DbErr> {
		manager
			.drop_table(Table::drop().table(OldReadingDevices::Table).to_owned())
			.await?;

		manager
			.create_table(
				Table::create()
					.table(ReadingDevices::Table)
					.if_not_exists()
					// reading devices will have a composite pk of (id, user_id) so that
					// a device name can be shared across users (e.g., maybe me and my partner
					// both read from the same ipad but have separate server entries, etc)
					.col(
						ColumnDef::new(ReadingDevices::Id)
							.text()
							.not_null()
							.primary_key(),
					)
					.col(
						ColumnDef::new(ReadingDevices::UserId)
							.text()
							.not_null()
							.primary_key(),
					)
					.col(ColumnDef::new(ReadingDevices::Name).text().not_null())
					.col(
						ColumnDef::new(ReadingDevices::CreatedAt)
							.timestamp_with_time_zone()
							.not_null()
							.default(Expr::current_timestamp()),
					)
					.col(
						ColumnDef::new(ReadingDevices::UpdatedAt)
							.timestamp_with_time_zone()
							.default(Expr::current_timestamp())
							.not_null(),
					)
					.foreign_key(
						ForeignKey::create()
							.name("fk-reading_devices-user")
							.from(ReadingDevices::Table, ReadingDevices::UserId)
							.to(Users::Table, Users::Id)
							.on_delete(ForeignKeyAction::Cascade)
							.on_update(ForeignKeyAction::Cascade),
					)
					.to_owned(),
			)
			.await?;

		// (id, user_id) is already unique via the composite pk, so
		// excluded from this index
		manager
			.create_index(
				Index::create()
					.name("idx_reading_devices_user_id_name")
					.table(ReadingDevices::Table)
					.col(ReadingDevices::UserId)
					.col(ReadingDevices::Name)
					.unique()
					.to_owned(),
			)
			.await?;

		Ok(())
	}

	async fn down(&self, manager: &SchemaManager) -> Result<(), DbErr> {
		manager
			.drop_table(Table::drop().table(ReadingDevices::Table).to_owned())
			.await?;

		manager
			.create_table(
				Table::create()
					.table(OldReadingDevices::Table)
					.if_not_exists()
					.col(
						ColumnDef::new(OldReadingDevices::Id)
							.text()
							.not_null()
							.primary_key(),
					)
					.col(
						ColumnDef::new(OldReadingDevices::Name)
							.text()
							.not_null()
							.unique_key(),
					)
					.col(ColumnDef::new(OldReadingDevices::Kind).text())
					.col(ColumnDef::new(OldReadingDevices::Email).text())
					.to_owned(),
			)
			.await?;

		Ok(())
	}
}

#[derive(DeriveIden)]
enum ReadingDevices {
	Table,
	Id,
	UserId,
	Name,
	CreatedAt,
	UpdatedAt,
}

#[derive(DeriveIden)]
enum OldReadingDevices {
	#[sea_orm(iden = "reading_devices")]
	Table,
	Id,
	Name,
	Kind,
	Email,
}

#[derive(DeriveIden)]
enum Users {
	Table,
	Id,
}

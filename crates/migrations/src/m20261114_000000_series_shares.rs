use sea_orm_migration::prelude::*;

#[derive(DeriveMigrationName)]
pub struct Migration;

/// Adds the `series_shares` table, which grants individual users access to a series (and
/// therefore all of its books) even if the library containing it is hidden from them via
/// `library_exclusions`.
#[async_trait::async_trait]
impl MigrationTrait for Migration {
	async fn up(&self, manager: &SchemaManager) -> Result<(), DbErr> {
		manager
			.create_table(
				Table::create()
					.table(SeriesShares::Table)
					.if_not_exists()
					.col(
						ColumnDef::new(SeriesShares::Id)
							.integer()
							.not_null()
							.auto_increment()
							.primary_key(),
					)
					.col(ColumnDef::new(SeriesShares::UserId).text().not_null())
					.col(ColumnDef::new(SeriesShares::SeriesId).text().not_null())
					.foreign_key(
						ForeignKey::create()
							.name("fk-series_shares-user")
							.from(SeriesShares::Table, SeriesShares::UserId)
							.to(Users::Table, Users::Id)
							.on_delete(ForeignKeyAction::Cascade)
							.on_update(ForeignKeyAction::Cascade),
					)
					.foreign_key(
						ForeignKey::create()
							.name("fk-series_shares-series")
							.from(SeriesShares::Table, SeriesShares::SeriesId)
							.to(Series::Table, Series::Id)
							.on_delete(ForeignKeyAction::Cascade)
							.on_update(ForeignKeyAction::Cascade),
					)
					.to_owned(),
			)
			.await?;

		// The visibility filters look shares up by user, so lead the index with user_id
		manager
			.create_index(
				Index::create()
					.unique()
					.name("series_shares_user_id_series_id_idx")
					.table(SeriesShares::Table)
					.col(SeriesShares::UserId)
					.col(SeriesShares::SeriesId)
					.to_owned(),
			)
			.await?;

		Ok(())
	}

	async fn down(&self, manager: &SchemaManager) -> Result<(), DbErr> {
		manager
			.drop_table(Table::drop().table(SeriesShares::Table).to_owned())
			.await?;

		Ok(())
	}
}

#[derive(DeriveIden)]
enum SeriesShares {
	#[sea_orm(iden = "series_shares")]
	Table,
	Id,
	UserId,
	SeriesId,
}

#[derive(DeriveIden)]
enum Users {
	Table,
	Id,
}

#[derive(DeriveIden)]
enum Series {
	#[sea_orm(iden = "series")]
	Table,
	Id,
}

use sea_orm_migration::prelude::*;

#[derive(DeriveMigrationName)]
pub struct Migration;

#[async_trait::async_trait]
impl MigrationTrait for Migration {
	async fn up(&self, manager: &SchemaManager) -> Result<(), DbErr> {
		manager
			.create_table(
				Table::create()
					.table(UserSeriesState::Table)
					.if_not_exists()
					.col(
						ColumnDef::new(UserSeriesState::Id)
							.integer()
							.not_null()
							.auto_increment()
							.primary_key(),
					)
					.col(ColumnDef::new(UserSeriesState::UserId).text().not_null())
					.col(ColumnDef::new(UserSeriesState::SeriesId).text().not_null())
					// non-null -> do not show unread books in current readthrough on deck, show only
					// completely unread books beyond the highest read position ever reached
					.col(ColumnDef::new(UserSeriesState::StoppedReadthrough).integer())
					// non-null -> do not show the series on deck at all, unless books are added
					// after drop
					.col(ColumnDef::new(UserSeriesState::DroppedAt).date_time())
					.col(
						ColumnDef::new(UserSeriesState::CreatedAt)
							.date_time()
							.not_null(),
					)
					.col(ColumnDef::new(UserSeriesState::UpdatedAt).date_time())
					.foreign_key(
						ForeignKey::create()
							.name("fk-user_series_state-user")
							.from(UserSeriesState::Table, UserSeriesState::UserId)
							.to(Users::Table, Users::Id)
							.on_delete(ForeignKeyAction::Cascade)
							.on_update(ForeignKeyAction::Cascade),
					)
					.foreign_key(
						ForeignKey::create()
							.name("fk-user_series_state-series")
							.from(UserSeriesState::Table, UserSeriesState::SeriesId)
							.to(Series::Table, Series::Id)
							.on_delete(ForeignKeyAction::Cascade)
							.on_update(ForeignKeyAction::Cascade),
					)
					.to_owned(),
			)
			.await?;

		// TODO: run explain query plan on the on deck query and fiddle with indexes per results
		// i fkcn hate reading query plans tho 😭

		Ok(())
	}

	async fn down(&self, manager: &SchemaManager) -> Result<(), DbErr> {
		manager
			.drop_table(Table::drop().table(UserSeriesState::Table).to_owned())
			.await?;

		Ok(())
	}
}

#[derive(DeriveIden)]
enum UserSeriesState {
	Table,
	Id,
	UserId,
	SeriesId,
	StoppedReadthrough,
	DroppedAt,
	CreatedAt,
	UpdatedAt,
}

#[derive(DeriveIden)]
enum Users {
	#[sea_orm(iden = "users")]
	Table,
	Id,
}

#[derive(DeriveIden)]
enum Series {
	#[sea_orm(iden = "series")]
	Table,
	Id,
}

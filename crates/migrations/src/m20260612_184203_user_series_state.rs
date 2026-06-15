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
					.col(
						ColumnDef::new(UserSeriesState::StoppedReadthroughAt).date_time(),
					)
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

		// one state per user+series pair
		manager
			.create_index(
				Index::create()
					.unique()
					.name("idx-user_series_state-user-series")
					.table(UserSeriesState::Table)
					.col(UserSeriesState::UserId)
					.col(UserSeriesState::SeriesId)
					.to_owned(),
			)
			.await?;

		// covers a common path in the on deck query to filter sessions by status for user
		// the existing index on user_id+media_id was doing work per query plan but showed status
		// then filtered in memory, so this should help in multiple ctes
		manager
			.create_index(
				Index::create()
					.name("idx-reading_sessions-user-status")
					.table(ReadingSessions::Table)
					.col(ReadingSessions::UserId)
					.col(ReadingSessions::Status)
					.to_owned(),
			)
			.await?;

		Ok(())
	}

	async fn down(&self, manager: &SchemaManager) -> Result<(), DbErr> {
		manager
			.drop_index(
				Index::drop()
					.name("idx-reading_sessions-user-status")
					.table(ReadingSessions::Table)
					.to_owned(),
			)
			.await?;

		manager
			.drop_index(
				Index::drop()
					.name("idx-user_series_state-user-series")
					.table(UserSeriesState::Table)
					.to_owned(),
			)
			.await?;

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
	StoppedReadthroughAt,
	DroppedAt,
	CreatedAt,
	UpdatedAt,
}

#[derive(DeriveIden)]
enum ReadingSessions {
	#[sea_orm(iden = "reading_sessions")]
	Table,
	UserId,
	Status,
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

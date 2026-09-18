use sea_orm_migration::prelude::*;

#[derive(DeriveMigrationName)]
pub struct Migration;

#[async_trait::async_trait]
impl MigrationTrait for Migration {
	async fn up(&self, manager: &SchemaManager) -> Result<(), DbErr> {
		manager
			.drop_table(
				Table::drop()
					.table(ScheduledJobLibraries::Table)
					.if_exists()
					.to_owned(),
			)
			.await?;

		manager
			.drop_table(
				Table::drop()
					.table(ScheduledJobConfigs::Table)
					.if_exists()
					.to_owned(),
			)
			.await?;

		manager
			.create_table(
				Table::create()
					.table(ScheduledJobs::Table)
					.if_not_exists()
					.col(
						ColumnDef::new(ScheduledJobs::Id)
							.integer()
							.not_null()
							.auto_increment()
							.primary_key(),
					)
					.col(ColumnDef::new(ScheduledJobs::Name).text().not_null())
					.col(ColumnDef::new(ScheduledJobs::Kind).string().not_null())
					.col(ColumnDef::new(ScheduledJobs::Schedule).text().not_null())
					.col(ColumnDef::new(ScheduledJobs::Config).json())
					.col(
						ColumnDef::new(ScheduledJobs::Enabled)
							.boolean()
							.not_null()
							.default(true),
					)
					.col(
						ColumnDef::new(ScheduledJobs::CreatedAt)
							.timestamp_with_time_zone()
							.not_null()
							.default(Expr::current_timestamp()),
					)
					.col(
						ColumnDef::new(ScheduledJobs::LastRunAt)
							.timestamp_with_time_zone(),
					)
					.to_owned(),
			)
			.await?;

		Ok(())
	}

	async fn down(&self, manager: &SchemaManager) -> Result<(), DbErr> {
		manager
			.drop_table(
				Table::drop()
					.table(ScheduledJobs::Table)
					.if_exists()
					.to_owned(),
			)
			.await?;

		manager
			.create_table(
				Table::create()
					.table(ScheduledJobConfigs::Table)
					.if_not_exists()
					.col(
						ColumnDef::new(ScheduledJobConfigs::Id)
							.integer()
							.not_null()
							.auto_increment()
							.primary_key(),
					)
					.col(
						ColumnDef::new(ScheduledJobConfigs::IntervalSecs)
							.integer()
							.not_null(),
					)
					.to_owned(),
			)
			.await?;

		manager
			.create_table(
				Table::create()
					.table(ScheduledJobLibraries::Table)
					.if_not_exists()
					.col(
						ColumnDef::new(ScheduledJobLibraries::Id)
							.integer()
							.not_null()
							.auto_increment()
							.primary_key(),
					)
					.col(
						ColumnDef::new(ScheduledJobLibraries::ScheduleId)
							.integer()
							.not_null(),
					)
					.col(
						ColumnDef::new(ScheduledJobLibraries::LibraryId)
							.text()
							.not_null(),
					)
					.foreign_key(
						ForeignKey::create()
							.from(
								ScheduledJobLibraries::Table,
								ScheduledJobLibraries::ScheduleId,
							)
							.to(ScheduledJobConfigs::Table, ScheduledJobConfigs::Id)
							.on_delete(ForeignKeyAction::Cascade)
							.on_update(ForeignKeyAction::Cascade),
					)
					.to_owned(),
			)
			.await?;

		Ok(())
	}
}

#[derive(DeriveIden)]
enum ScheduledJobs {
	Table,
	Id,
	Name,
	Kind,
	Schedule,
	Config,
	Enabled,
	CreatedAt,
	LastRunAt,
}

#[derive(DeriveIden)]
enum ScheduledJobConfigs {
	Table,
	Id,
	IntervalSecs,
}

#[derive(DeriveIden)]
enum ScheduledJobLibraries {
	Table,
	Id,
	ScheduleId,
	LibraryId,
}

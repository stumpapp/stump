use sea_orm_migration::prelude::*;

#[derive(DeriveMigrationName)]
pub struct Migration;

// "v2" reading sessions, unfied record that replaces both `reading_sessions` and `finished_reading_sessions`
// so that we can track true reading sessions (e.g., a single session of reading etc) to support other features
// like journaling, goals, etc

#[async_trait::async_trait]
impl MigrationTrait for Migration {
	async fn up(&self, manager: &SchemaManager) -> Result<(), DbErr> {
		manager
			.create_table(
				Table::create()
					.table(ReadingSessionsV2::Table)
					.if_not_exists()
					.col(
						ColumnDef::new(ReadingSessionsV2::Id)
							.integer()
							.not_null()
							.auto_increment()
							.primary_key(),
					)
					.col(
						ColumnDef::new(ReadingSessionsV2::SessionDate)
							.date()
							.not_null(),
					)
					.col(ColumnDef::new(ReadingSessionsV2::Notes).text())
					// note that this will eventually be removed once we get rid of epubjs
					.col(ColumnDef::new(ReadingSessionsV2::Epubcfi).text())
					.col(ColumnDef::new(ReadingSessionsV2::StartLocator).json())
					.col(ColumnDef::new(ReadingSessionsV2::EndLocator).json())
					.col(ColumnDef::new(ReadingSessionsV2::StartPage).integer())
					.col(ColumnDef::new(ReadingSessionsV2::EndPage).integer())
					.col(ColumnDef::new(ReadingSessionsV2::StartPercentage).decimal())
					.col(ColumnDef::new(ReadingSessionsV2::EndPercentage).decimal())
					.col(ColumnDef::new(ReadingSessionsV2::KoreaderProgress).text())
					.col(ColumnDef::new(ReadingSessionsV2::ElapsedSeconds).big_integer())
					.col(
						ColumnDef::new(ReadingSessionsV2::ReadthroughNumber)
							.integer()
							.not_null()
							.default(1),
					)
					.col(
						ColumnDef::new(ReadingSessionsV2::DidComplete)
							.boolean()
							.not_null()
							.default(false),
					)
					.col(ColumnDef::new(ReadingSessionsV2::DeviceIds).json())
					.col(ColumnDef::new(ReadingSessionsV2::MediaId).text().not_null())
					.col(ColumnDef::new(ReadingSessionsV2::UserId).text().not_null())
					.col(
						ColumnDef::new(ReadingSessionsV2::CreatedAt)
							.date_time()
							.not_null(),
					)
					.col(ColumnDef::new(ReadingSessionsV2::UpdatedAt).date_time())
					.foreign_key(
						ForeignKey::create()
							// TODO(v2-sessions): rm v2 postfix
							.name("fk-reading_sessions_v2-media")
							.from(ReadingSessionsV2::Table, ReadingSessionsV2::MediaId)
							.to(Media::Table, Media::Id)
							.on_delete(ForeignKeyAction::Cascade)
							.on_update(ForeignKeyAction::Cascade),
					)
					.foreign_key(
						ForeignKey::create()
							// TODO(v2-sessions): rm v2 postfix
							.name("fk-reading_sessions_v2-user")
							.from(ReadingSessionsV2::Table, ReadingSessionsV2::UserId)
							.to(Users::Table, Users::Id)
							.on_delete(ForeignKeyAction::Cascade)
							.on_update(ForeignKeyAction::Cascade),
					)
					.to_owned(),
			)
			.await?;

		manager
			.create_index(
				Index::create()
					// TODO(v2-sessions): rm v2 postfix
					.name("idx-reading_sessions_v2_user_date")
					.table(ReadingSessionsV2::Table)
					.col(ReadingSessionsV2::UserId)
					.col(ReadingSessionsV2::SessionDate)
					.to_owned(),
			)
			.await?;

		manager
			.create_index(
				Index::create()
					// TODO(v2-sessions): rm v2 postfix
					.name("idx-reading_sessions_v2_media")
					.table(ReadingSessionsV2::Table)
					.col(ReadingSessionsV2::MediaId)
					.to_owned(),
			)
			.await?;

		// the new preferences related to:
		// - enabling journaling features
		// - TODO(v2-sessions): maybe a separate one for goals/reminders/etc??
		// - offset preferences

		manager
			.alter_table(
				Table::alter()
					.table(UserPreferences::Table)
					.add_column(
						ColumnDef::new(UserPreferences::EnableReadingJournal)
							.boolean()
							.not_null()
							.default(false),
					)
					.to_owned(),
			)
			.await?;

		// TODO(v2-sessions): backfill logic for finished_reading_sessions + reading_sessions
		// since we have some conflicting index/fk names, with reading_sessions, might
		// be easier to:
		// (before create new table)
		// - get all finished_reading_sessions
		// - get all reading_sessions
		// - drop both tables
		// - create new table
		// - insert all sessions back in with appropriate mapping to new fields

		manager
			.alter_table(
				Table::alter()
					.table(UserPreferences::Table)
					.add_column(
						ColumnDef::new(UserPreferences::DayResetHourOffset)
							.integer()
							.not_null()
							.default(0), // midnight
					)
					.to_owned(),
			)
			.await?;

		manager
			.alter_table(
				Table::alter()
					.table(UserPreferences::Table)
					.add_column(
						ColumnDef::new(UserPreferences::ReadingSessionGracePeriodSecs)
							.big_integer()
							.not_null()
							.default(600),
					)
					.to_owned(),
			)
			.await?;

		Ok(())
	}

	async fn down(&self, manager: &SchemaManager) -> Result<(), DbErr> {
		// TODO(v2-sessions): drop postfix, add recreate old tables logic

		manager
			.drop_table(Table::drop().table(ReadingSessionsV2::Table).to_owned())
			.await?;

		manager
			.alter_table(
				Table::alter()
					.table(UserPreferences::Table)
					.drop_column(UserPreferences::EnableReadingJournal)
					.to_owned(),
			)
			.await?;

		manager
			.alter_table(
				Table::alter()
					.table(UserPreferences::Table)
					.drop_column(UserPreferences::DayResetHourOffset)
					.to_owned(),
			)
			.await?;

		manager
			.alter_table(
				Table::alter()
					.table(UserPreferences::Table)
					.drop_column(UserPreferences::ReadingSessionGracePeriodSecs)
					.to_owned(),
			)
			.await?;

		Ok(())
	}
}

// TODO(v2-sessions): rm v2 postfix for ident, leave for enum since i need to add old tables as enums too
#[derive(DeriveIden)]
enum ReadingSessionsV2 {
	Table,
	Id,
	SessionDate,
	Notes,
	Epubcfi,
	StartLocator,
	EndLocator,
	StartPage,
	EndPage,
	StartPercentage,
	EndPercentage,
	KoreaderProgress,
	ElapsedSeconds,
	ReadthroughNumber,
	DidComplete,
	DeviceIds,
	MediaId,
	UserId,
	CreatedAt,
	UpdatedAt,
}

#[derive(DeriveIden)]
enum UserPreferences {
	Table,
	EnableReadingJournal,
	DayResetHourOffset,
	ReadingSessionGracePeriodSecs,
}

#[derive(DeriveIden)]
enum Media {
	Table,
	Id,
}

#[derive(DeriveIden)]
enum Users {
	Table,
	Id,
}

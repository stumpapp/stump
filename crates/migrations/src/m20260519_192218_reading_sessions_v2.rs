use sea_orm::Statement;
use sea_orm_migration::prelude::*;

/// IMPORTANT: I have not added a refill(?) for the backfill (lol) when rolling back, so the rollback
/// has data loss
#[derive(DeriveMigrationName)]
pub struct Migration;

// "v2" reading sessions, unfied record that replaces both `reading_sessions` and `finished_reading_sessions`
// so that we can track true reading sessions (e.g., a single session of reading etc) to support other features
// like journaling, goals, etc

#[async_trait::async_trait]
impl MigrationTrait for Migration {
	async fn up(&self, manager: &SchemaManager) -> Result<(), DbErr> {
		let conn = manager.get_connection();
		let backend = conn.get_database_backend();

		conn.execute(Statement::from_string(
			backend,
			"ALTER TABLE reading_sessions RENAME TO reading_sessions_legacy".to_string(),
		))
		.await?;
		conn.execute(Statement::from_string(
			backend,
			"ALTER TABLE finished_reading_sessions RENAME TO finished_reading_sessions_legacy"
				.to_string(),
		))
		.await?;

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
						ColumnDef::new(ReadingSessionsV2::Status)
							.text()
							.not_null()
							.default("READING"),
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
							.name("fk-reading_sessions-media")
							.from(ReadingSessionsV2::Table, ReadingSessionsV2::MediaId)
							.to(Media::Table, Media::Id)
							.on_delete(ForeignKeyAction::Cascade)
							.on_update(ForeignKeyAction::Cascade),
					)
					.foreign_key(
						ForeignKey::create()
							.name("fk-reading_sessions-user")
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
					.name("idx-reading_sessions-session_date")
					.table(ReadingSessionsV2::Table)
					.col(ReadingSessionsV2::UserId)
					.col(ReadingSessionsV2::SessionDate)
					.to_owned(),
			)
			.await?;

		conn.execute(Statement::from_string(
			backend,
			r#"
				INSERT INTO reading_sessions (
					session_date,
					notes,
					epubcfi,
					start_locator,
					end_locator,
					start_page,
					end_page,
					start_percentage,
					end_percentage,
					koreader_progress,
					elapsed_seconds,
					readthrough_number,
					status,
					device_ids,
					media_id,
					user_id,
					created_at,
					updated_at
				)
				SELECT
					DATE(frs.completed_at) AS session_date,
					NULL AS notes,
					NULL AS epubcfi,
					NULL AS start_locator,
					NULL AS end_locator,
					NULL AS start_page,
					NULL AS end_page,
					0 AS start_percentage,
					1 AS end_percentage,
					NULL AS koreader_progress,
					frs.elapsed_seconds,
					ROW_NUMBER() OVER (
						PARTITION BY frs.user_id, frs.media_id
						ORDER BY frs.completed_at ASC, frs.started_at ASC, frs.id ASC
					) AS readthrough_number,
					'FINISHED' AS status,
					NULL AS device_ids,
					frs.media_id,
					frs.user_id,
					frs.started_at AS created_at,
					frs.completed_at AS updated_at
				FROM finished_reading_sessions_legacy frs;
			"#
			.to_string(),
		))
		.await?;

		conn.execute(Statement::from_string(
			backend,
			r#"
				INSERT INTO reading_sessions (
					session_date,
					notes,
					epubcfi,
					start_locator,
					end_locator,
					start_page,
					end_page,
					start_percentage,
					end_percentage,
					koreader_progress,
					elapsed_seconds,
					readthrough_number,
					status,
					device_ids,
					media_id,
					user_id,
					created_at,
					updated_at
				)
				SELECT
					DATE(COALESCE(rs.updated_at, rs.started_at)) AS session_date,
					NULL AS notes,
					rs.epubcfi,
					NULL AS start_locator,
					rs.locator AS end_locator,
					NULL AS start_page,
					rs.page AS end_page,
					0 AS start_percentage,
					rs.percentage_completed AS end_percentage,
					rs.koreader_progress,
					rs.elapsed_seconds,
					(COALESCE(f.finished_count, 0) + ROW_NUMBER() OVER (
						PARTITION BY rs.user_id, rs.media_id
						ORDER BY rs.started_at ASC, rs.id ASC
					)) AS readthrough_number,
					'READING' AS status,
					NULL AS device_ids,
					rs.media_id,
					rs.user_id,
					rs.started_at AS created_at,
					COALESCE(rs.updated_at, rs.started_at) AS updated_at
				FROM reading_sessions_legacy rs
				LEFT JOIN (
					SELECT
						user_id,
						media_id,
						COUNT(*) AS finished_count
					FROM finished_reading_sessions_legacy
					GROUP BY user_id, media_id
				) f
					ON f.user_id = rs.user_id
					AND f.media_id = rs.media_id;
			"#
			.to_string(),
		))
		.await?;

		manager
			.drop_table(Table::drop().table(ReadingSessionsLegacy::Table).to_owned())
			.await?;

		manager
			.drop_table(
				Table::drop()
					.table(FinishedReadingSessionsLegacy::Table)
					.to_owned(),
			)
			.await?;

		manager
			.create_index(
				Index::create()
					.name("idx-reading_sessions-media")
					.table(ReadingSessionsV2::Table)
					.col(ReadingSessionsV2::MediaId)
					.to_owned(),
			)
			.await?;

		// this is a pretty loaded index, but i need to do more testing for if it
		// helps with the inefficient subquery for keep_reading
		manager
			.create_index(
				Index::create()
					.name("idx-reading_sessions-user-media-recent")
					.table(ReadingSessionsV2::Table)
					.col(ReadingSessionsV2::UserId)
					.col(ReadingSessionsV2::MediaId)
					.col(ReadingSessionsV2::UpdatedAt)
					.col(ReadingSessionsV2::CreatedAt)
					.col(ReadingSessionsV2::Id)
					.to_owned(),
			)
			.await?;

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
							.default(1800), // 30 minutes
					)
					.to_owned(),
			)
			.await?;

		Ok(())
	}

	async fn down(&self, manager: &SchemaManager) -> Result<(), DbErr> {
		manager
			.drop_index(
				Index::drop()
					.name("idx-reading_sessions-user-media-recent")
					.table(ReadingSessionsV2::Table)
					.to_owned(),
			)
			.await?;

		manager
			.drop_table(Table::drop().table(ReadingSessionsV2::Table).to_owned())
			.await?;

		manager
			.create_table(
				Table::create()
					.table(ReadingSessionsV1::Table)
					.if_not_exists()
					.col(
						ColumnDef::new(ReadingSessionsV1::Id)
							.integer()
							.not_null()
							.auto_increment()
							.primary_key(),
					)
					.col(ColumnDef::new(ReadingSessionsV1::Page).integer())
					.col(ColumnDef::new(ReadingSessionsV1::PercentageCompleted).float())
					.col(ColumnDef::new(ReadingSessionsV1::Locator).json())
					.col(ColumnDef::new(ReadingSessionsV1::Epubcfi).text())
					.col(ColumnDef::new(ReadingSessionsV1::KoreaderProgress).text())
					.col(
						ColumnDef::new(ReadingSessionsV1::StartedAt)
							.date_time()
							.not_null(),
					)
					.col(ColumnDef::new(ReadingSessionsV1::UpdatedAt).date_time())
					.col(ColumnDef::new(ReadingSessionsV1::MediaId).text().not_null())
					.col(ColumnDef::new(ReadingSessionsV1::UserId).text().not_null())
					.col(ColumnDef::new(ReadingSessionsV1::DeviceId).text())
					.col(ColumnDef::new(ReadingSessionsV1::ElapsedSeconds).big_integer())
					.foreign_key(
						ForeignKey::create()
							.name("fk-reading_sessions-media")
							.from(ReadingSessionsV1::Table, ReadingSessionsV1::MediaId)
							.to(Media::Table, Media::Id)
							.on_delete(ForeignKeyAction::Cascade)
							.on_update(ForeignKeyAction::Cascade),
					)
					.foreign_key(
						ForeignKey::create()
							.name("fk-reading_sessions-device")
							.from(ReadingSessionsV1::Table, ReadingSessionsV1::DeviceId)
							.to(
								RegisteredReadingDevices::Table,
								RegisteredReadingDevices::Id,
							)
							.on_delete(ForeignKeyAction::Cascade)
							.on_update(ForeignKeyAction::Cascade),
					)
					.foreign_key(
						ForeignKey::create()
							.name("fk-reading_sessions-user")
							.from(ReadingSessionsV1::Table, ReadingSessionsV1::UserId)
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
					.unique()
					.name("reading_session_media_id_user_id_idx")
					.table(ReadingSessionsV1::Table)
					.col(ReadingSessionsV1::MediaId)
					.col(ReadingSessionsV1::UserId)
					.to_owned(),
			)
			.await?;

		manager
			.create_table(
				Table::create()
					.table(FinishedReadingSessionsV1::Table)
					.if_not_exists()
					.col(
						ColumnDef::new(FinishedReadingSessionsV1::Id)
							.integer()
							.not_null()
							.auto_increment()
							.primary_key(),
					)
					.col(
						ColumnDef::new(FinishedReadingSessionsV1::StartedAt)
							.date_time()
							.not_null(),
					)
					.col(
						ColumnDef::new(FinishedReadingSessionsV1::CompletedAt)
							.date_time()
							.not_null(),
					)
					.col(
						ColumnDef::new(FinishedReadingSessionsV1::MediaId)
							.text()
							.not_null(),
					)
					.col(
						ColumnDef::new(FinishedReadingSessionsV1::UserId)
							.text()
							.not_null(),
					)
					.col(ColumnDef::new(FinishedReadingSessionsV1::DeviceId).text())
					.col(
						ColumnDef::new(FinishedReadingSessionsV1::ElapsedSeconds)
							.big_integer(),
					)
					.foreign_key(
						ForeignKey::create()
							.name("fk-finished_reading_sessions-media")
							.from(
								FinishedReadingSessionsV1::Table,
								FinishedReadingSessionsV1::MediaId,
							)
							.to(Media::Table, Media::Id)
							.on_delete(ForeignKeyAction::Cascade)
							.on_update(ForeignKeyAction::Cascade),
					)
					.foreign_key(
						ForeignKey::create()
							.name("fk-finished_reading_sessions-device")
							.from(
								FinishedReadingSessionsV1::Table,
								FinishedReadingSessionsV1::DeviceId,
							)
							.to(
								RegisteredReadingDevices::Table,
								RegisteredReadingDevices::Id,
							)
							.on_delete(ForeignKeyAction::Cascade)
							.on_update(ForeignKeyAction::Cascade),
					)
					.foreign_key(
						ForeignKey::create()
							.name("fk-finished_reading_sessions-user")
							.from(
								FinishedReadingSessionsV1::Table,
								FinishedReadingSessionsV1::UserId,
							)
							.to(Users::Table, Users::Id)
							.on_delete(ForeignKeyAction::Cascade)
							.on_update(ForeignKeyAction::Cascade),
					)
					.to_owned(),
			)
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

#[derive(DeriveIden)]
enum ReadingSessionsV1 {
	#[sea_orm(iden = "reading_sessions")]
	Table,
	Id,
	Page,
	PercentageCompleted,
	Locator,
	Epubcfi,
	KoreaderProgress,
	StartedAt,
	UpdatedAt,
	MediaId,
	UserId,
	DeviceId,
	ElapsedSeconds,
}

#[derive(DeriveIden)]
enum FinishedReadingSessionsV1 {
	#[sea_orm(iden = "finished_reading_sessions")]
	Table,
	Id,
	StartedAt,
	CompletedAt,
	MediaId,
	UserId,
	DeviceId,
	ElapsedSeconds,
}

#[derive(DeriveIden)]
enum ReadingSessionsLegacy {
	#[sea_orm(iden = "reading_sessions_legacy")]
	Table,
}

#[derive(DeriveIden)]
enum FinishedReadingSessionsLegacy {
	#[sea_orm(iden = "finished_reading_sessions_legacy")]
	Table,
}

#[derive(DeriveIden)]
enum ReadingSessionsV2 {
	#[sea_orm(iden = "reading_sessions")]
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
	Status,
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
enum RegisteredReadingDevices {
	Table,
	Id,
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

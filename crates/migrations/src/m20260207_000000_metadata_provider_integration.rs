use sea_orm_migration::prelude::*;

#[derive(DeriveMigrationName)]
pub struct Migration;

#[async_trait::async_trait]
impl MigrationTrait for Migration {
	async fn up(&self, manager: &SchemaManager) -> Result<(), DbErr> {
		manager
			.create_table(
				Table::create()
					.table(MetadataProviderConfigs::Table)
					.if_not_exists()
					.col(
						ColumnDef::new(MetadataProviderConfigs::Id)
							.integer()
							.not_null()
							.auto_increment()
							.primary_key(),
					)
					.col(
						ColumnDef::new(MetadataProviderConfigs::ProviderType)
							.string()
							.not_null()
							.unique_key(),
					)
					.col(
						ColumnDef::new(MetadataProviderConfigs::Enabled)
							.boolean()
							.not_null()
							.default(false),
					)
					.col(
						ColumnDef::new(MetadataProviderConfigs::EncryptedApiToken).text(),
					)
					.col(
						ColumnDef::new(MetadataProviderConfigs::ApiTokenExpiresAt)
							.timestamp(),
					)
					.col(ColumnDef::new(MetadataProviderConfigs::AutoApplyConfig).json())
					.col(
						ColumnDef::new(MetadataProviderConfigs::CreatedAt)
							.timestamp()
							.not_null()
							.default(Expr::current_timestamp()),
					)
					.col(ColumnDef::new(MetadataProviderConfigs::UpdatedAt).timestamp())
					.to_owned(),
			)
			.await?;

		manager
			.create_table(
				Table::create()
					.table(MetadataFetchRecords::Table)
					.if_not_exists()
					.col(
						ColumnDef::new(MetadataFetchRecords::Id)
							.integer()
							.not_null()
							.auto_increment()
							.primary_key(),
					)
					.col(
						ColumnDef::new(MetadataFetchRecords::Status)
							.string()
							.not_null()
							.default("NOT_STARTED"),
					)
					.col(ColumnDef::new(MetadataFetchRecords::MediaId).string())
					.col(ColumnDef::new(MetadataFetchRecords::SeriesId).string())
					.col(ColumnDef::new(MetadataFetchRecords::MatchCandidates).json())
					.col(
						ColumnDef::new(MetadataFetchRecords::AcceptedMatchCandidate)
							.json(),
					)
					.col(
						ColumnDef::new(MetadataFetchRecords::AddedAt)
							.timestamp()
							.not_null()
							.default(Expr::current_timestamp()),
					)
					.col(ColumnDef::new(MetadataFetchRecords::UpdatedAt).timestamp())
					.foreign_key(
						ForeignKey::create()
							.name("fk_metadata_fetch_records_media_id")
							.from(
								MetadataFetchRecords::Table,
								MetadataFetchRecords::MediaId,
							)
							.to(Media::Table, Media::Id)
							.on_delete(ForeignKeyAction::Cascade)
							.on_update(ForeignKeyAction::Cascade),
					)
					.foreign_key(
						ForeignKey::create()
							.name("fk_metadata_fetch_records_series_id")
							.from(
								MetadataFetchRecords::Table,
								MetadataFetchRecords::SeriesId,
							)
							.to(Series::Table, Series::Id)
							.on_delete(ForeignKeyAction::Cascade)
							.on_update(ForeignKeyAction::Cascade),
					)
					.to_owned(),
			)
			.await?;

		// Add unique indexes to prevent duplicate entries per entity
		manager
			.create_index(
				Index::create()
					.name("idx_metadata_fetch_records_media_id")
					.table(MetadataFetchRecords::Table)
					.col(MetadataFetchRecords::MediaId)
					.unique()
					.to_owned(),
			)
			.await?;

		manager
			.create_index(
				Index::create()
					.name("idx_metadata_fetch_records_series_id")
					.table(MetadataFetchRecords::Table)
					.col(MetadataFetchRecords::SeriesId)
					.unique()
					.to_owned(),
			)
			.await?;

		// Add source tracking and locked_fields to series_metadata
		manager
			.alter_table(
				Table::alter()
					.table(SeriesMetadata::Table)
					.add_column(ColumnDef::new(SeriesMetadata::MetadataSource).text())
					.to_owned(),
			)
			.await?;

		manager
			.alter_table(
				Table::alter()
					.table(SeriesMetadata::Table)
					.add_column(ColumnDef::new(SeriesMetadata::MetadataExternalId).text())
					.to_owned(),
			)
			.await?;

		manager
			.alter_table(
				Table::alter()
					.table(SeriesMetadata::Table)
					.add_column(ColumnDef::new(SeriesMetadata::LockedFields).json())
					.to_owned(),
			)
			.await?;

		// Add source tracking and locked_fields to media_metadata
		manager
			.alter_table(
				Table::alter()
					.table(MediaMetadata::Table)
					.add_column(ColumnDef::new(MediaMetadata::MetadataSource).text())
					.to_owned(),
			)
			.await?;

		manager
			.alter_table(
				Table::alter()
					.table(MediaMetadata::Table)
					.add_column(ColumnDef::new(MediaMetadata::MetadataExternalId).text())
					.to_owned(),
			)
			.await?;

		manager
			.alter_table(
				Table::alter()
					.table(MediaMetadata::Table)
					.add_column(ColumnDef::new(MediaMetadata::LockedFields).json())
					.to_owned(),
			)
			.await?;

		Ok(())
	}

	async fn down(&self, manager: &SchemaManager) -> Result<(), DbErr> {
		// Drop locked_fields, metadata_external_id, metadata_source from media_metadata
		manager
			.alter_table(
				Table::alter()
					.table(MediaMetadata::Table)
					.drop_column(MediaMetadata::LockedFields)
					.to_owned(),
			)
			.await?;

		manager
			.alter_table(
				Table::alter()
					.table(MediaMetadata::Table)
					.drop_column(MediaMetadata::MetadataExternalId)
					.to_owned(),
			)
			.await?;

		manager
			.alter_table(
				Table::alter()
					.table(MediaMetadata::Table)
					.drop_column(MediaMetadata::MetadataSource)
					.to_owned(),
			)
			.await?;

		// Drop locked_fields, metadata_external_id, metadata_source from series_metadata
		manager
			.alter_table(
				Table::alter()
					.table(SeriesMetadata::Table)
					.drop_column(SeriesMetadata::LockedFields)
					.to_owned(),
			)
			.await?;

		manager
			.alter_table(
				Table::alter()
					.table(SeriesMetadata::Table)
					.drop_column(SeriesMetadata::MetadataExternalId)
					.to_owned(),
			)
			.await?;

		manager
			.alter_table(
				Table::alter()
					.table(SeriesMetadata::Table)
					.drop_column(SeriesMetadata::MetadataSource)
					.to_owned(),
			)
			.await?;

		// Drop metadata_fetch_records table
		manager
			.drop_table(Table::drop().table(MetadataFetchRecords::Table).to_owned())
			.await?;

		// Drop metadata_provider_configs table
		manager
			.drop_table(
				Table::drop()
					.table(MetadataProviderConfigs::Table)
					.to_owned(),
			)
			.await?;

		Ok(())
	}
}

#[derive(DeriveIden)]
enum MetadataProviderConfigs {
	#[sea_orm(iden = "metadata_provider_configs")]
	Table,
	Id,
	ProviderType,
	Enabled,
	EncryptedApiToken,
	ApiTokenExpiresAt,
	AutoApplyConfig,
	CreatedAt,
	UpdatedAt,
}

#[derive(DeriveIden)]
enum MetadataFetchRecords {
	#[sea_orm(iden = "metadata_fetch_records")]
	Table,
	Id,
	Status,
	MediaId,
	SeriesId,
	MatchCandidates,
	AcceptedMatchCandidate,
	AddedAt,
	UpdatedAt,
}

#[derive(DeriveIden)]
enum SeriesMetadata {
	#[sea_orm(iden = "series_metadata")]
	Table,
	MetadataSource,
	MetadataExternalId,
	LockedFields,
}

#[derive(DeriveIden)]
enum MediaMetadata {
	#[sea_orm(iden = "media_metadata")]
	Table,
	MetadataSource,
	MetadataExternalId,
	LockedFields,
}

#[derive(DeriveIden)]
enum Media {
	#[sea_orm(iden = "media")]
	Table,
	Id,
}

#[derive(DeriveIden)]
enum Series {
	#[sea_orm(iden = "series")]
	Table,
	Id,
}

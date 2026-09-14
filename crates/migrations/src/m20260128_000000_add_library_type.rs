use sea_orm_migration::prelude::*;

#[derive(DeriveMigrationName)]
pub struct Migration;

#[async_trait::async_trait]
impl MigrationTrait for Migration {
	async fn up(&self, manager: &SchemaManager) -> Result<(), DbErr> {
		manager
			.alter_table(
				Table::alter()
					.table(LibraryConfigs::Table)
					.add_column(
						ColumnDef::new(LibraryConfigs::LibraryType)
							.text()
							.not_null()
							.default("MIXED"),
					)
					.to_owned(),
			)
			.await?;

		manager
			.create_index(
				Index::create()
					.name("series_library_id_idx")
					.table(Series::Table)
					.col(Series::LibraryId)
					.to_owned(),
			)
			.await?;

		manager
			.create_index(
				Index::create()
					.name("media_series_id_idx")
					.table(Media::Table)
					.col(Media::SeriesId)
					.to_owned(),
			)
			.await?;

		manager
			.create_index(
				Index::create()
					.name("media_metadata_writers_idx")
					.table(MediaMetadata::Table)
					.col(MediaMetadata::Writers)
					.to_owned(),
			)
			.await?;

		Ok(())
	}

	async fn down(&self, manager: &SchemaManager) -> Result<(), DbErr> {
		manager
			.drop_index(
				Index::drop()
					.name("media_metadata_writers_idx")
					.table(MediaMetadata::Table)
					.to_owned(),
			)
			.await?;

		manager
			.drop_index(
				Index::drop()
					.name("media_series_id_idx")
					.table(Media::Table)
					.to_owned(),
			)
			.await?;

		manager
			.drop_index(
				Index::drop()
					.name("series_library_id_idx")
					.table(Series::Table)
					.to_owned(),
			)
			.await?;

		manager
			.alter_table(
				Table::alter()
					.table(LibraryConfigs::Table)
					.drop_column(LibraryConfigs::LibraryType)
					.to_owned(),
			)
			.await?;

		Ok(())
	}
}

#[derive(DeriveIden)]
enum LibraryConfigs {
	Table,
	LibraryType,
}

#[derive(DeriveIden)]
enum Series {
	Table,
	LibraryId,
}

#[derive(DeriveIden)]
enum Media {
	Table,
	SeriesId,
}

#[derive(DeriveIden)]
enum MediaMetadata {
	Table,
	Writers,
}

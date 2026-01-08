use sea_orm_migration::prelude::*;

#[derive(DeriveMigrationName)]
pub struct Migration;

#[async_trait::async_trait]
impl MigrationTrait for Migration {
	async fn up(&self, manager: &SchemaManager) -> Result<(), DbErr> {
		// Add collects column (JSON)
		manager
			.alter_table(
				Table::alter()
					.table(SeriesMetadata::Table)
					.add_column(ColumnDef::new(SeriesMetadata::Collects).json())
					.to_owned(),
			)
			.await?;

		// Add comic_image column
		manager
			.alter_table(
				Table::alter()
					.table(SeriesMetadata::Table)
					.add_column(ColumnDef::new(SeriesMetadata::ComicImage).text())
					.to_owned(),
			)
			.await?;

		// Add description_formatted column
		manager
			.alter_table(
				Table::alter()
					.table(SeriesMetadata::Table)
					.add_column(
						ColumnDef::new(SeriesMetadata::DescriptionFormatted).text(),
					)
					.to_owned(),
			)
			.await?;

		// Add publication_run column
		manager
			.alter_table(
				Table::alter()
					.table(SeriesMetadata::Table)
					.add_column(ColumnDef::new(SeriesMetadata::PublicationRun).text())
					.to_owned(),
			)
			.await?;

		// Add total_issues column
		manager
			.alter_table(
				Table::alter()
					.table(SeriesMetadata::Table)
					.add_column(ColumnDef::new(SeriesMetadata::TotalIssues).integer())
					.to_owned(),
			)
			.await?;

		// Add year column
		manager
			.alter_table(
				Table::alter()
					.table(SeriesMetadata::Table)
					.add_column(ColumnDef::new(SeriesMetadata::Year).integer())
					.to_owned(),
			)
			.await?;

		Ok(())
	}

	async fn down(&self, manager: &SchemaManager) -> Result<(), DbErr> {
		// Drop year column
		manager
			.alter_table(
				Table::alter()
					.table(SeriesMetadata::Table)
					.drop_column(SeriesMetadata::Year)
					.to_owned(),
			)
			.await?;

		// Drop total_issues column
		manager
			.alter_table(
				Table::alter()
					.table(SeriesMetadata::Table)
					.drop_column(SeriesMetadata::TotalIssues)
					.to_owned(),
			)
			.await?;

		// Drop publication_run column
		manager
			.alter_table(
				Table::alter()
					.table(SeriesMetadata::Table)
					.drop_column(SeriesMetadata::PublicationRun)
					.to_owned(),
			)
			.await?;

		// Drop description_formatted column
		manager
			.alter_table(
				Table::alter()
					.table(SeriesMetadata::Table)
					.drop_column(SeriesMetadata::DescriptionFormatted)
					.to_owned(),
			)
			.await?;

		// Drop comic_image column
		manager
			.alter_table(
				Table::alter()
					.table(SeriesMetadata::Table)
					.drop_column(SeriesMetadata::ComicImage)
					.to_owned(),
			)
			.await?;

		// Drop collects column
		manager
			.alter_table(
				Table::alter()
					.table(SeriesMetadata::Table)
					.drop_column(SeriesMetadata::Collects)
					.to_owned(),
			)
			.await?;

		Ok(())
	}
}

#[derive(DeriveIden)]
enum SeriesMetadata {
	#[sea_orm(iden = "series_metadata")]
	Table,
	Collects,
	ComicImage,
	DescriptionFormatted,
	PublicationRun,
	TotalIssues,
	Year,
}

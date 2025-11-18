use sea_orm_migration::prelude::*;

#[derive(DeriveMigrationName)]
pub struct Migration;

#[async_trait::async_trait]
impl MigrationTrait for Migration {
	async fn up(&self, manager: &SchemaManager) -> Result<(), DbErr> {
		manager
			.alter_table(
				Table::alter()
					.table(Media::Table)
					.add_column_if_not_exists(
						ColumnDef::new(Media::ThumbnailPath).text().null(),
					)
					.to_owned(),
			)
			.await?;

		manager
			.alter_table(
				Table::alter()
					.table(Media::Table)
					.add_column_if_not_exists(
						ColumnDef::new(Media::ThumbnailMeta).json().null(),
					)
					.to_owned(),
			)
			.await?;

		manager
			.alter_table(
				Table::alter()
					.table(Series::Table)
					.add_column_if_not_exists(
						ColumnDef::new(Series::ThumbnailPath).text().null(),
					)
					.to_owned(),
			)
			.await?;

		manager
			.alter_table(
				Table::alter()
					.table(Series::Table)
					.add_column_if_not_exists(
						ColumnDef::new(Series::ThumbnailMeta).json().null(),
					)
					.to_owned(),
			)
			.await?;

		manager
			.alter_table(
				Table::alter()
					.table(Library::Table)
					.add_column_if_not_exists(
						ColumnDef::new(Library::ThumbnailPath).text().null(),
					)
					.to_owned(),
			)
			.await?;

		manager
			.alter_table(
				Table::alter()
					.table(Library::Table)
					.add_column_if_not_exists(
						ColumnDef::new(Library::ThumbnailMeta).json().null(),
					)
					.to_owned(),
			)
			.await?;

		Ok(())
	}

	async fn down(&self, manager: &SchemaManager) -> Result<(), DbErr> {
		manager
			.alter_table(
				Table::alter()
					.table(Media::Table)
					.drop_column(Media::ThumbnailPath)
					.drop_column(Media::ThumbnailMeta)
					.to_owned(),
			)
			.await?;

		manager
			.alter_table(
				Table::alter()
					.table(Series::Table)
					.drop_column(Series::ThumbnailPath)
					.drop_column(Series::ThumbnailMeta)
					.to_owned(),
			)
			.await?;

		manager
			.alter_table(
				Table::alter()
					.table(Library::Table)
					.drop_column(Library::ThumbnailPath)
					.drop_column(Library::ThumbnailMeta)
					.to_owned(),
			)
			.await?;

		Ok(())
	}
}

#[derive(DeriveIden)]
enum Media {
	Table,
	ThumbnailPath,
	ThumbnailMeta,
}

#[derive(DeriveIden)]
enum Series {
	Table,
	ThumbnailPath,
	ThumbnailMeta,
}

#[derive(DeriveIden)]
enum Library {
	#[sea_orm(iden = "libraries")]
	Table,
	ThumbnailPath,
	ThumbnailMeta,
}

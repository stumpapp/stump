use sea_orm_migration::prelude::*;

#[derive(DeriveMigrationName)]
pub struct Migration;

#[async_trait::async_trait]
impl MigrationTrait for Migration {
	async fn up(&self, manager: &SchemaManager) -> Result<(), DbErr> {
		// Drop the old page_analysis table
		manager
			.drop_table(
				Table::drop()
					.table(PageAnalysis::Table)
					.if_exists()
					.to_owned(),
			)
			.await?;

		// Create the new media_analysis table
		manager
			.create_table(
				Table::create()
					.table(MediaAnalysis::Table)
					.if_not_exists()
					.col(
						ColumnDef::new(MediaAnalysis::Id)
							.integer()
							.not_null()
							.auto_increment()
							.primary_key(),
					)
					.col(ColumnDef::new(MediaAnalysis::Data).json().not_null())
					.col(
						ColumnDef::new(MediaAnalysis::MediaId)
							.text()
							.not_null()
							.unique_key(),
					)
					.foreign_key(
						ForeignKey::create()
							.name("fk-media_analysis-media")
							.from(MediaAnalysis::Table, MediaAnalysis::MediaId)
							.to(Media::Table, Media::Id)
							.on_delete(ForeignKeyAction::Cascade)
							.on_update(ForeignKeyAction::Cascade),
					)
					.to_owned(),
			)
			.await?;

		Ok(())
	}

	async fn down(&self, manager: &SchemaManager) -> Result<(), DbErr> {
		// Drop the new media_analysis table
		manager
			.drop_table(Table::drop().table(MediaAnalysis::Table).to_owned())
			.await?;

		// Recreate the old page_analysis table
		manager
			.create_table(
				Table::create()
					.table(PageAnalysis::Table)
					.if_not_exists()
					.col(
						ColumnDef::new(PageAnalysis::Id)
							.integer()
							.not_null()
							.auto_increment()
							.primary_key(),
					)
					.col(ColumnDef::new(PageAnalysis::Data).json().not_null())
					.col(
						ColumnDef::new(PageAnalysis::MediaId)
							.text()
							.not_null()
							.unique_key(),
					)
					.foreign_key(
						ForeignKey::create()
							.name("fk-page_analysis-media")
							.from(PageAnalysis::Table, PageAnalysis::MediaId)
							.to(Media::Table, Media::Id)
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
enum MediaAnalysis {
	Table,
	Id,
	Data,
	MediaId,
}

#[derive(DeriveIden)]
enum PageAnalysis {
	Table,
	Id,
	Data,
	MediaId,
}

#[derive(DeriveIden)]
enum Media {
	Table,
	Id,
}

use sea_orm_migration::prelude::*;

#[derive(DeriveMigrationName)]
pub struct Migration;

#[async_trait::async_trait]
impl MigrationTrait for Migration {
	async fn up(&self, manager: &SchemaManager) -> Result<(), DbErr> {
		// Add format column
		manager
			.alter_table(
				Table::alter()
					.table(MediaMetadata::Table)
					.add_column(ColumnDef::new(MediaMetadata::Format).text())
					.to_owned(),
			)
			.await?;

		// Add series_group column
		manager
			.alter_table(
				Table::alter()
					.table(MediaMetadata::Table)
					.add_column(ColumnDef::new(MediaMetadata::SeriesGroup).text())
					.to_owned(),
			)
			.await?;

		// Add story_arc column
		manager
			.alter_table(
				Table::alter()
					.table(MediaMetadata::Table)
					.add_column(ColumnDef::new(MediaMetadata::StoryArc).text())
					.to_owned(),
			)
			.await?;

		// Add story_arc_number column
		manager
			.alter_table(
				Table::alter()
					.table(MediaMetadata::Table)
					.add_column(ColumnDef::new(MediaMetadata::StoryArcNumber).float())
					.to_owned(),
			)
			.await?;

		Ok(())
	}

	async fn down(&self, manager: &SchemaManager) -> Result<(), DbErr> {
		// Drop story_arc_number column
		manager
			.alter_table(
				Table::alter()
					.table(MediaMetadata::Table)
					.drop_column(MediaMetadata::StoryArcNumber)
					.to_owned(),
			)
			.await?;

		// Drop story_arc column
		manager
			.alter_table(
				Table::alter()
					.table(MediaMetadata::Table)
					.drop_column(MediaMetadata::StoryArc)
					.to_owned(),
			)
			.await?;

		// Drop series_group column
		manager
			.alter_table(
				Table::alter()
					.table(MediaMetadata::Table)
					.drop_column(MediaMetadata::SeriesGroup)
					.to_owned(),
			)
			.await?;

		// Drop format column
		manager
			.alter_table(
				Table::alter()
					.table(MediaMetadata::Table)
					.drop_column(MediaMetadata::Format)
					.to_owned(),
			)
			.await?;

		Ok(())
	}
}

#[derive(DeriveIden)]
enum MediaMetadata {
	Table,
	Format,
	SeriesGroup,
	StoryArc,
	StoryArcNumber,
}

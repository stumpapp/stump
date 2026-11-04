use sea_orm_migration::{prelude::*, schema::*};

#[derive(DeriveMigrationName)]
pub struct Migration;

#[async_trait::async_trait]
impl MigrationTrait for Migration {
	async fn up(&self, manager: &SchemaManager) -> Result<(), DbErr> {
		manager
			.create_table(
				Table::create()
					.table(Authors::Table)
					.if_not_exists()
					.col(string(Authors::Id).not_null().primary_key())
					.col(string(Authors::Name))
					.col(string_uniq(Authors::NormalizedName))
					.col(string_null(Authors::SortName))
					.col(text_null(Authors::Biography))
					.col(string_null(Authors::PhotoPath))
					.col(json_null(Authors::PhotoMeta))
					.col(string_null(Authors::HardcoverId))
					.col(string_null(Authors::OpenlibraryId))
					.col(timestamp_with_time_zone_default_now(Authors::CreatedAt))
					.col(timestamp_with_time_zone_default_now(Authors::UpdatedAt))
					.to_owned(),
			)
			.await?;

		// TODO(authors): consider adding an author_alias table so during scan small
		// differences can be merged to a single record (e.g., `Wells, Martha` = `Martha Wells`)

		manager
			.create_table(
				Table::create()
					.table(MediaAuthors::Table)
					.if_not_exists()
					.col(pk_auto(MediaAuthors::Id))
					.col(string(MediaAuthors::MediaId))
					.col(string(MediaAuthors::AuthorId))
					.col(string(MediaAuthors::Role))
					.col(timestamp_with_time_zone_default_now(
						MediaAuthors::CreatedAt,
					))
					.foreign_key(
						ForeignKey::create()
							.name("fk-media_authors-media")
							.from(MediaAuthors::Table, MediaAuthors::MediaId)
							.to(Media::Table, Media::Id)
							.on_delete(ForeignKeyAction::Cascade)
							.on_update(ForeignKeyAction::Cascade),
					)
					.foreign_key(
						ForeignKey::create()
							.name("fk-media_authors-author")
							.from(MediaAuthors::Table, MediaAuthors::AuthorId)
							.to(Authors::Table, Authors::Id)
							.on_delete(ForeignKeyAction::Cascade)
							.on_update(ForeignKeyAction::Cascade),
					)
					.to_owned(),
			)
			.await?;

		manager
			.create_table(
				Table::create()
					.table(SeriesAuthors::Table)
					.if_not_exists()
					.col(pk_auto(SeriesAuthors::Id))
					.col(string(SeriesAuthors::SeriesId))
					.col(string(SeriesAuthors::AuthorId))
					.col(string(SeriesAuthors::Role))
					.col(timestamp_with_time_zone_default_now(
						SeriesAuthors::CreatedAt,
					))
					.foreign_key(
						ForeignKey::create()
							.name("fk-series_authors-series")
							.from(SeriesAuthors::Table, SeriesAuthors::SeriesId)
							.to(Series::Table, Series::Id)
							.on_delete(ForeignKeyAction::Cascade)
							.on_update(ForeignKeyAction::Cascade),
					)
					.foreign_key(
						ForeignKey::create()
							.name("fk-series_authors-author")
							.from(SeriesAuthors::Table, SeriesAuthors::AuthorId)
							.to(Authors::Table, Authors::Id)
							.on_delete(ForeignKeyAction::Cascade)
							.on_update(ForeignKeyAction::Cascade),
					)
					.to_owned(),
			)
			.await?;

		manager
			.create_index(
				Index::create()
					.name("idx-authors-sort_name")
					.table(Authors::Table)
					.col(Authors::SortName)
					.to_owned(),
			)
			.await?;

		manager
			.create_index(
				Index::create()
					.unique()
					.name("idx-media_authors-media-author")
					.table(MediaAuthors::Table)
					.col(MediaAuthors::MediaId)
					.col(MediaAuthors::AuthorId)
					.to_owned(),
			)
			.await?;
		manager
			.create_index(
				Index::create()
					.name("idx-media_authors-author")
					.table(MediaAuthors::Table)
					.col(MediaAuthors::AuthorId)
					.to_owned(),
			)
			.await?;

		manager
			.create_index(
				Index::create()
					.unique()
					.name("idx-series_authors-series-author")
					.table(SeriesAuthors::Table)
					.col(SeriesAuthors::SeriesId)
					.col(SeriesAuthors::AuthorId)
					.to_owned(),
			)
			.await?;
		manager
			.create_index(
				Index::create()
					.name("idx-series_authors-author")
					.table(SeriesAuthors::Table)
					.col(SeriesAuthors::AuthorId)
					.to_owned(),
			)
			.await?;

		Ok(())
	}

	async fn down(&self, manager: &SchemaManager) -> Result<(), DbErr> {
		manager
			.drop_table(
				Table::drop()
					.table(SeriesAuthors::Table)
					.if_exists()
					.to_owned(),
			)
			.await?;
		manager
			.drop_table(
				Table::drop()
					.table(MediaAuthors::Table)
					.if_exists()
					.to_owned(),
			)
			.await?;
		manager
			.drop_table(Table::drop().table(Authors::Table).if_exists().to_owned())
			.await?;

		Ok(())
	}
}

#[derive(DeriveIden)]
enum Authors {
	Table,
	Id,
	Name,
	NormalizedName,
	SortName,
	Biography,
	PhotoPath,
	PhotoMeta,
	HardcoverId,
	OpenlibraryId,
	CreatedAt,
	UpdatedAt,
}

#[derive(DeriveIden)]
enum Media {
	Table,
	Id,
}

#[derive(DeriveIden)]
enum Series {
	Table,
	Id,
}

#[derive(DeriveIden)]
enum MediaAuthors {
	Table,
	Id,
	MediaId,
	AuthorId,
	Role,
	CreatedAt,
}

#[derive(DeriveIden)]
enum SeriesAuthors {
	Table,
	Id,
	SeriesId,
	AuthorId,
	Role,
	CreatedAt,
}

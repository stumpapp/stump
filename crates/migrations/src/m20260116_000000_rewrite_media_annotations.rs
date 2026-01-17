use sea_orm_migration::prelude::*;

#[derive(DeriveMigrationName)]
pub struct Migration;

#[async_trait::async_trait]
impl MigrationTrait for Migration {
	async fn up(&self, manager: &SchemaManager) -> Result<(), DbErr> {
		manager
			.drop_table(Table::drop().table(OldMediaAnnotations::Table).to_owned())
			.await?;

		manager
			.create_table(
				Table::create()
					.table(MediaAnnotations::Table)
					.if_not_exists()
					.col(
						ColumnDef::new(MediaAnnotations::Id)
							.string()
							.not_null()
							.primary_key(),
					)
					.col(ColumnDef::new(MediaAnnotations::Locator).json().not_null())
					.col(ColumnDef::new(MediaAnnotations::AnnotationText).string())
					.col(
						ColumnDef::new(MediaAnnotations::MediaId)
							.string()
							.not_null(),
					)
					.col(ColumnDef::new(MediaAnnotations::UserId).string().not_null())
					.col(
						ColumnDef::new(MediaAnnotations::CreatedAt)
							.timestamp()
							.not_null()
							.default(Expr::current_timestamp()),
					)
					.col(
						ColumnDef::new(MediaAnnotations::UpdatedAt)
							.timestamp()
							.not_null()
							.default(Expr::current_timestamp()),
					)
					.foreign_key(
						ForeignKey::create()
							.name("fk_media_annotations_media_id")
							.from(MediaAnnotations::Table, MediaAnnotations::MediaId)
							.to(Media::Table, Media::Id)
							.on_delete(ForeignKeyAction::Cascade)
							.on_update(ForeignKeyAction::Cascade),
					)
					.foreign_key(
						ForeignKey::create()
							.name("fk_media_annotations_user_id")
							.from(MediaAnnotations::Table, MediaAnnotations::UserId)
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
					.name("idx_media_annotations_user_media")
					.table(MediaAnnotations::Table)
					.col(MediaAnnotations::UserId)
					.col(MediaAnnotations::MediaId)
					.to_owned(),
			)
			.await?;

		Ok(())
	}

	async fn down(&self, manager: &SchemaManager) -> Result<(), DbErr> {
		manager
			.drop_table(Table::drop().table(MediaAnnotations::Table).to_owned())
			.await?;

		manager
			.create_table(
				Table::create()
					.table(OldMediaAnnotations::Table)
					.if_not_exists()
					.col(
						ColumnDef::new(OldMediaAnnotations::Id)
							.string()
							.not_null()
							.primary_key(),
					)
					.col(ColumnDef::new(OldMediaAnnotations::HighlightedText).string())
					.col(ColumnDef::new(OldMediaAnnotations::Epubcfi).string())
					.col(ColumnDef::new(OldMediaAnnotations::Page).integer())
					.col(ColumnDef::new(OldMediaAnnotations::PageCoordinatesX).decimal())
					.col(ColumnDef::new(OldMediaAnnotations::PageCoordinatesY).decimal())
					.col(ColumnDef::new(OldMediaAnnotations::Notes).string())
					.col(
						ColumnDef::new(OldMediaAnnotations::UserId)
							.string()
							.not_null(),
					)
					.col(
						ColumnDef::new(OldMediaAnnotations::MediaId)
							.string()
							.not_null(),
					)
					.foreign_key(
						ForeignKey::create()
							.name("fk_media_annotations_media_id")
							.from(
								OldMediaAnnotations::Table,
								OldMediaAnnotations::MediaId,
							)
							.to(Media::Table, Media::Id)
							.on_delete(ForeignKeyAction::Cascade)
							.on_update(ForeignKeyAction::Cascade),
					)
					.foreign_key(
						ForeignKey::create()
							.name("fk_media_annotations_user_id")
							.from(OldMediaAnnotations::Table, OldMediaAnnotations::UserId)
							.to(Users::Table, Users::Id)
							.on_delete(ForeignKeyAction::Cascade)
							.on_update(ForeignKeyAction::Cascade),
					)
					.to_owned(),
			)
			.await?;

		Ok(())
	}
}

#[derive(Iden)]
enum MediaAnnotations {
	Table,
	Id,
	Locator,
	AnnotationText,
	MediaId,
	UserId,
	CreatedAt,
	UpdatedAt,
}

#[derive(Iden)]
#[iden = "media_annotations"]
enum OldMediaAnnotations {
	Table,
	Id,
	HighlightedText,
	Epubcfi,
	Page,
	PageCoordinatesX,
	PageCoordinatesY,
	Notes,
	UserId,
	MediaId,
}

#[derive(Iden)]
enum Media {
	Table,
	Id,
}

#[derive(Iden)]
enum Users {
	Table,
	Id,
}

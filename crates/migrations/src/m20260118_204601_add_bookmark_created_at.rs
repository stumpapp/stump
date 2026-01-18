use sea_orm_migration::prelude::*;

#[derive(DeriveMigrationName)]
pub struct Migration;

#[async_trait::async_trait]
impl MigrationTrait for Migration {
	async fn up(&self, manager: &SchemaManager) -> Result<(), DbErr> {
		manager
			.drop_table(Table::drop().table(OldBookmarks::Table).to_owned())
			.await?;

		manager
			.create_table(
				Table::create()
					.table(Bookmarks::Table)
					.if_not_exists()
					.col(
						ColumnDef::new(Bookmarks::Id)
							.text()
							.not_null()
							.primary_key(),
					)
					.col(ColumnDef::new(Bookmarks::PreviewContent).text())
					.col(ColumnDef::new(Bookmarks::Locator).json())
					.col(ColumnDef::new(Bookmarks::Epubcfi).text())
					.col(ColumnDef::new(Bookmarks::Page).integer())
					.col(ColumnDef::new(Bookmarks::MediaId).text().not_null())
					.col(ColumnDef::new(Bookmarks::UserId).text().not_null())
					.col(
						ColumnDef::new(Bookmarks::CreatedAt)
							.timestamp()
							.not_null()
							.default(Expr::current_timestamp()),
					)
					.foreign_key(
						ForeignKey::create()
							.name("fk-bookmarks-media")
							.from(Bookmarks::Table, Bookmarks::MediaId)
							.to(Media::Table, Media::Id)
							.on_delete(ForeignKeyAction::Cascade)
							.on_update(ForeignKeyAction::Cascade),
					)
					.foreign_key(
						ForeignKey::create()
							.name("fk-bookmarks-user")
							.from(Bookmarks::Table, Bookmarks::UserId)
							.to(Users::Table, Users::Id)
							.on_delete(ForeignKeyAction::Cascade)
							.on_update(ForeignKeyAction::Cascade),
					)
					.to_owned(),
			)
			.await?;

		Ok(())
	}

	async fn down(&self, manager: &SchemaManager) -> Result<(), DbErr> {
		manager
			.drop_table(Table::drop().table(Bookmarks::Table).to_owned())
			.await?;

		manager
			.create_table(
				Table::create()
					.table(OldBookmarks::Table)
					.if_not_exists()
					.col(
						ColumnDef::new(OldBookmarks::Id)
							.text()
							.not_null()
							.primary_key(),
					)
					.col(ColumnDef::new(OldBookmarks::PreviewContent).text())
					.col(ColumnDef::new(OldBookmarks::Locator).json())
					.col(ColumnDef::new(OldBookmarks::Epubcfi).text())
					.col(ColumnDef::new(OldBookmarks::Page).integer())
					.col(ColumnDef::new(OldBookmarks::MediaId).text().not_null())
					.col(ColumnDef::new(OldBookmarks::UserId).text().not_null())
					.foreign_key(
						ForeignKey::create()
							.name("fk-bookmarks-media")
							.from(OldBookmarks::Table, OldBookmarks::MediaId)
							.to(Media::Table, Media::Id)
							.on_delete(ForeignKeyAction::Cascade)
							.on_update(ForeignKeyAction::Cascade),
					)
					.foreign_key(
						ForeignKey::create()
							.name("fk-bookmarks-user")
							.from(OldBookmarks::Table, OldBookmarks::UserId)
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
enum Bookmarks {
	Table,
	Id,
	PreviewContent,
	Locator,
	Epubcfi,
	Page,
	MediaId,
	UserId,
	CreatedAt,
}

#[derive(Iden)]
#[iden = "bookmarks"]
enum OldBookmarks {
	Table,
	Id,
	PreviewContent,
	Locator,
	Epubcfi,
	Page,
	MediaId,
	UserId,
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
